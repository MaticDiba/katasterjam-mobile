<template>
  <PageFullScreen style="background: #eee">
    <ol-map loadTilesWhileAnimating loadTilesWhileInteracting style="height:100%;">

      <ol-view
        ref="view"
        :enableRotation="false"
        :center="center"
        :zoom="zoom"
        :projection="projection"
        @zoomChanged="zoomChanged"
        @centerChanged="centerChanged"
        @resolutionChanged="resolutionChanged"/>
      <CartoLayers/>
      <LocationLayers ref="childComponentRef" :view="view"/>

      <ol-vector-layer>
        <ol-source-vector :features="markLocations">
        </ol-source-vector>
      </ol-vector-layer>
    </ol-map>

    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab :icon="btnIcon" color="accent" @click="buttonClicked" />
    </q-page-sticky>
  </PageFullScreen>
</template>

<script>
import { ref, defineComponent } from 'vue'
import { fromLonLat } from 'ol/proj'
import Point from 'ol/geom/Point'
import { Feature } from 'ol'
import PageFullScreen from 'layouts/PageFullScreen.vue'
import CartoLayers from 'src/components/map/layers/CartoLayers.vue'
import LocationLayers from 'src/components/map/layers/LocationLayers.vue'
export default defineComponent({
  name: 'IndexPage',
  components: { PageFullScreen, CartoLayers, LocationLayers },
  setup () {
    const center = ref([1637531, 5766419])
    const projection = ref('EPSG:3857')
    const zoom = ref(8)
    const markLocations = ref([])

    const childComponentRef = ref(null)

    const view = ref('')
    return {
      center,
      projection,
      zoom,
      view,
      childComponentRef,
      markLocations
    }
  },
  data () {
    if (this.$route.query.lat && this.$route.query.lng) {
      const coords = fromLonLat([this.$route.query.lng, this.$route.query.lat])
      const mark = new Feature(new Point(coords))
      this.markLocations = [mark]
      this.center = coords
      this.zoom = 15
    }

    return {
      currentCenter: this.center,
      currentZoom: this.zoom,
      currentResolution: this.resolution,
      btnIcon: 'radio_button_checked'
    }
  },
  methods: {
    zoomChanged (currentZoom) {
      this.currentZoom = currentZoom
    },
    buttonClicked (evt) {
      this.locationTrackingStarted = !this.locationTrackingStarted

      this.btnIcon = this.locationTrackingStarted ? 'stop_circle' : 'radio_button_checked'

      this.childComponentRef.startTracking(this.locationTrackingStarted)
    },
    resolutionChanged (resolution) {
      this.currentResolution = resolution
    },
    centerChanged (center) {
      this.currentCenter = center
    }
  }
})
</script>
