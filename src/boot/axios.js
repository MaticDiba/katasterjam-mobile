import { boot } from 'quasar/wrappers'
import axios from 'axios'
import TileState from 'ol/TileState'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
const apiUrl = process.env.API_URL || 'http://localhost:5000'
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})
api.getTileImage = async function (tile, tileUrl, useAuth = false) {
  try {
    const headers = useAuth ? {} : { Authorization: null }
    const response = await this.get(tileUrl, {
      responseType: 'arraybuffer',
      headers
    })
    const blob = new Blob([response.data], { type: 'image/png' })
    const blobUrl = URL.createObjectURL(blob)
    tile.getImage().src = blobUrl
  } catch (error) {
    tile.setState(TileState.ERROR)
  }
}

export default boot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
})

export { api, apiUrl }
