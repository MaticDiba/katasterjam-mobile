import { boot } from 'quasar/wrappers'
import { Platform } from 'quasar'
import { useGpxIntakeStore } from 'src/stores/gpx-intake-store'

function looksLikeGpx (intent) {
  if (!intent) return false
  const type = (intent.type || '').toLowerCase()
  if (type === 'application/gpx+xml') return true
  const uri = getIntentUri(intent)
  return typeof uri === 'string' && /\.gpx(\?|$)/i.test(uri)
}

function getIntentUri (intent) {
  if (!intent) return null
  if (intent.data) return intent.data
  const extras = intent.extras || {}
  const stream = extras['android.intent.extra.STREAM']
  if (typeof stream === 'string') return stream
  if (stream && typeof stream.toString === 'function') return stream.toString()
  return null
}

function describeFileError (err) {
  if (!err) return 'unknown'
  if (typeof err === 'string') return err
  if (err.code !== undefined) {
    const codes = { 1: 'NOT_FOUND', 2: 'SECURITY', 3: 'ABORT', 4: 'NOT_READABLE', 5: 'ENCODING', 6: 'NO_MODIFICATION_ALLOWED', 7: 'INVALID_STATE', 8: 'SYNTAX', 9: 'INVALID_MODIFICATION', 10: 'QUOTA_EXCEEDED', 11: 'TYPE_MISMATCH', 12: 'PATH_EXISTS' }
    return `FileError code=${err.code} (${codes[err.code] || 'unknown'})`
  }
  return err.message || String(err)
}

function resolveLocalUrl (uri) {
  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(uri, resolve, reject)
  })
}

function readFileEntryAsText (fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file((file) => {
      const reader = new FileReader()
      reader.onload = () => resolve({
        name: file.name || 'track.gpx',
        text: reader.result
      })
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'))
      reader.readAsText(file)
    }, reject)
  })
}

async function readViaSaf (uri) {
  const saf = window.cordova?.plugins?.safMediastore
  if (!saf?.readFile) throw new Error('cordova.plugins.safMediastore.readFile not available')

  const buffer = await saf.readFile(uri)
  const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer))

  let name = 'track.gpx'
  if (typeof saf.getFileName === 'function') {
    try {
      name = (await saf.getFileName(uri)) || name
    } catch (err) {
      console.warn('safMediastore.getFileName failed', err)
    }
  }
  return { name, text }
}

async function readUriAsText (uri) {
  try {
    const fileEntry = await resolveLocalUrl(uri)
    return await readFileEntryAsText(fileEntry)
  } catch (primaryErr) {
    console.warn('Direct URI resolve failed:', describeFileError(primaryErr), 'uri=', uri)
    if (!uri.startsWith('content://')) throw primaryErr
    return await readViaSaf(uri)
  }
}

async function handleIntent (intent, router) {
  if (!looksLikeGpx(intent)) return
  const uri = getIntentUri(intent)
  if (!uri) {
    console.warn('GPX intent has no URI', intent)
    return
  }

  try {
    const { name, text } = await readUriAsText(uri)
    if (!text.includes('<gpx')) {
      console.warn('URI does not contain GPX content', uri)
      return
    }
    useGpxIntakeStore().setText(text, name)
    await router.isReady()
    router.push({ name: 'gpx-import' })
  } catch (err) {
    console.error('Failed to process GPX intent:', describeFileError(err), 'uri=', uri)
  }
}

export default boot(({ router }) => {
  if (!Platform.is.cordova) return

  document.addEventListener('deviceready', () => {
    const shim = window.plugins?.intentShim
    if (!shim) {
      console.warn('intentShim plugin not available; GPX intents disabled')
      return
    }

    if (typeof shim.getIntent === 'function') {
      shim.getIntent(
        (intent) => handleIntent(intent, router),
        (err) => console.warn('getIntent error', err)
      )
    }
    if (typeof shim.onIntent === 'function') {
      shim.onIntent((intent) => handleIntent(intent, router))
    }
  }, false)
})
