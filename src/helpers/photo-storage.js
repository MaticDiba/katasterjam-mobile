import { Platform } from 'quasar'

const PHOTOS_DIR = 'photos'
let dirReady = false

function ensurePhotosDir () {
  if (dirReady) return Promise.resolve()

  if (Platform.is.cordova) {
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (rootDir) => {
        rootDir.getDirectory(PHOTOS_DIR, { create: true }, () => {
          dirReady = true
          resolve()
        }, reject)
      }, reject)
    })
  }

  dirReady = true
  return Promise.resolve()
}

function getCordovaPhotosPath () {
  return cordova.file.dataDirectory + PHOTOS_DIR + '/'
}

export async function savePhoto (blob, fileName) {
  await ensurePhotosDir()
  const uniqueName = `${Date.now()}-${fileName}`

  if (Platform.is.cordova) {
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(getCordovaPhotosPath(), (dirEntry) => {
        dirEntry.getFile(uniqueName, { create: true, exclusive: false }, (fileEntry) => {
          fileEntry.createWriter((writer) => {
            writer.onwriteend = () => resolve(getCordovaPhotosPath() + uniqueName)
            writer.onerror = reject
            writer.write(blob)
          }, reject)
        }, reject)
      }, reject)
    })
  }

  const root = await navigator.storage.getDirectory()
  const photosDir = await root.getDirectoryHandle(PHOTOS_DIR, { create: true })
  const fileHandle = await photosDir.getFileHandle(uniqueName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
  return PHOTOS_DIR + '/' + uniqueName
}

export async function getPhotoUrl (filePath) {
  const blob = await readPhotoAsBlob(filePath)
  return URL.createObjectURL(blob)
}

export async function readPhotoAsBlob (filePath) {
  if (Platform.is.cordova) {
    if (filePath.startsWith('content://')) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', filePath, true)
        xhr.responseType = 'blob'
        xhr.timeout = 10000
        xhr.onload = () => {
          const blob = xhr.response
          resolve(blob && blob.type ? blob : new Blob([blob], { type: 'image/jpeg' }))
        }
        xhr.onerror = () => reject(new Error('Failed to read content URI'))
        xhr.ontimeout = () => reject(new Error('Timeout reading content URI'))
        xhr.send()
      })
    }
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
        fileEntry.file((file) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(new Blob([reader.result], { type: file.type || 'image/jpeg' }))
          }
          reader.onerror = reject
          reader.readAsArrayBuffer(file)
        }, reject)
      }, reject)
    })
  }

  const fileName = filePath.replace(PHOTOS_DIR + '/', '')
  const root = await navigator.storage.getDirectory()
  const photosDir = await root.getDirectoryHandle(PHOTOS_DIR)
  const fileHandle = await photosDir.getFileHandle(fileName)
  return await fileHandle.getFile()
}

export async function deletePhoto (filePath) {
  if (Platform.is.cordova) {
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
        fileEntry.remove(resolve, reject)
      }, (err) => {
        console.warn('Photo already deleted or not found', err)
        resolve()
      })
    })
  }

  try {
    const fileName = filePath.replace(PHOTOS_DIR + '/', '')
    const root = await navigator.storage.getDirectory()
    const photosDir = await root.getDirectoryHandle(PHOTOS_DIR)
    await photosDir.removeEntry(fileName)
  } catch (err) {
    console.warn('Photo already deleted or not found', err)
  }
}
