import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'

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
    totalPages: 0
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
      const response = await api.get('/api/caves', {
        params: this.searchParameters
      })
      this.totalPages = JSON.parse(response.headers.pagination).totalPages
      if (this.searchParameters.pageNumber > 1) {
        response.data.map(cave => this.caves.push(cave))
      } else {
        this.caves = response.data
      }
    }
  }
})
