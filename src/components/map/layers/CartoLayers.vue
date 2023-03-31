<template>
  <ol-tile-layer z-index="1">
    <ol-source-osm />
  </ol-tile-layer>
  <template v-for="layer in mapStore.getLayers" :key="layer.name">
    <CustomWMTSLayer :layer="layer" v-if="layer.active" />
  </template>
  <ol-tile-layer z-index="10">
    <ol-source-xyz url="https://services7.arcgis.com/V2VriwTjJDabpGg6/ArcGIS/rest/services/2022_marec_export_ekataster_tile_layer/MapServer/WMTS/tile/1.0.0/2022_marec_export_ekataster_tile_layer/default/default028mm/{z}/{y}/{x}.png"/>
  </ol-tile-layer>
</template>

<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMapStore } from 'stores/map-store'
import CustomWMTSLayer from './CustomWMTSLayer.vue'

export default {
  components: { CustomWMTSLayer },
  setup () {
    const mapStore = useMapStore()
    const skyViewLayer = ref(null)
    const orthoPhotoLayer = ref(null)
    const { isSkyViewActive, isOrthoPhotoActive, getOrthoPhoto } = storeToRefs(mapStore)

    return {
      skyViewLayer,
      orthoPhotoLayer,
      isSkyViewActive,
      isOrthoPhotoActive,
      mapStore,
      getOrthoPhoto
    }
  },
  watch: {
    isSkyViewActive (newValue, oldValue) {
      this.skyViewLayer.tileLayer.setVisible(newValue)
    }
  }
}
</script>
