import Dexie from 'dexie'

export const db = new Dexie('kataster-jam-db')

db.version(4.2).stores({
  tiles: '++id, tileKey, image, offlineId',
  offlineStore: '++id, name',
  caveImports: '++id, numberOfCaves',
  caves: 'caveNumber, name, length, depth, organization, registrationYear, x, y, lat, lng',
  customLocations: 'externalId, id, name, description, type, typeId, isAuthor, organizations, lat, lng, createdDate',
  customLocationsTypes: 'id, name, description',
  customLocationsStatuses: 'id, name, description',
  files: 'externalId, fkId, id, data, fileName, mimeType',
  excursions: 'externalId, id, dateOfExcursion, type, typeId, name, participants, meParticipant, requestedJoin'
})

db.version(4.3).stores({
  files: 'externalId, fkId, id, filePath, fileName, mimeType'
}).upgrade(tx => {
  return tx.table('files').toCollection().modify(file => {
    delete file.data
    if (!file.filePath) {
      file.filePath = ''
    }
  })
})

db.version(4.4).stores({
  offlineMaps: '++id, packageId, layerType, filePath, [packageId+layerType]'
})

db.version(4.5).stores({
  offlineMaps: '++id, packageId, layerType, [packageId+layerType]'
}).upgrade(tx => {
  return tx.table('offlineMaps').toCollection().modify(record => {
    delete record.isVector
  })
})

db.version(4.6).stores({
  myPackages: 'id, source, status, updatedAt'
})

db.version(4.7).stores({
  offlineMaps: '++id, packageId, layerType, [packageId+layerType]'
}).upgrade(tx => {
  return tx.table('offlineMaps').toCollection().modify(record => {
    if (record.enabled === undefined) record.enabled = true
  })
})

db.version(4.8).stores({
  gpxTracks: 'externalId, id, fkExcursionId, name, statusId, filePath, fileName, mimeType, createdAt, syncedAt'
})

db.version(4.9).stores({
  tracks: '++id, name, status, startedAt, endedAt',
  trackPoints: '++id, trackId, [trackId+timestamp]'
})

db.version(4.10).stores({
  // Add fkExcursionId + syncedAt as indexes so we can filter by excursion
  // and find pending uploads. color, serverId, gpxFilePath stay non-indexed.
  tracks: '++id, name, status, startedAt, endedAt, fkExcursionId, syncedAt'
}).upgrade(tx => {
  return tx.table('tracks').toCollection().modify(t => {
    if (t.color === undefined) t.color = '#e53935'
    if (t.fkExcursionId === undefined) t.fkExcursionId = null
    if (t.serverId === undefined) t.serverId = null
    if (t.syncedAt === undefined) t.syncedAt = null
    if (t.gpxFilePath === undefined) t.gpxFilePath = null
  })
})

db.version(4.11).stores({
  // No index changes — addedToMap/mapVisible are only filtered in memory.
  tracks: '++id, name, status, startedAt, endedAt, fkExcursionId, syncedAt'
}).upgrade(tx => {
  return tx.table('tracks').toCollection().modify(t => {
    if (t.addedToMap === undefined) t.addedToMap = false
    if (t.mapVisible === undefined) t.mapVisible = true
  })
})

// Note: Dexie rounds versions to one decimal (Math.round(verno * 10) / 10),
// so 4.10/4.11/4.12 all collapse to 4.1 and won't trigger an upgrade past 4.9.
// We bump to 5 to force `onupgradeneeded` and drop the dead legacy tables.
db.version(5).stores({
  // offlineStore is replaced by myPackages / offlineMaps.
  // tiles was the WMTS cache for the old offline-data system; nothing writes
  // to it anymore (CustomWMTSLayer no longer reads it either).
  offlineStore: null,
  tiles: null
})
