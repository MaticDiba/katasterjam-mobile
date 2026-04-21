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

export const useOfflineMapsStore = defineStore('offline-maps', {
  state: () => ({
    packages: [],
    registryPackages: [],
    downloadProgress: {},
    activeSources: {},
    localLayersLoaded: false
  }),

  getters: {
    readyPackages (state) {
      return state.packages.filter(p => p.status === 'Ready')
    },
    pendingPackages (state) {
      return state.packages.filter(p => p.status === 'Pending' || p.status === 'Generating')
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
    async fetchMyPackages () {
      const { data } = await getMyPackages()
      for (const pkg of data) {
        if (pkg.layers) {
          for (const layer of pkg.layers) {
            if (layer.status === 'Ready' && layer.generationProgress == null) {
              layer.generationProgress = 1
            }
          }
        }
      }
      this.packages = data
    },

    async fetchRegistry (lat, lon) {
      const { data } = await getRegistry()
      if (lat != null && lon != null) {
        data.sort((a, b) => {
          const distA = this._bboxDistance(a, lat, lon)
          const distB = this._bboxDistance(b, lat, lon)
          return distA - distB
        })
      }
      this.registryPackages = data
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
      this.packages.push(data)
      return data
    },

    async downloadAndActivateLayer (packageId, layerType) {
      const key = sourceKey(packageId, layerType)
      if (this.activeSources[key]) {
        return this.activeSources[key].source
      }

      const existingRecord = await db.offlineMaps.where({ packageId, layerType }).first()
      let filePath
      if (existingRecord) {
        const exists = await localMBTilesExists(existingRecord.filePath)
        if (exists) {
          filePath = existingRecord.filePath
        } else {
          console.warn('Local MBTiles file missing, will re-download')
          await db.offlineMaps.delete(existingRecord.id)
        }
      }

      if (!filePath) {
        this.downloadProgress[key] = 0
        filePath = await downloadLayer(packageId, layerType, (progress) => {
          this.downloadProgress[key] = progress
        })
        this.downloadProgress[key] = 1
      }

      const nativeDb = await openNativeDatabase(filePath)

      let active
      try {
        active = await this._activateFromNativeDb(nativeDb, filePath, packageId, layerType)
      } catch (e) {
        try { nativeDb.close() } catch (_) {}
        throw e
      }

      this.activeSources[key] = active

      const record = { packageId, layerType, filePath, format: active.format }
      const existing = await db.offlineMaps.where({ packageId, layerType }).first()
      if (existing) {
        await db.offlineMaps.update(existing.id, record)
      } else {
        await db.offlineMaps.add(record)
      }

      return active.source
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

    toggleLayerVisibility (packageId, layerType) {
      const active = this.activeSources[sourceKey(packageId, layerType)]
      if (active) {
        active.visible = !active.visible
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

    async removePackage (packageId) {
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

      await deletePackage(packageId)
      this.packages = this.packages.filter(p => p.id !== packageId)
    }
  }
})
