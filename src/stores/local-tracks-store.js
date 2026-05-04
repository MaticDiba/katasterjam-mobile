import { defineStore } from 'pinia'
import { Platform } from 'quasar'
import { api } from 'src/boot/api'
import { db } from 'src/db/db'
import { serializeGpx } from 'src/helpers/gpx-file'
import { saveFile, readFileAsBlob, deleteFile } from 'src/helpers/file-storage'
import { resolveExcursionId } from 'src/helpers/excursion-resolver'
import { useAuthStore } from 'src/stores/auth-store'

// Document-type ids match what the existing GPX import uses
// (see src/stores/local-gpx-store.js).
const GPX_DOCUMENT_TYPE_ID = 25
const GPX_DEFAULT_STATUS_ID = 1

let syncPromise = null

const utf8ToBase64 = (str) => {
  // Round-trip through UTF-8 bytes so non-ASCII (Slovenian) survives btoa.
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

const sanitizeFilename = (name) =>
  String(name || 'track').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'track'

const normalizeTrack = (row) => ({
  ...row,
  addedToMap: row.addedToMap === true,
  mapVisible: row.mapVisible !== false
})

export const useLocalTracksStore = defineStore('local-tracks', {
  state: () => ({
    tracks: []
  }),

  getters: {
    getTracks: (state) => state.tracks,
    getAddedTracks: (state) => state.tracks.filter(t => t.addedToMap),
    getVisibleIds: (state) => state.tracks
      .filter(t => t.addedToMap && t.mapVisible)
      .map(t => t.id),
    isOnMap: (state) => (id) => {
      const t = state.tracks.find(x => x.id === Number(id))
      return !!(t && t.addedToMap)
    },
    isVisible: (state) => (id) => {
      const t = state.tracks.find(x => x.id === Number(id))
      return !!(t && t.addedToMap && t.mapVisible)
    },
    pendingCount: (state) => state.tracks.filter(
      t => t.status === 'completed' && t.fkExcursionId != null && !t.syncedAt
    ).length
  },

  actions: {
    async refresh () {
      const rows = await db.tracks.orderBy('startedAt').reverse().toArray()
      this.tracks = rows.map(normalizeTrack)
    },

    async getById (id) {
      return await db.tracks.get(Number(id))
    },

    async getPointsForTrack (id) {
      return await db.trackPoints
        .where('[trackId+timestamp]')
        .between([Number(id), 0], [Number(id), Infinity])
        .toArray()
    },

    /**
     * Create a new tracks-table row with the recording-time options.
     * Called by location-store when the user confirms the start dialog.
     */
    async createTrack ({ name, color, fkExcursionId } = {}) {
      const now = new Date()
      const id = await db.tracks.add({
        name: name || now.toLocaleString('sl-SI'),
        status: 'recording',
        startedAt: now.toISOString(),
        endedAt: null,
        distance: 0,
        pointCount: 0,
        color: color || '#e53935',
        fkExcursionId: fkExcursionId || null,
        serverId: null,
        syncedAt: null,
        gpxFilePath: null,
        addedToMap: false,
        mapVisible: true
      })
      return id
    },

    async rename (id, name) {
      await db.tracks.update(Number(id), { name })
      await this.refresh()
    },

    async setAddedToMap (id, value) {
      const tid = Number(id)
      const next = !!value
      // Re-show on add so toggling back on doesn't keep it hidden;
      // hide when removing from map for a clean reset.
      await db.tracks.update(tid, {
        addedToMap: next,
        mapVisible: next
      })
      const track = this.tracks.find(t => t.id === tid)
      if (track) {
        track.addedToMap = next
        track.mapVisible = next
      }
    },

    async setVisible (id, visible) {
      const tid = Number(id)
      const track = this.tracks.find(t => t.id === tid)
      if (!track || !track.addedToMap) return
      const next = !!visible
      if (track.mapVisible === next) return
      await db.tracks.update(tid, { mapVisible: next })
      track.mapVisible = next
    },

    async toggleVisible (id) {
      const tid = Number(id)
      const track = this.tracks.find(t => t.id === tid)
      if (!track || !track.addedToMap) return
      await this.setVisible(tid, !track.mapVisible)
    },

    async setAllVisible (visible) {
      const next = !!visible
      const ids = this.tracks
        .filter(t => t.addedToMap && t.mapVisible !== next)
        .map(t => t.id)
      if (ids.length === 0) return
      await db.transaction('rw', db.tracks, async () => {
        for (const id of ids) {
          await db.tracks.update(id, { mapVisible: next })
        }
      })
      for (const id of ids) {
        const track = this.tracks.find(t => t.id === id)
        if (track) track.mapVisible = next
      }
    },

    async delete (id) {
      const tid = Number(id)
      const track = await db.tracks.get(tid)
      if (track && track.gpxFilePath) {
        try { await deleteFile(track.gpxFilePath) } catch (e) { /* best effort */ }
      }
      await db.transaction('rw', db.tracks, db.trackPoints, async () => {
        await db.trackPoints.where('trackId').equals(tid).delete()
        await db.tracks.delete(tid)
      })
      await this.refresh()
    },

    async buildGpxFor (id) {
      const track = await this.getById(id)
      if (!track) throw new Error('Track not found')
      const points = await this.getPointsForTrack(id)
      const text = serializeGpx(track, points)
      const stamp = (track.startedAt || new Date().toISOString())
        .replace(/[:.]/g, '-')
        .slice(0, 19)
      const filename = `${sanitizeFilename(track.name)}-${stamp}.gpx`
      return { text, filename, track, points }
    },

    /**
     * Export the GPX. On Android (cordova) writes via SAF MediaStore into
     * Downloads/KatasterJam (no user picker — silent save). On the web,
     * triggers a Blob download.
     */
    async exportGpx (id) {
      const { text, filename } = await this.buildGpxFor(id)

      if (Platform.is.cordova && window.cordova?.plugins?.safMediastore?.writeFile) {
        const uri = await window.cordova.plugins.safMediastore.writeFile({
          data: utf8ToBase64(text),
          filename,
          subFolder: 'KatasterJam'
        })
        return { method: 'mediastore', filename, uri }
      }

      const blob = new Blob([text], { type: 'application/gpx+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return { method: 'download', filename }
    },

    /**
     * Upload a single track to the linked excursion as a GPX document.
     * Mirrors `local-gpx-store.uploadOne` — same `/api/documents` endpoint,
     * same FormData shape — so backend changes are not needed.
     *
     * Returns the updated track row, or null if the excursion is unsynced
     * (we keep the track in the queue and try again later).
     */
    async uploadOne (trackId) {
      const tid = Number(trackId)
      const track = await this.getById(tid)
      if (!track) throw new Error('Track not found')
      if (track.fkExcursionId == null) return null

      const { id: resolvedExcursionId } = await resolveExcursionId(track.fkExcursionId)
      // If the excursion isn't synced yet, defer — uploadPending will retry.
      if (resolvedExcursionId == null) return null

      // Materialise the GPX as a file so we can re-upload on retry without
      // reserialising. Reuse a previously-saved path if present.
      let filePath = track.gpxFilePath
      let filename
      let blob
      if (filePath) {
        try {
          blob = await readFileAsBlob(filePath)
          filename = filePath.split('/').pop()
        } catch (e) {
          filePath = null // fall through to rebuild
        }
      }
      if (!filePath) {
        const built = await this.buildGpxFor(tid)
        blob = new Blob([built.text], { type: 'application/gpx+xml' })
        filename = built.filename
        filePath = await saveFile(blob, filename, 'tracks')
        await db.tracks.update(tid, { gpxFilePath: filePath })
      }

      const authStore = useAuthStore()
      const organizationId = authStore.getOrganizationId

      const formData = new FormData()
      formData.append('file', new Blob([blob], { type: 'application/gpx+xml' }), filename)
      formData.append('data', JSON.stringify({
        name: track.name,
        typeId: GPX_DOCUMENT_TYPE_ID,
        statusId: GPX_DEFAULT_STATUS_ID,
        docDataTypeId: null,
        excursionId: resolvedExcursionId,
        organizations: organizationId ? [{ id: organizationId }] : []
      }))

      const response = await api.post('/api/documents', formData)
      const updated = {
        serverId: response.data?.id ?? null,
        syncedAt: new Date().toISOString()
      }
      await db.tracks.update(tid, updated)
      await this.refresh()
      return { ...track, ...updated }
    },

    async uploadPending () {
      // Dexie's `.equals(null)` is unreliable across versions; filter in memory.
      // The pending set is bounded by the user's recent tracks, so this is fine.
      const all = await db.tracks.toArray()
      const candidates = all.filter(
        t => t.status === 'completed' && t.fkExcursionId != null && !t.syncedAt
      )
      for (const track of candidates) {
        try {
          await this.uploadOne(track.id)
        } catch (err) {
          console.error('Error uploading track', track.name, err)
        }
      }
      await this.refresh()
    },

    async sync () {
      if (syncPromise) return syncPromise
      syncPromise = (async () => {
        try {
          await this.uploadPending()
        } finally {
          syncPromise = null
        }
      })()
      return syncPromise
    }
  }
})
