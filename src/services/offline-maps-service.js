import { api, apiUrl } from 'src/boot/api'

export const OFFLINE_MAPS_REQUIRE_NATIVE = 'OFFLINE_MAPS_REQUIRE_NATIVE'

function getDatabasesDir () {
  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(cordova.file.applicationStorageDirectory, (appDir) => {
      appDir.getDirectory('databases', { create: true }, resolve, reject)
    }, reject)
  })
}

export async function downloadLayer (packageId, layerType, onProgress) {
  if (!window.cordova?.file) {
    throw new Error(OFFLINE_MAPS_REQUIRE_NATIVE)
  }
  const fileName = `${packageId}_${layerType}.mbtiles`
  const dir = await getDatabasesDir()
  const targetPath = dir.nativeURL + fileName
  return downloadWithStreaming(packageId, layerType, targetPath, onProgress)
}

async function downloadWithStreaming (packageId, layerType, targetPath, onProgress) {
  const url = `${apiUrl}/api/offline-maps/${packageId}/layers/${layerType}/download`

  const headers = {}
  const authHeader = api.defaultHeaders.Authorization
  if (authHeader) headers.Authorization = authHeader

  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`)
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
  const reader = response.body.getReader()

  const fileEntry = await new Promise((resolve, reject) => {
    const dirPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
    const fileName = targetPath.split('/').pop()
    window.resolveLocalFileSystemURL(dirPath, (dirEntry) => {
      dirEntry.getFile(fileName, { create: true }, resolve, reject)
    }, reject)
  })

  const writer = await new Promise((resolve, reject) => {
    fileEntry.createWriter(resolve, reject)
  })

  let receivedBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    await new Promise((resolve, reject) => {
      writer.onwriteend = resolve
      writer.onerror = reject
      writer.seek(receivedBytes)
      writer.write(new Blob([value]))
    })

    receivedBytes += value.length

    if (contentLength && onProgress) {
      onProgress(receivedBytes / contentLength)
    }
  }

  return fileEntry.nativeURL
}

export async function localMBTilesExists (filePath) {
  return new Promise((resolve) => {
    window.resolveLocalFileSystemURL(filePath, () => resolve(true), () => resolve(false))
  })
}

export async function deleteLocalMBTiles (filePath) {
  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
      fileEntry.remove(resolve, reject)
    }, reject)
  })
}

export function requestGeneration (payload) {
  return api.post('/api/offline-maps', payload)
}

export function getMyPackages () {
  return api.get('/api/offline-maps')
}

export function getRegistry () {
  return api.get('/api/offline-maps/registry')
}

export function deletePackage (id) {
  return api.delete(`/api/offline-maps/${id}`)
}
