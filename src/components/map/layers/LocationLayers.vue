<template>
  <ol-vector-layer>
    <ol-source-vector :features="myLocation">
    </ol-source-vector>
  </ol-vector-layer>

  <ol-vector-layer>
    <ol-source-vector>
        <ol-feature>
            <ol-geom-line-string :coordinates="myTrack"></ol-geom-line-string>
            <ol-style>
              <ol-style-stroke :color="strokeColor" :width="strokeWidth"></ol-style-stroke>
            </ol-style>
        </ol-feature>
    </ol-source-vector>
  </ol-vector-layer>
</template>
<script>
import { fromLonLat } from 'ol/proj'
import Point from 'ol/geom/Point'
import { Feature } from 'ol'
import { circular } from 'ol/geom/Polygon'
import { ref } from 'vue'
export default {
  props: ['view'],
  setup () {
    const radius = ref(40)
    const strokeWidth = ref(5)
    const strokeColor = ref('red')
    const fillColor = ref('white')
    const myLocation = ref([])
    const myTrack = ref([])
    return {
      radius,
      strokeWidth,
      strokeColor,
      fillColor,
      myLocation,
      myTrack
    }
  },
  data () {
    return {
    }
  },
  methods: {
    startTracking (locationTrackingStarted) {
      console.log('extent', this.view.calculateExtent())
      if (this.$q.platform.is.cordova) {
        if (!locationTrackingStarted) {
          window.BackgroundGeolocation.stop()
          this.myLocation = []
          this.myTrack = []

          return
        }
        try {
          window.BackgroundGeolocation.configure({
            locationProvider: window.BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
            desiredAccuracy: window.BackgroundGeolocation.MEDIUM_ACCURACY,
            stationaryRadius: 10,
            distanceFilter: 10, // only when using location provider: DISTANCE_FILTER_PROVIDER
            stopOnTerminate: true,
            notificationTitle: 'Location tracking',
            notificationText: 'Vaša lokacija se beleži v ozadju',
            debug: true,
            startForeground: true,
            notificationsEnabled: true,
            httpHeaders: { 'X-Auth': 'če ga rabiš' },
            interval: 5000, // only when using location provider: ACTIVITY_PROVIDER
            fastestInterval: 2000, // only when using location provider: ACTIVITY_PROVIDER
            activitiesInterval: 1000 // only when using location provider: ACTIVITY_PROVIDER
            // url: 'https://katasterjam.si/api/track',
            // syncUrl: 'https://katasterjam.si/api/sync'
          })

          window.BackgroundGeolocation.on('authorization', (status) => {
            if (status !== window.BackgroundGeolocation.AUTHORIZED) {
              setTimeout(() => {
                navigator.notification.confirm('Prosimo vključite dostop do lokacije', b => {
                  if (b === 1) {
                    window.BackgroundGeolocation.showAppSettings()
                  }
                }, 'Kataster jam')
              }, 1000)
            }
          })
          window.BackgroundGeolocation.on('location', (loc) => {
            console.log('location changed', loc.latitude, loc.longitude, loc.accuracy)
            const coords = fromLonLat([loc.longitude, loc.latitude])
            const accuracy = circular([loc.longitude, loc.latitude], loc.accuracy)
            this.myLocation = [
              new Feature(accuracy.transform('EPSG:4326', this.view.getProjection())),
              new Feature(new Point(coords))
            ]
            this.myTrack.push(coords)
          })

          window.BackgroundGeolocation.start()
        } catch (e) {
          console.error(e)
        }
      }
    }
  }
}
</script>
