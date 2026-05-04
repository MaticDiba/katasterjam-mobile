<template>
  <router-view />
</template>

<script>
import { defineComponent, watch } from 'vue'
import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import { useAuthStore } from 'stores/auth-store'
import { useLocationStore } from 'stores/location-store'
import { useLocalCustomLocationStore } from 'stores/local-custom-location-store'
import { useLocalGpxStore } from 'stores/local-gpx-store'
import { useLocalTracksStore } from 'stores/local-tracks-store'
import { useLocalExcursionsStore } from 'stores/local-excursion-store'
import { initNetworkStatus, onOnline, isOnline } from 'src/helpers/network'

proj4.defs('EPSG:3912', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=bessel +towgs84=426.9,142.6,460.1,4.91,4.49,-12.42,17.1 +units=m +no_defs')
proj4.defs('EPSG:102060', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=bessel +towgs84=426.62,142.62,460.09,4.98,4.49,-12.42,-17.1 +units=m +no_defs +type=crs')
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs')
proj4.defs('EPSG:3794', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')
register(proj4)

export default defineComponent({
  name: 'App',
  setup () {
    const store = useAuthStore()
    const locationStore = useLocationStore()
    const localCustomLocationStore = useLocalCustomLocationStore()
    const localGpxStore = useLocalGpxStore()
    const localTracksStore = useLocalTracksStore()
    const localExcursionsStore = useLocalExcursionsStore()

    // One-time backfill: clear the incremental-sync timestamps so the next
    // fetch returns the full server set. Bump the key version to force again.
    const SYNC_MIGRATION_KEY = 'syncTimestampMigration_v1_done'
    if (!localStorage.getItem(SYNC_MIGRATION_KEY)) {
      localStorage.removeItem('lastImportCustomLocations')
      localStorage.removeItem('lastImportExcursions')
      localStorage.setItem(SYNC_MIGRATION_KEY, '1')
    }

    initNetworkStatus()
    const runReconcile = () => {
      Promise.allSettled([
        localCustomLocationStore.tryFetchCustomLocationsForOffline(),
        localExcursionsStore.tryFetchExcursionsForOffline(),
        localCustomLocationStore.sync(),
        localGpxStore.sync(),
        localTracksStore.sync()
      ]).then(results => {
        results.forEach(r => {
          if (r.status === 'rejected') console.error('reconcile failed', r.reason)
        })
      })
    }
    onOnline(() => {
      if (store.initialized && store.isAuthenticated) runReconcile()
    })
    let startupSyncDone = false
    watch(
      () => store.initialized && store.isAuthenticated && isOnline.value,
      (ready) => {
        if (ready && !startupSyncDone) {
          startupSyncDone = true
          runReconcile()
        }
      },
      { immediate: true }
    )

    document.addEventListener('pause', (ev) => {
      const locationStore = useLocationStore()
      locationStore.clearWatches()
    }, false)
    document.addEventListener('resume', (ev) => {
      const locationStore = useLocationStore()
      locationStore.initCompassAndLocation()
      // If the OS killed the bg service while we were paused, surface it to the user.
      locationStore.checkForInterruptedTrack().catch(e => console.error('recovery check failed', e))
    }, false)

    locationStore.initCompassAndLocation()
    // First-boot recovery check: app crashed mid-recording last session.
    locationStore.checkForInterruptedTrack().catch(e => console.error('recovery check failed', e))
    return {
      store
    }
  },
  beforeCreate () {
    this.store.init()
  }
})
</script>
