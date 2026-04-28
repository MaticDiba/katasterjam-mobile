import { Platform } from 'quasar'

const readyDirs = new Set()

function ensureDir (dir) {
  if (readyDirs.has(dir)) return Promise.resolve()

  if (Platform.is.cordova) {
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (rootDir) => {
        rootDir.getDirectory(dir, { create: true }, () => {
          readyDirs.add(dir)
          resolve()
        }, reject)
      }, reject)
    })
  }

  readyDirs.add(dir)
  return Promise.resolve()
}

function cordovaDirPath (dir) {
  return cordova.file.dataDirectory + dir + '/'
}

export async function saveFile (blob, fileName, dir = 'photos') {
  await ensureDir(dir)
  const uniqueName = `${Date.now()}-${fileName}`

  if (Platform.is.cordova) {
    return new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(cordovaDirPath(dir), (dirEntry) => {
        dirEntry.getFile(uniqueName, { create: true, exclusive: false }, (fileEntry) => {
          fileEntry.createWriter((writer) => {
            writer.onwriteend = () => resolve(cordovaDirPath(dir) + uniqueName)
            writer.onerror = reject
            writer.write(blob)
          }, reject)
        }, reject)
      }, reject)
    })
  }

  const root = await navigator.storage.getDirectory()
  const subDir = await root.getDirectoryHandle(dir, { create: true })
  const fileHandle = await subDir.getFileHandle(uniqueName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
  return dir + '/' + uniqueName
}

export async function getFileUrl (filePath) {
  const blob = await readFileAsBlob(filePath)
  return URL.createObjectURL(blob)
}

export async function readFileAsBlob (filePath) {
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
            resolve(new Blob([reader.result], { type: file.type || 'application/octet-stream' }))
          }
          reader.onerror = reject
          reader.readAsArrayBuffer(file)
        }, reject)
      }, reject)
    })
  }

  const slashIndex = filePath.indexOf('/')
  const dir = filePath.substring(0, slashIndex)
  const fileName = filePath.substring(slashIndex + 1)
  const root = await navigator.storage.getDirectory()
  const subDir = await root.getDirectoryHandle(dir)
  const fileHandle = await subDir.getFileHandle(fileName)
  return await fileHandle.getFile()
}

export async function deleteFile (filePath) {
  if (Platform.is.cordova) {
    return new Promise((resolve) => {
      window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
        fileEntry.remove(resolve, (err) => {
          console.warn('File delete failed', err)
          resolve()
        })
      }, (err) => {
        console.warn('File already deleted or not found', err)
        resolve()
      })
    })
  }

  try {
    const slashIndex = filePath.indexOf('/')
    const dir = filePath.substring(0, slashIndex)
    const fileName = filePath.substring(slashIndex + 1)
    const root = await navigator.storage.getDirectory()
    const subDir = await root.getDirectoryHandle(dir)
    await subDir.removeEntry(fileName)
  } catch (err) {
    console.warn('File already deleted or not found', err)
  }
}
