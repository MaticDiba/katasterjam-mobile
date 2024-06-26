import { defineStore } from 'pinia'
import { Platform } from 'quasar'
import { getDistance } from 'ol/sphere'
import * as olProj from 'ol/proj'
import { api } from 'src/boot/axios'
import { db } from 'src/db/db'
import { getLongDateNow } from 'src/helpers/date'
import { useAuthStore } from 'src/stores/auth-store'

import iconNewCave from '../assets/map/markers/x_yellow.png'
import iconBlowHole from '../assets/map/markers/x_purple.png'
import iconPoi from '../assets/map/markers/x_orange.png'
import iconNotCave from '../assets/map/markers/x_red.png'

export const useLocalCustomLocationStore = defineStore('local-custom-locations', {
  state: () => ({
    customLocations: [],
    customLocationsForMap: [],
    searchParameters: {
      query: '',
      lastUpdated: null,
      pageNumber: 1,
      pageSize: 10,
      sort: ''
    },
    locationIcons: {
      1: iconBlowHole,
      2: iconNewCave,
      3: iconPoi,
      4: iconNotCave
    },
    totalPages: 0
  }),
  getters: {
    getCustomLocations (state) {
      return state.customLocations
    },
    getCustomLocationsTypes (state) {
      return db.customLocationsTypes.toArray()
    },
    getCustomLocationsStatuses (state) {
      return db.customLocationsStatuses.toArray()
    },
    getTotalPages (state) {
      return state.totalPages
    },
    getPageNumber (state) {
      return state.searchParameters.pageNumber
    },
    getCurrentSort (state) {
      return state.searchParameters.sort
    }
  },
  actions: {
    clearLocationParameters () {
      this.searchParameters = {
        query: this.searchParameters.query,
        pageNumber: 1,
        pageSize: 10,
        sort: ''
      }
    },
    addQueryParameter (query) {
      this.searchParameters.query = query
    },
    incrementPageNumber () {
      this.searchParameters.pageNumber++
    },
    loadCustomLocations (customLocations) {
      this.customLocations = customLocations
    },
    async get (id) {
      const result = await db.customLocations.where('id').equals(parseInt(id)).first()

      return result
    },
    async put (customLocation) {
      await db.customLocations.put(customLocation)
    },
    async add (customLocation) {
      const authStore = useAuthStore()
      if (customLocation.organizations?.length === 0) {
        customLocation.organizations = [{
          id: authStore.getOrganizationId
        }]
      }

      const result = await db.customLocations.add(customLocation)

      return result
    },
    async tryFetchCustomLocationsForOffline () {
      this.searchParameters.lastUpdated = localStorage.getItem('lastImportCustomLocations')
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
          const response = await api.get('/api/customlocations', {
            params: searchParameters
          })

          const pagination = JSON.parse(response.headers.pagination)
          allPages = pagination.totalPages
          const customLocations = response.data

          if (customLocations.length > 0) {
            await db.customLocations.bulkPut(customLocations)
            await this.search()
          }
        }

        localStorage.setItem('lastImportCustomLocations', dateNow)
      } catch (error) {
        console.error('Error occured while searching for new custom locations')
      }
    },
    async fetchCustomLocationsTypes () {
      try {
        const response = await api.get('/api/customlocations/types', {
          params: this.searchParameters
        })
        await db.customLocationsTypes.bulkPut(response.data)
      } catch (error) {
        console.error('Error occured while searching for new custom location types')
      }
    },
    async fetchCustomLocationsStatuses () {
      try {
        const response = await api.get('/api/customlocations/statuses', {
          params: this.searchParameters
        })
        await db.customLocationsStatuses.bulkPut(response.data)
      } catch (error) {
        console.error('Error occured while searching for new custom location statuses')
      }
    },
    async search () {
      if (this.searchParameters.sort === 'distance') {
        await this.searchForNearby()
        return
      }
      let query = db.customLocations.orderBy('createdDate').reverse()

      if (this.searchParameters.query && isNaN(this.searchParameters.query)) {
        const queryLower = this.searchParameters.query.toLowerCase()
        query = query.filter((item) => {
          if (item.name) {
            return item.name.toLowerCase().indexOf(queryLower) > -1
          }

          return false
        })
      }

      this.totalPages = Math.ceil(await query.count() / this.searchParameters.pageSize)
      const queryWithOffset = query
        .limit((this.searchParameters.pageNumber) * this.searchParameters.pageSize)
        .toArray()

      const localCustomLocations = await queryWithOffset
      this.loadCustomLocations(localCustomLocations)
    },
    async searchForNearby () {
      if (this.searchParameters.sort !== 'distance') {
        this.searchParameters.sort = 'distance'
        this.searchParameters.pageNumber = 1
      }
      if (Platform.is.cordova) {
        window.BackgroundGeolocation.getCurrentLocation(async (location) => {
          const closestCustomLocations = await this.getClosestFor(location)

          this.loadCustomLocations(closestCustomLocations)
        }, (code, message) => {
          console.error('Error when trying to fetch location', code, message)
        }, {
          enableHighAccuracy: true
        })
      } else {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const closestCustomLocations = await this.getClosestFor(position.coords)

          this.loadCustomLocations(closestCustomLocations)
        }, (error) => {
          console.log(error)
        })
      }
    },
    async getClosestFor (coordinates) {
      const customLocations = (await db.customLocations.toArray()).map(customLocation => {
        const distance = getDistance([customLocation.lng, customLocation.lat], [coordinates.longitude, coordinates.latitude])
        return {
          ...customLocation,
          distance
        }
      })
      const skip = (this.searchParameters.pageNumber - 1) * this.searchParameters.pageSize
      this.totalPages = Math.ceil(await db.customLocations.count() / this.searchParameters.pageSize)

      return customLocations.sort((a, b) => a.distance - b.distance)
        .slice(skip, skip + this.searchParameters.pageSize)
    },
    async loadForMap () {
      this.customLocationsForMap = (await db.customLocations.toArray()).map(location => {
        location.latLng = olProj.fromLonLat([location.lng, location.lat])
        location.icon = this.locationIcons[location.typeId]

        return location
      })

      return this.customLocationsForMap
    },
    async uploadNew () {
      const authStore = useAuthStore()

      const localLocations = await db.customLocations
        .where('id')
        .equals(-1)
        .toArray()
      for (const localLocation of localLocations) {
        const newLocation = {
          ...localLocation,
          users: [{
            id: authStore.getUser.id
          }],
          locationStatusId: localLocation.statusId,
          locationTypeId: localLocation.typeId
        }
        try {
          const response = await api.post('/api/customlocations', newLocation)
          await db.customLocations.put(response.data)
        } catch (error) {
          console.error('Error while uploading new location', error)
        }
      }
    }
  }
})
