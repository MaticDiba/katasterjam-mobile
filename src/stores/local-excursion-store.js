import { defineStore } from 'pinia'
import { api } from 'src/boot/api'
import { getLongDateNow } from 'src/helpers/date'
import { db } from 'src/db/db'

export const useLocalExcursionsStore = defineStore('local-excursions', {
  state: () => ({
    excursions: [],
    searchParameters: {
      query: '',
      pageNumber: 1,
      pageSize: 10,
      sort: '',
      sortDirection: null,
      my: false
    },
    totalPages: 0,
    searching: false,
    searchAbort: new AbortController()
  }),
  getters: {
    getExcursions (state) {
      return state.excursions
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
    addQueryParameter (query) {
      this.searchParameters.query = query
      this.searchParameters.pageNumber = 1
    },
    onlyMyExcursions (mine) {
      this.searchParameters.my = mine
      this.searchParameters.pageNumber = 1
    },
    incrementPageNumber () {
      this.searchParameters.pageNumber++
    },
    loadCustomLocations (excursions) {
      this.excursions = excursions
    },
    async get (id) {
      const result = await db.excursions.where('id').equals(parseInt(id)).first()

      return result
    },
    async put (excursion) {
      await db.excursions.put(excursion)
    },
    async tryFetchExcursionsForOffline () {
      this.searchParameters.lastUpdated = localStorage.getItem('lastImportExcursions')
      const dateNow = getLongDateNow()
      const searchParameters = {
        ...this.searchParameters,
        pageNumber: 0,
        pageSize: 500
      }
      let allPages = 1

      try {
        while (searchParameters.pageNumber < allPages) {
          searchParameters.pageNumber += 1
          const response = await api.get('/api/excursions', {
            params: searchParameters
          })

          const pagination = JSON.parse(response.headers.pagination)
          allPages = pagination.totalPages
          const excursions = response.data

          if (excursions.length > 0) {
            await db.excursions.bulkPut(excursions)
            await this.search()
          }
        }

        localStorage.setItem('lastImportExcursions', dateNow)
      } catch (error) {
        console.error('Error occurred while searching for new excursions')
      }
    },
    async search () {
      let query = db.excursions.orderBy('dateOfExcursion').reverse()

      if (this.searchParameters.query && isNaN(this.searchParameters.query)) {
        const queryLower = this.searchParameters.query.toLowerCase()
        query = query.filter((item) => {
          if (item.name) {
            return item.name.toLowerCase().indexOf(queryLower) > -1
          }

          return false
        })
      }
      if (this.searchParameters.my) {
        query = query.filter((item) => {
          return item.meParticipant
        })
      }

      this.totalPages = Math.ceil(await query.count() / this.searchParameters.pageSize)
      const queryWithOffset = query
        .limit((this.searchParameters.pageNumber) * this.searchParameters.pageSize)
        .toArray()

      const localExcursions = await queryWithOffset
      this.loadCustomLocations(localExcursions)
    }
  }
})
