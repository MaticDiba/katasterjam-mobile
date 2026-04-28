import { api, apiUrl } from 'src/boot/api'

export const OFFLINE_MAPS_REQUIRE_NATIVE = 'OFFLINE_MAPS_REQUIRE_NATIVE'

export const DOWNLOAD_DEFAULTS = {
  maxAttempts: 5,
  idleTimeoutMs: 120000,
  initialBackoffMs: 1000,
  maxBackoffMs: 16000
}

function getDatabasesDir () {
  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(cordova.file.applicationStorageDirectory, (appDir) => {
      appDir.getDirectory('databases', { create: true }, resolve, reject)
    }, reject)
  })
}

function backoffDelay (attempt, initial, max) {
  const base = Math.min(initial * Math.pow(2, attempt - 1), max)
  const jitter = base * (0.75 + Math.random() * 0.5)
  return Math.round(jitter)
}

function abortableDelay (ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function shouldRetry (err) {
  if (err?.name === 'AbortError') return false
  if (err?.name === 'IdleTimeoutError') return true
  if (err?.status != null) {
    if (err.status === 408 || err.status === 429) return true
    if (err.status >= 400 && err.status < 500) return false
    return true
  }
  return true
}

async function softDeleteFile (filePath) {
  return new Promise((resolve) => {
    window.resolveLocalFileSystemURL(filePath,
      (fileEntry) => fileEntry.remove(() => resolve(true), () => resolve(false)),
      () => resolve(false)
    )
  })
}

export async function downloadLayer (packageId, layerType, options = {}) {
  if (!window.cordova?.file) {
    throw new Error(OFFLINE_MAPS_REQUIRE_NATIVE)
  }
  const {
    onProgress,
    onAttempt,
    signal,
    maxAttempts = DOWNLOAD_DEFAULTS.maxAttempts,
    idleTimeoutMs = DOWNLOAD_DEFAULTS.idleTimeoutMs,
    initialBackoffMs = DOWNLOAD_DEFAULTS.initialBackoffMs,
    maxBackoffMs = DOWNLOAD_DEFAULTS.maxBackoffMs
  } = options

  const fileName = `${packageId}_${layerType}.mbtiles`
  const dir = await getDatabasesDir()
  const targetPath = dir.nativeURL + fileName

  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (onAttempt) onAttempt(attempt, maxAttempts)
    try {
      return await downloadWithStreaming(packageId, layerType, targetPath, {
        onProgress, signal, idleTimeoutMs
      })
    } catch (err) {
      lastErr = err
      if (err?.name === 'AbortError') throw err
      // No HTTP Range support on the server: any partial bytes are useless on retry.
      await softDeleteFile(targetPath)
      if (attempt >= maxAttempts || !shouldRetry(err)) throw err
      const ms = backoffDelay(attempt, initialBackoffMs, maxBackoffMs)
      await abortableDelay(ms, signal)
    }
  }
  throw lastErr
}

async function downloadWithStreaming (packageId, layerType, targetPath, { onProgress, signal, idleTimeoutMs }) {
  const url = `${apiUrl}/api/offline-maps/${packageId}/layers/${layerType}/download`

  const headers = {}
  const authHeader = api.defaultHeaders.Authorization
  if (authHeader) headers.Authorization = authHeader

  const internal = new AbortController()
  let idleTriggered = false
  let idleTimer = null

  const onUserAbort = () => internal.abort()
  if (signal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    signal.addEventListener('abort', onUserAbort, { once: true })
  }

  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      idleTriggered = true
      internal.abort()
    }, idleTimeoutMs)
  }

  const cleanup = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
    signal?.removeEventListener('abort', onUserAbort)
  }

  const wrapErr = (err) => {
    if (err?.name !== 'AbortError') return err
    if (signal?.aborted) return err
    if (idleTriggered) {
      const e = new Error('Idle timeout while downloading layer')
      e.name = 'IdleTimeoutError'
      return e
    }
    return err
  }

  let response
  try {
    resetIdle()
    response = await fetch(url, { headers, signal: internal.signal })
  } catch (err) {
    cleanup()
    throw wrapErr(err)
  }

  if (!response.ok) {
    cleanup()
    const e = new Error(`Download failed: HTTP ${response.status}`)
    e.status = response.status
    throw e
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
  const reader = response.body.getReader()

  let fileEntry, writer
  try {
    fileEntry = await new Promise((resolve, reject) => {
      const dirPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
      const fileName = targetPath.split('/').pop()
      window.resolveLocalFileSystemURL(dirPath, (dirEntry) => {
        dirEntry.getFile(fileName, { create: true }, resolve, reject)
      }, reject)
    })
    writer = await new Promise((resolve, reject) => {
      fileEntry.createWriter(resolve, reject)
    })
    // Truncate any leftover bytes from a previous failed attempt before writing.
    await new Promise((resolve, reject) => {
      writer.onwriteend = resolve
      writer.onerror = reject
      writer.truncate(0)
    })
  } catch (err) {
    cleanup()
    throw err
  }

  let receivedBytes = 0
  try {
    while (true) {
      resetIdle()
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
  } catch (err) {
    cleanup()
    throw wrapErr(err)
  }

  cleanup()
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
