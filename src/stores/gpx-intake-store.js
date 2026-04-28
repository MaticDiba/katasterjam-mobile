import { defineStore } from 'pinia'

export const useGpxIntakeStore = defineStore('gpx-intake', {
  state: () => ({
    pending: null
  }),
  actions: {
    setText (text, name, { defaultExcursionId = null } = {}) {
      this.pending = { text, name, defaultExcursionId }
    },
    consume () {
      const current = this.pending
      this.pending = null
      return current
    },
    clear () {
      this.pending = null
    }
  }
})
