import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { api } from 'src/boot/api'
import { db } from 'src/db/db'
import { saveFile, readFileAsBlob, deleteFile } from 'src/helpers/file-storage'
import { parseGpx, readFileAsText } from 'src/helpers/gpx-file'
import { useAuthStore } from 'src/stores/auth-store'

const GPX_DOCUMENT_TYPE_ID = 25
const APP_TO_DOC_STATUS = { 1: 4, 2: 1, 3: 3, 4: 5 }

let syncPromise = null

function sanitizeFileName (name) {
  return (name || 'track.gpx').replace(/[^A-Za-z0-9._-]+/g, '_')
}

async function resolveExcursionId (fkExcursionId) {
  if (fkExcursionId == null || fkExcursionId === '') return { linked: false, id: null }
  if (typeof fkExcursionId === 'number') return { linked: true, id: fkExcursionId }
  const asNum = Number(fkExcursionId)
  if (!Number.isNaN(asNum) && String(asNum) === String(fkExcursionId)) {
    return { linked: true, id: asNum }
  }
  const excursion = await db.excursions.where('externalId').equals(fkExcursionId).first()
  if (excursion && excursion.id && excursion.id !== -1) {
    return { linked: true, id: excursion.id }
  }
  return { linked: true, id: null }
}

function normalizeTrack (track) {
  return {
    ...track,
    addedToMap: track.addedToMap === true,
    mapVisible: track.mapVisible === true
  }
}

export const useLocalGpxStore = defineStore('local-gpx', {
  state: () => ({
    tracks: []
  }),
  getters: {
    getTracks: (state) => state.tracks,
    getAddedTracks: (state) => state.tracks.filter(t => t.addedToMap),
    getVisibleIds: (state) => state.tracks
      .filter(t => t.addedToMap && t.mapVisible)
      .map(t => t.externalId),
    isOnMap: (state) => (externalId) => {
      const track = state.tracks.find(t => t.externalId === externalId)
      return !!(track && track.addedToMap)
    },
    isVisible: (state) => (externalId) => {
      const track = state.tracks.find(t => t.externalId === externalId)
      return !!(track && track.addedToMap && track.mapVisible)
    }
  },
  actions: {
    async refresh () {
      const rows = await db.gpxTracks.orderBy('createdAt').reverse().toArray()
      this.tracks = rows.map(normalizeTrack)
    },
    async getById (externalId) {
      return await db.gpxTracks.where('externalId').equals(externalId).first()
    },
    async getForExcursion (excursionId) {
      if (excursionId == null) return []
      const key = String(excursionId)
      const all = await db.gpxTracks.toArray()
      return all.filter(t => String(t.fkExcursionId) === key)
    },
    async loadText (externalId) {
      const record = await this.getById(externalId)
      if (!record) return null
      const blob = await readFileAsBlob(record.filePath)
      return await readFileAsText(blob)
    },
    async loadParsed (externalId) {
      const text = await this.loadText(externalId)
      return text ? parseGpx(text) : null
    },
    async importFromText (text, fileName, { excursionId = null, statusId = 1, name } = {}) {
      const parsed = parseGpx(text)
      const blob = new Blob([text], { type: 'application/gpx+xml' })
      const safeName = fileName || 'track.gpx'
      const filePath = await saveFile(blob, sanitizeFileName(safeName), 'gpx')

      const record = {
        externalId: uuidv4(),
        id: -1,
        fkExcursionId: excursionId,
        name: name?.trim() || parsed.trackName || safeName || 'GPX Track',
        statusId,
        filePath,
        fileName: safeName,
        mimeType: 'application/gpx+xml',
        createdAt: new Date().toISOString(),
        syncedAt: null,
        stats: parsed.stats,
        addedToMap: false,
        mapVisible: false
      }

      await db.gpxTracks.put(record)
      await this.refresh()
      return { record, extent: parsed.extent }
    },
    async delete (externalId) {
      const record = await this.getById(externalId)
      if (!record) return
      if (record.filePath) {
        try {
          await deleteFile(record.filePath)
        } catch (err) {
          console.warn('Failed to delete GPX file', err)
        }
      }
      await db.gpxTracks.where('externalId').equals(externalId).delete()
      await this.refresh()
    },
    async addToMap (externalId) {
      await db.gpxTracks.update(externalId, { addedToMap: true, mapVisible: true })
      const track = this.tracks.find(t => t.externalId === externalId)
      if (track) {
        track.addedToMap = true
        track.mapVisible = true
      }
    },
    async removeFromMap (externalId) {
      await db.gpxTracks.update(externalId, { addedToMap: false, mapVisible: false })
      const track = this.tracks.find(t => t.externalId === externalId)
      if (track) {
        track.addedToMap = false
        track.mapVisible = false
      }
    },
    async setVisible (externalId, visible) {
      const track = this.tracks.find(t => t.externalId === externalId)
      if (!track || !track.addedToMap) return
      const next = !!visible
      if (track.mapVisible === next) return
      await db.gpxTracks.update(externalId, { mapVisible: next })
      track.mapVisible = next
    },
    async toggleVisible (externalId) {
      const track = this.tracks.find(t => t.externalId === externalId)
      if (!track || !track.addedToMap) return
      await this.setVisible(externalId, !track.mapVisible)
    },
    async setAllVisible (visible) {
      const next = !!visible
      const ids = this.tracks
        .filter(t => t.addedToMap && t.mapVisible !== next)
        .map(t => t.externalId)
      if (ids.length === 0) return
      await db.transaction('rw', db.gpxTracks, async () => {
        for (const id of ids) {
          await db.gpxTracks.update(id, { mapVisible: next })
        }
      })
      for (const id of ids) {
        const track = this.tracks.find(t => t.externalId === id)
        if (track) track.mapVisible = next
      }
    },
    async uploadOne (externalId) {
      const track = await this.getById(externalId)
      if (!track || track.id !== -1) return track
      const authStore = useAuthStore()
      const organizationId = authStore.getOrganizationId

      const { linked, id: resolvedExcursionId } = await resolveExcursionId(track.fkExcursionId)
      if (linked && resolvedExcursionId == null) {
        return null
      }

      const blob = await readFileAsBlob(track.filePath)
      const uploadBlob = new Blob([blob], { type: 'application/gpx+xml' })
      const formData = new FormData()
      formData.append('file', uploadBlob, track.fileName)
      formData.append('data', JSON.stringify({
        name: track.name,
        typeId: GPX_DOCUMENT_TYPE_ID,
        statusId: APP_TO_DOC_STATUS[track.statusId] || 1,
        docDataTypeId: null,
        excursionId: resolvedExcursionId ?? null,
        organizations: organizationId ? [{ id: organizationId }] : []
      }))

      const response = await api.post('/api/documents', formData)
      const updated = {
        id: response.data.id,
        syncedAt: new Date().toISOString()
      }
      await db.gpxTracks.update(track.externalId, updated)
      await this.refresh()
      return { ...track, ...updated }
    },
    async uploadPending () {
      const pending = await db.gpxTracks.where('id').equals(-1).toArray()
      for (const track of pending) {
        try {
          await this.uploadOne(track.externalId)
        } catch (err) {
          console.error('Error uploading GPX', track.name, err)
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
