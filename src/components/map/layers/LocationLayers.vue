<template>
  <ol-vector-layer>
    <ol-source-vector :features="myLocationFeatures">
    </ol-source-vector>
  </ol-vector-layer>
  <ol-vector-layer>
    <ol-source-vector :features="clickFeature">
    </ol-source-vector>
  </ol-vector-layer>
  <ol-overlay :position="myLocationCoordinates" :positioning="'center-center'" v-if="myLocationFeatures.length > 0">
    <template v-slot="slotProps">
      <q-icon name="navigation" :class="slotProps" :style="{ rotate: rotation + 'deg' }" size="lg" />
    </template>
  </ol-overlay>
  <TrackingLayer/>
  <NavigationLayer />
</template>
<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import Point from 'ol/geom/Point'
import { Feature } from 'ol'
import { circular } from 'ol/geom/Polygon'
import TrackingLayer from './TrackingLayer.vue'
import NavigationLayer from './NavigationLayer.vue'
import { useLocationStore } from 'stores/location-store'
import { useMapStore } from 'stores/map-store'
export default {
  props: ['view'],
  components: { TrackingLayer, NavigationLayer },
  setup () {
    const store = useLocationStore()
    const mapStore = useMapStore()
    const clickFeature = ref([])
    const { myLocation } = storeToRefs(store)
    const { clickLocation } = storeToRefs(mapStore)

    return {
      store,
      myLocation,
      clickFeature,
      clickLocation
    }
  },
  computed: {
    rotation () {
      return this.store.getRotation
    },
    hasMyLocation () {
      return Array.isArray(this.myLocation?.coordinates) && this.myLocation.coordinates.length === 2
    },
    myLocationCoordinates () {
      return this.hasMyLocation ? this.myLocation.coordinates : []
    },
    myLocationFeatures () {
      if (!this.hasMyLocation) return []
      const accuracy = circular(
        [this.myLocation.longitude, this.myLocation.latitude],
        this.store.getMyLocationAccuracy
      )
      return [
        new Feature(accuracy.transform('EPSG:4326', this.store.getProjection)),
        new Feature(new Point(this.store.getMyLocationCoordinates))
      ]
    }
  },
  watch: {
    clickLocation (newValue, oldValue) {
      if (newValue) {
        this.clickFeature = [new Feature(new Point(newValue))]
      } else {
        this.clickFeature = []
      }
    }
  }
}
</script>
