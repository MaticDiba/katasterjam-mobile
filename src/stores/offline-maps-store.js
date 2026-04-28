import { defineStore } from 'pinia'
import {
  requestGeneration,
  getMyPackages,
  getRegistry,
  downloadLayer,
  localMBTilesExists,
  deleteLocalMBTiles,
  deletePackage
} from 'src/services/offline-maps-service'
import { createNativeMBTilesSource, disposeMBTilesDB } from 'src/utils/mbtiles-source'
import { createVectorMBTilesSource } from 'src/utils/vector-mbtiles-source'
import { openNativeDatabase } from 'src/services/native-sqlite-service'
import { db } from 'src/db/db'

export const sourceKey = (packageId, layerType) => `${packageId}_${layerType}`

const SOURCE_OWN = 'own'
const SOURCE_LIBRARY = 'library'

// In-flight downloads keyed by sourceKey: { controller, promise }. Kept
// outside Pinia state so Vue reactivity does not wrap non-plain objects.
const inFlightDownloads = new Map()

function toDexieRow (pkg, source) {
  return JSON.parse(JSON.stringify({
    id: pkg.id,
    name: pkg.name,
    layers: pkg.layers || [],
    bbox: pkg.bbox,
    minLon: pkg.minLon,
    minLat: pkg.minLat,
    maxLon: pkg.maxLon,
    maxLat: pkg.maxLat,
    minZoom: pkg.minZoom,
    maxZoom: pkg.maxZoom,
    status: pkg.status,
    errorMessage: pkg.errorMessage,
    isAuthor: pkg.isAuthor,
    source,
    createdAt: pkg.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))
}

export const useOfflineMapsStore = defineStore('offline-maps', {
  state: () => ({
    myTiles: [],
    registryPackages: [],
    downloadProgress: {},
    downloadAttempt: {},
    activeSources: {},
    localLayersLoaded: false,
    myTilesLoaded: false,
    isRegistryOffline: false
  }),

  getters: {
    readyPackages (state) {
      return state.myTiles.filter(p => p.status === 'Ready')
    },
    pendingPackages (state) {
      return state.myTiles.filter(p => p.status === 'Pending' || p.status === 'Generating')
    },
    activeSourcesSnapshot (state) {
      const snapshot = {}
      for (const [key, val] of Object.entries(state.activeSources)) {
        snapshot[key] = val?.visible ?? true
      }
      return JSON.stringify(snapshot)
    }
  },

  actions: {
    async loadMyTiles () {
      try {
        const rows = await db.myPackages.toArray()
        this.myTiles = rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      } catch (e) {
        console.warn('Failed to read myPackages from Dexie:', e)
        this.myTiles = []
      }
      this.myTilesLoaded = true
    },

    async syncMyTilesWithServer () {
      let data
      try {
        const res = await getMyPackages()
        data = res.data
      } catch (e) {
        console.warn('Unable to sync MyTiles with server, staying on local:', e?.message || e)
        return false
      }

      const serverById = new Map(data.map(p => [p.id, p]))
      const localRows = await db.myPackages.toArray()
      const localById = new Map(localRows.map(r => [r.id, r]))

      for (const pkg of data) {
        const existing = localById.get(pkg.id)
        if (!existing) continue

        if (pkg.layers) {
          for (const layer of pkg.layers) {
            if (layer.status === 'Ready' && layer.generationProgress == null) {
              layer.generationProgress = 1
            }
          }
        }
        await db.myPackages.put(toDexieRow(pkg, existing.source || SOURCE_OWN))
      }

      for (const row of localRows) {
        if (row.source === SOURCE_OWN && !serverById.has(row.id)) {
          await db.myPackages.delete(row.id)
        }
      }

      await this.loadMyTiles()
      return true
    },

    async fetchRegistry (lat, lon) {
      try {
        const { data } = await getRegistry()
        if (lat != null && lon != null) {
          data.sort((a, b) => {
            const distA = this._bboxDistance(a, lat, lon)
            const distB = this._bboxDistance(b, lat, lon)
            return distA - distB
          })
        }
        this.registryPackages = data
        this.isRegistryOffline = false
      } catch (e) {
        console.warn('Registry fetch failed:', e?.message || e)
        this.registryPackages = []
        this.isRegistryOffline = true
        throw e
      }
    },

    _bboxDistance (pkg, lat, lon) {
      const centerLon = (pkg.minLon + pkg.maxLon) / 2
      const centerLat = (pkg.minLat + pkg.maxLat) / 2
      const dLon = (lon - centerLon) * Math.cos(lat * Math.PI / 180)
      const dLat = lat - centerLat
      return dLon * dLon + dLat * dLat
    },

    async requestNewPackage (payload) {
      const { data } = await requestGeneration(payload)
      await db.myPackages.put(toDexieRow(data, SOURCE_OWN))
      this.myTiles.unshift(data)
      return data
    },

    async downloadLayerFile (packageId, layerType) {
      const key = sourceKey(packageId, layerType)

      const existingRecord = await db.offlineMaps.where({ packageId, layerType }).first()
      if (existingRecord) {
        const exists = await localMBTilesExists(existingRecord.filePath)
        if (exists) {
          await this._ensurePackageInMyTiles(packageId)
          return existingRecord.filePath
        }
        await db.offlineMaps.delete(existingRecord.id)
      }

      const inFlight = inFlightDownloads.get(key)
      if (inFlight) return inFlight.promise

      const controller = new AbortController()
      this.downloadProgress[key] = 0
      this.downloadAttempt[key] = { attempt: 1, total: 5 }

      const promise = (async () => {
        try {
          const filePath = await downloadLayer(packageId, layerType, {
            onProgress: (progress) => {
              this.downloadProgress[key] = progress
            },
            onAttempt: (attempt, total) => {
              this.downloadAttempt[key] = { attempt, total }
            },
            signal: controller.signal
          })
          this.downloadProgress[key] = 1
          delete this.downloadAttempt[key]

          await db.offlineMaps.add({ packageId, layerType, filePath, enabled: false })
          await this._ensurePackageInMyTiles(packageId)

          return filePath
        } catch (err) {
          delete this.downloadProgress[key]
          delete this.downloadAttempt[key]
          throw err
        } finally {
          inFlightDownloads.delete(key)
        }
      })()

      inFlightDownloads.set(key, { controller, promise })
      return promise
    },

    cancelDownload (packageId, layerType) {
      const key = sourceKey(packageId, layerType)
      inFlightDownloads.get(key)?.controller.abort()
    },

    isDownloadActive (packageId, layerType) {
      return inFlightDownloads.has(sourceKey(packageId, layerType))
    },

    async downloadAndActivateLayer (packageId, layerType) {
      const key = sourceKey(packageId, layerType)
      if (this.activeSources[key]) {
        return this.activeSources[key].source
      }

      const filePath = await this.downloadLayerFile(packageId, layerType)
      await db.offlineMaps.where({ packageId, layerType }).modify({ enabled: true })

      const nativeDb = await openNativeDatabase(filePath)

      let active
      try {
        active = await this._activateFromNativeDb(nativeDb, filePath, packageId, layerType)
      } catch (e) {
        try { nativeDb.close() } catch (_) {}
        throw e
      }

      this.activeSources[key] = active

      const existing = await db.offlineMaps.where({ packageId, layerType }).first()
      if (existing) {
        await db.offlineMaps.update(existing.id, { ...existing, format: active.format })
      }

      return active.source
    },

    async _ensurePackageInMyTiles (packageId) {
      const existing = await db.myPackages.get(packageId)
      if (existing) return

      const fromRegistry = this.registryPackages.find(p => p.id === packageId)
      if (fromRegistry) {
        await db.myPackages.put(toDexieRow(fromRegistry, SOURCE_LIBRARY))
        await this.loadMyTiles()
      }
    },

    async loadLocalLayers () {
      if (this.localLayersLoaded) return
      this.localLayersLoaded = true

      let records
      try {
        records = await db.offlineMaps.toArray()
      } catch (e) {
        console.warn('Failed to read offline maps from Dexie:', e)
        return
      }

      for (const record of records) {
        if (!record.enabled) continue

        const key = sourceKey(record.packageId, record.layerType)
        if (this.activeSources[key]) continue

        try {
          const nativeDb = await openNativeDatabase(record.filePath)
          this.activeSources[key] = await this._activateFromNativeDb(
            nativeDb, record.filePath, record.packageId, record.layerType
          )
        } catch (e) {
          console.warn(`Failed to load MBTiles for ${record.layerType}, removing stale record:`, e)
          await db.offlineMaps.delete(record.id)
        }
      }
    },

    async _activateFromNativeDb (nativeDb, filePath, packageId, layerType) {
      const fmtRows = await nativeDb.query("SELECT value FROM metadata WHERE name='format'")
      const format = (fmtRows[0]?.value || 'png').toLowerCase()
      const isVector = format === 'pbf'

      if (isVector) {
        const { source, style } = await createVectorMBTilesSource(nativeDb)
        return { source, db: nativeDb, filePath, isVector: true, format, style, visible: true, packageId, layerType }
      }

      const { source } = await createNativeMBTilesSource(nativeDb)
      return { source, db: nativeDb, filePath, isVector: false, format, visible: true, packageId, layerType }
    },

    async toggleLayerVisibility (packageId, layerType) {
      const active = this.activeSources[sourceKey(packageId, layerType)]
      if (!active) return
      await this.setLayerVisibility(packageId, layerType, !active.visible)
    },

    async setLayerVisibility (packageId, layerType, visible) {
      const key = sourceKey(packageId, layerType)
      const active = this.activeSources[key]
      if (active) {
        active.visible = !!visible
      }
      await db.offlineMaps
        .where({ packageId, layerType })
        .modify({ enabled: !!visible })
      if (!visible) {
        this.deactivateLayer(packageId, layerType)
      }
    },

    deactivateLayer (packageId, layerType) {
      const key = sourceKey(packageId, layerType)
      const active = this.activeSources[key]
      if (active) {
        disposeMBTilesDB(active.db)
        delete this.activeSources[key]
      }
    },

    async removeLayerFromDevice (packageId, layerType) {
      this.deactivateLayer(packageId, layerType)

      const record = await db.offlineMaps.where({ packageId, layerType }).first()
      if (record) {
        try {
          await deleteLocalMBTiles(record.filePath)
        } catch (e) {
          console.warn('Failed to delete MBTiles file:', e)
        }
        await db.offlineMaps.delete(record.id)
      }

      delete this.downloadProgress[sourceKey(packageId, layerType)]
    },

    async removePackageFromDevice (packageId) {
      let records = []
      try {
        records = await db.offlineMaps.where('packageId').equals(packageId).toArray()
      } catch (e) {
        console.warn('Failed to read offline maps for cleanup:', e)
      }

      for (const [key, active] of Object.entries(this.activeSources)) {
        if (active.packageId === packageId) {
          disposeMBTilesDB(active.db)
          delete this.activeSources[key]
        }
      }

      for (const record of records) {
        try {
          await deleteLocalMBTiles(record.filePath)
        } catch (e) {
          console.warn('Failed to delete MBTiles file:', e)
        }
      }

      await db.offlineMaps.where('packageId').equals(packageId).delete()
      await db.myPackages.delete(packageId)
      this.myTiles = this.myTiles.filter(p => p.id !== packageId)
    },

    async removePackageFromServer (packageId) {
      await deletePackage(packageId)
      await this.removePackageFromDevice(packageId)
      this.registryPackages = this.registryPackages.filter(p => p.id !== packageId)
    },

    async applyGenerationProgressUpdate (packageId, layerType, progress) {
      const pkg = this.myTiles.find(p => p.id === packageId)
      if (!pkg) return
      const layer = pkg.layers?.find(l => l.layerType === layerType)
      if (layer) {
        layer.generationProgress = progress
      }
      try {
        await db.myPackages.put(toDexieRow(pkg, SOURCE_OWN))
      } catch (e) {
        console.warn('Failed to persist generation progress:', e)
      }
    },

    async applyGenerationComplete (packageId, status) {
      const pkg = this.myTiles.find(p => p.id === packageId)
      if (pkg) {
        pkg.status = status
        try {
          await db.myPackages.put(toDexieRow(pkg, SOURCE_OWN))
        } catch (e) {
          console.warn('Failed to persist generation complete:', e)
        }
      }
      try {
        await this.syncMyTilesWithServer()
      } catch (e) {
        console.warn('Sync after completion failed:', e)
      }
    }
  }
})
