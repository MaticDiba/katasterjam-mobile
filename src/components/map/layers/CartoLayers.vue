<template>
  <ol-tile-layer>
    <ol-source-osm ref="osmSource"/>
  </ol-tile-layer>
  <CustomWMTSLayer v-for="layer in mapStore.getLayers" :key="layer.name" :layer="layer"/>
  <ol-vector-layer ref="cavesSource">
      <ol-style>
        <ol-style-circle :radius="radius">
          <ol-style-fill :color="fill"></ol-style-fill>
          <ol-style-stroke
            :color="stroke"
            :width="strokeWidth"
          ></ol-style-stroke>
        </ol-style-circle>
      </ol-style>
    </ol-vector-layer>
</template>

<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMapStore } from 'stores/map-store'
import CustomWMTSLayer from './CustomWMTSLayer.vue'
import { MVT } from 'ol/format'
import { db } from 'src/db/db'
import { api } from 'src/boot/api'

export default {
  components: { CustomWMTSLayer },
  setup () {
    const mapStore = useMapStore()
    const skyViewLayer = ref(null)
    const orthoPhotoLayer = ref(null)
    const cavesSource = ref(null)
    const osmSource = ref(null)
    const mvtFormat = new MVT()
    const radius = ref(5)
    const strokeWidth = ref(0.5)
    const stroke = ref('black')
    const fill = ref('rgba(255, 50, 28, 0.6)')
    const highlightedFeatures = ref([])

    const { isSkyViewActive, isOrthoPhotoActive, getOrthoPhoto } = storeToRefs(mapStore)
    return {
      skyViewLayer,
      orthoPhotoLayer,
      isSkyViewActive,
      isOrthoPhotoActive,
      mapStore,
      getOrthoPhoto,
      osmSource,
      cavesSource,
      mvtFormat,
      radius,
      strokeWidth,
      stroke,
      fill,
      highlightedFeatures
    }
  },
  watch: {
    isSkyViewActive (newValue, _oldValue) {
      this.skyViewLayer.tileLayer.setVisible(newValue)
    }
  },
  async mounted () {
    this.osmSource.source?.setTileLoadFunction(async (tile, url) => {
      const image = tile.getImage()
      const sanitizedUrl = url.replace(/^(https?:\/\/)[abc]\./, '$1')
      const storedTile = await db.tiles.where('tileKey')
        .equals(sanitizedUrl)
        .first()
      if (!storedTile) {
        api.getTileImage(tile, url)

        return
      }
      const objUrl = URL.createObjectURL(storedTile.image)
      image.onload = function () {
        URL.revokeObjectURL(objUrl)
      }
      image.src = objUrl
    })
    this.mapStore.getCavesLayerSource().then(source => {
      this.cavesSource.vectorLayer.setSource(source)
    })
  }
}
</script>
