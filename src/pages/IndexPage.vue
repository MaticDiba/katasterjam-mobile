<template>
  <PageFullScreen style="background: #eee">
    <ol-map ref="map"
      loadTilesWhileAnimating loadTilesWhileInteracting style="height:100%;">

      <ol-view
        ref="view"
        :enableRotation="false"
        :center="center"
        :zoom="zoom"
        :projection="projection"
        @zoomChanged="zoomChanged"
        @centerChanged="centerChanged"
        @resolutionChanged="resolutionChanged"/>
      <CartoLayers ref="layerComponentRef" :view="view" :map="map"/>
      <LocationLayers ref="childComponentRef" :view="view"/>
    </ol-map>

    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab :icon="btnIcon" color="accent" @click="buttonClicked" />
    </q-page-sticky>
    <q-page-sticky position="bottom-right" :offset="[18, 100]">
      <q-btn fab icon="start" color="accent" @click="startClicked" />
    </q-page-sticky>
  </PageFullScreen>
</template>

<script>
import { ref, defineComponent } from 'vue'
import PageFullScreen from 'layouts/PageFullScreen.vue'
import CartoLayers from 'src/components/map/layers/CartoLayers.vue'
import LocationLayers from 'src/components/map/layers/LocationLayers.vue'
export default defineComponent({
  name: 'IndexPage',
  components: { PageFullScreen, CartoLayers, LocationLayers },
  setup () {
    const center = ref([1637531.7171455352, 5766419.270826726])
    const projection = ref('EPSG:3857')
    // const center = ref([624000.0 - 195000.00999999978, 373999.95999999996 - 31000.490000000224])
    // const projection = ref('EPSG:3794')
    const zoom = ref(8)

    const childComponentRef = ref(null)
    const layerComponentRef = ref(null)

    const view = ref('')
    const map = ref('')
    return {
      center,
      projection,
      zoom,
      view,
      childComponentRef,
      layerComponentRef,
      map
    }
  },
  data () {
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
    startClicked () {
      this.layerComponentRef.test()
    },
    resolutionChanged (resolution) {
      this.currentResolution = resolution
    },
    centerChanged (center) {
      this.currentCenter = center
      // console.info(center)
    }
  }
})
</script>
