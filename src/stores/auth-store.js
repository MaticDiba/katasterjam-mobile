import { defineStore } from 'pinia'
import jwtDecode from 'jwt-decode'
import { api } from 'src/boot/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')),
    token: JSON.parse(localStorage.getItem('token')),
    initialized: false
  }),
  getters: {
    getUser: (state) => state.user,
    getRole: (state) => {
      const tokenData = jwtDecode(state.token.accessToken)

      return tokenData.role
    },
    getOrganizationId: (state) => {
      const tokenData = jwtDecode(state.token.accessToken)

      return tokenData.organization
    },
    getAccessToken: (state) => {
      return state.token?.accessToken
    },
    getRefreshToken: (state) => {
      return state.token?.refreshToken
    },
    isAuthenticated: (state) => {
      if (state.token?.accessToken) {
        const { exp } = jwtDecode(state.token.accessToken)

        return new Date(exp * 1000) > Date.now()
      }

      return false
    }
  },
  actions: {
    async login (payload) {
      const result = await api
        .post('/api/auth/login', payload)
        .then((response) => {
          return response.data
        })
        .catch(function (error) {
          console.error('error sending login request: ', error)
          throw error
        })
      this.storeLoginResponse(result)

      this.setHeaderJWT()

      return result
    },
    async logOut () {
      this.clearData()
      this.setHeaderJWT()
    },
    async useRefreshToken () {
      const user = this.user
      const refreshToken = this.token?.refreshToken

      const payload = {
        refreshToken,
        userId: user.id
      }

      const result = await api
        .post('/api/auth/refresh-token', payload)
        .then((response) => {
          return response.data
        })
        .catch(function (error) {
          if (error.response) {
            return error.response.data
          } else {
            const temp = { success: false, message: ['Server Error!'] }
            return temp
          }
        })

      if (result.success) {
        this.storeLoginResponse(result)

        this.setHeaderJWT()
      }

      return result.success
    },
    async init () {
      let isTokenValid = false
      if (this.token?.accessToken) {
        isTokenValid = await this.validateToken()
      }

      if (!isTokenValid) {
        this.clearData()
      }

      this.initialized = true
    },
    async validateToken () {
      const { exp } = jwtDecode(this.token?.accessToken)
      const daysUntilRefresh = (new Date(exp * 1000) - (Date.now())) / (1000 * 3600 * 24)

      this.setHeaderJWT()
      if (daysUntilRefresh < 15) {
        return await this.useRefreshToken()
      }

      return true
    },
    setHeaderJWT () {
      const tempToken = this.token?.accessToken
      if (tempToken) {
        api.setHeader('Authorization', 'Bearer ' + tempToken)
      } else {
        api.removeHeader('Authorization')
      }
    },
    storeLoginResponse (payload) {
      const token = {
        accessToken: payload.token,
        refreshToken: payload.refreshToken
      }
      localStorage.setItem('user', JSON.stringify(payload.user))
      localStorage.setItem('token', JSON.stringify(token))
      this.user = payload.user
      this.token = token
    },
    clearData () {
      this.user = {}
      this.token = {}
      localStorage.removeItem('lastImportCustomLocations')
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    }
  }
})
