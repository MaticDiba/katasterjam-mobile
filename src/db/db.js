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
