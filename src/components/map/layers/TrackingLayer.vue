<template>
  <ol-vector-layer>
    <ol-source-vector>
      <ol-feature v-if="visible">
        <ol-geom-line-string :coordinates="myTrack"></ol-geom-line-string>
          <ol-style>
            <ol-style-stroke :color="strokeColor" :width="strokeWidth"></ol-style-stroke>
          </ol-style>
      </ol-feature>
    </ol-source-vector>
  </ol-vector-layer>
</template>

<script>
import { ref } from 'vue'
import { useLocationStore } from 'stores/location-store'

export default {
  setup () {
    const store = useLocationStore()
    const strokeWidth = ref(5)

    return {
      store,
      strokeWidth
    }
  },
  computed: {
    myTrack () {
      return this.store.getMyTrack
    },
    strokeColor () {
      return this.store.activeTrackColor || 'red'
    },
    visible () {
      return this.store.getLocationTracking && this.myTrack.length > 1
    }
  }
}
</script>
