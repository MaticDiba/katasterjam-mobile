import { boot } from 'quasar/wrappers'
import TileState from 'ol/TileState'

const apiUrl = process.env.API_URL || 'http://localhost:5001'

function headersToObject (headers) {
  const obj = {}
  headers.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

class FetchError extends Error {
  constructor (message, response) {
    super(message)
    this.name = 'FetchError'
    this.response = response
  }
}

class FetchClient {
  constructor (baseURL, defaultHeaders = {}) {
    this.baseURL = baseURL
    this.defaultHeaders = { ...defaultHeaders }
  }

  setHeader (name, value) {
    this.defaultHeaders[name] = value
  }

  removeHeader (name) {
    delete this.defaultHeaders[name]
  }

  _mergeHeaders (perRequest = {}) {
    const merged = { ...this.defaultHeaders }
    for (const [key, value] of Object.entries(perRequest)) {
      if (value === null || value === undefined) {
        delete merged[key]
      } else {
        merged[key] = value
      }
    }
    return merged
  }

  async _request (method, url, { params, data, headers, signal, responseType } = {}) {
    const requestUrl = new URL(url, this.baseURL)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestUrl.searchParams.append(key, value)
        }
      })
    }

    const isFormData = data instanceof FormData
    const mergedHeaders = this._mergeHeaders(headers)

    if (isFormData) {
      delete mergedHeaders['Content-Type']
    }

    const fetchOptions = {
      method,
      headers: mergedHeaders,
      signal
    }

    if (data !== undefined && data !== null) {
      fetchOptions.body = isFormData ? data : JSON.stringify(data)
    }

    const response = await fetch(requestUrl.toString(), fetchOptions)
    const responseHeaders = headersToObject(response.headers)

    let responseData
    if (responseType === 'arraybuffer') {
      responseData = await response.arrayBuffer()
    } else if (responseType === 'blob') {
      responseData = await response.blob()
    } else {
      const text = await response.text()
      try {
        responseData = text ? JSON.parse(text) : null
      } catch {
        responseData = text
      }
    }

    const result = {
      data: responseData,
      status: response.status,
      headers: responseHeaders
    }

    if (!response.ok) {
      throw new FetchError(`Request failed with status ${response.status}`, result)
    }

    return result
  }

  async get (url, options = {}) {
    return this._request('GET', url, options)
  }

  async post (url, data, options = {}) {
    return this._request('POST', url, { ...options, data })
  }

  async put (url, data, options = {}) {
    return this._request('PUT', url, { ...options, data })
  }

  async delete (url, options = {}) {
    return this._request('DELETE', url, options)
  }

  async getTileImage (tile, tileUrl, useAuth = false) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const headers = useAuth ? {} : { Authorization: null }
      const response = await this.get(tileUrl, {
        responseType: 'arraybuffer',
        headers,
        signal: controller.signal
      })
      const blob = new Blob([response.data], { type: 'image/png' })
      const blobUrl = URL.createObjectURL(blob)
      const img = tile.getImage()
      const cleanup = () => URL.revokeObjectURL(blobUrl)
      img.addEventListener('load', cleanup, { once: true })
      img.addEventListener('error', cleanup, { once: true })
      img.src = blobUrl
    } catch (error) {
      tile.setState(TileState.ERROR)
    } finally {
      clearTimeout(timer)
    }
  }
}

const api = new FetchClient(apiUrl, {
  'Content-Type': 'application/json'
})

export default boot(({ app }) => {
  app.config.globalProperties.$api = api
})

export { api, apiUrl }
