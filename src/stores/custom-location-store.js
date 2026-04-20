import { defineStore } from 'pinia'
import { api } from 'src/boot/api'
import { Platform } from 'quasar'
import * as olProj from 'ol/proj'

import iconNewCave from '../assets/map/markers/x_yellow.png'
import iconBlowHole from '../assets/map/markers/x_purple.png'
import iconPoi from '../assets/map/markers/x_orange.png'
import iconNotCave from '../assets/map/markers/x_red.png'

export const useCustomLocationStore = defineStore('custom-locations', {
  state: () => ({
    customLocations: [],
    customLocationsForMap: [],
    searchParameters: {
      query: '',
      pageNumber: 1,
      x: null,
      y: null,
      sort: null,
      sortDirection: null
    },
    locationIcons: {
      1: iconBlowHole,
      2: iconNewCave,
      3: iconPoi,
      4: iconNotCave
    },
    totalPages: 0,
    searching: false,
    searchAbort: new AbortController()
  }),
  getters: {
    getCustomLocations (state) {
      return state.customLocations
    },
    getCustomLocationsForMap (state) {
      return state.customLocationsForMap
    },
    getSearchParameters (state) {
      return state.searchParameters
    },
    getTotalPages (state) {
      return state.totalPages
    },
    getQuery (state) {
      return state.searchParameters.query
    },
    getPageNumber (state) {
      return state.searchParameters.pageNumber
    },
    getCurrentSort (state) {
      return state.searchParameters.sort
    },
    getSearchingStatus (state) {
      return state.searching
    }
  },
  actions: {
    clearLocationParameters () {
      this.searchParameters = {
        query: this.searchParameters.query,
        pageNumber: 1
      }
    },
    addQueryParameter (query) {
      this.searchParameters.query = query
    },
    incrementPageNumber () {
      this.searchParameters.pageNumber++
    },
    setLocationParameters (params) {
      this.searchParameters = params
    },
    async search () {
      if (this.searching) {
        this.searchAbort.abort()
      }
      this.searching = true
      this.searchAbort = new AbortController()
      try {
        const response = await api.get('/api/customlocations', {
          params: this.searchParameters,
          signal: this.searchAbort.signal
        })
        this.totalPages = JSON.parse(response.headers.pagination).totalPages
        if (this.searchParameters.pageNumber > 1) {
          response.data.map(customLocation => this.customLocations.push(customLocation))
        } else {
          this.customLocations = response.data
        }
      } catch (error) {
        console.error(error)
      } finally {
        this.searching = false
      }
    },
    async searchForNearby () {
      this.searching = true
      if (Platform.is.cordova) {
        window.BackgroundGeolocation.getCurrentLocation(async (location) => {
          this.query = ''
          this.setLocationParameters({
            ...this.getSearchParameters,
            query: this.query,
            y: location.latitude,
            x: location.longitude,
            sort: 'distance',
            sortDirection: 'asc',
            pageNumber: 1
          })

          await this.search()
        }, (code, message) => {
          console.error('Error when trying to fetch location', code, message)
        }, {
          enableHighAccuracy: true
        })
      } else {
        navigator.geolocation.getCurrentPosition(async (position) => {
          this.query = ''
          this.setLocationParameters({
            ...this.getSearchParameters,
            query: this.query,
            y: position.coords.latitude,
            x: position.coords.longitude,
            sort: 'distance',
            sortDirection: 'asc',
            pageNumber: 1
          }, (code, message) => {
            console.error('Error when trying to fetch location', code, message)
          }, {
            enableHighAccuracy: true
          })

          await this.search()
        }, (error) => {
          console.log(error)
        })
      }
    },
    async loadForMap () {
      try {
        const response = await api.get('/api/customlocations/map', {
          params: {},
          signal: this.searchAbort.signal
        })

        this.customLocationsForMap = response.data.map(location => {
          location.latLng = olProj.fromLonLat([location.lng, location.lat])
          location.icon = this.locationIcons[location.typeId]

          return location
        })
      } catch (error) {
        console.error(error)
      } finally {
        this.searching = false
      }
    }
  }
})
