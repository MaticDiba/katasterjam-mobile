import { defineStore } from 'pinia'
import { Platform } from 'quasar'
import { api } from 'src/boot/api'

export const useCavesStore = defineStore('caves', {
  state: () => ({
    caves: [],
    searchParameters: {
      query: '',
      pageNumber: 1,
      x: null,
      y: null,
      sort: null,
      sortDirection: null
    },
    totalPages: 0,
    searching: false,
    searchAbort: new AbortController()
  }),

  getters: {
    getCaves (state) {
      return state.caves
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
    setLocationParameters (params) {
      this.searchParameters = params
    },
    addQueryParameter (query) {
      this.searchParameters.query = query
    },
    clearLocationParameters () {
      this.searchParameters = {
        query: this.searchParameters.query,
        pageNumber: 1
      }
    },
    incrementPageNumber () {
      this.searchParameters.pageNumber++
    },
    async searchForCaves () {
      if (this.searching) {
        this.searchAbort.abort()
      }
      this.searching = true
      this.searchAbort = new AbortController()
      try {
        const response = await api.get('/api/caves', {
          params: this.searchParameters,
          signal: this.searchAbort.signal
        })
        this.totalPages = JSON.parse(response.headers.pagination).totalPages
        if (this.searchParameters.pageNumber > 1) {
          response.data.map(cave => this.caves.push(cave))
        } else {
          this.caves = response.data
        }
      } catch (error) {
        console.error(error)
      } finally {
        this.searching = false
      }
    },
    async searchForNearbyCaves () {
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

          await this.searchForCaves()
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

          await this.searchForCaves()
        }, (error) => {
          console.log(error)
        })
      }
    }
  }
})
