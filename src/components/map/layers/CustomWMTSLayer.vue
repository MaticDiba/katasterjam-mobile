<template>
  <ol-tile-layer ref="layerRef">
  </ol-tile-layer>
</template>

<script>
import { ref } from 'vue'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import TileState from 'ol/TileState'
import { useMapStore } from 'stores/map-store'
import { db } from 'src/db/db'
import { api } from 'src/boot/api'
export default {
  props: { layer: Object },
  setup () {
    const mapStore = useMapStore()
    const layerRef = ref(null)

    return {
      layerRef,
      mapStore
    }
  },
  async mounted () {
    const loadLayer = async (layerData, layerRef) => {
      const capabilitiesText = localStorage.getItem(`cap-${layerData.label}`)
      const capabilities = JSON.parse(capabilitiesText.replace(/http:\/\//g, 'https://'))
      const optionsFromCap = optionsFromCapabilities(capabilities, {
        layer: layerData.layerName
      })
      const options = {
        projection: layerData.projection,
        ...optionsFromCap,
        attributions: [layerData.attributes],
        crossOrigin: 'anonymous'
      }
      options.tileLoadFunction = async (imageTile, src) => {
        if (this.layerRef?.tileLayer?.getVisible() === false) {
          imageTile.setState(TileState.ERROR)
          return
        }
        const image = imageTile.getImage()
        const storedTile = await db.tiles.where('tileKey')
          .equals(src)
          .first()
        if (this.layerRef?.tileLayer?.getVisible() === false) {
          imageTile.setState(TileState.ERROR)
          return
        }
        if (!storedTile) {
          api.getTileImage(imageTile, src, true)

          return
        }
        const objUrl = URL.createObjectURL(storedTile.image)
        image.onload = function () {
          URL.revokeObjectURL(objUrl)
        }
        image.src = objUrl
      }
      const wmtsSource = new WMTS(options)
      this.mapStore.setSource(layerData, wmtsSource)

      layerRef.tileLayer.setVisible(this.layer.active)
      layerRef.tileLayer.setSource(wmtsSource)
    }
    await loadLayer(this.layer, this.layerRef)
  },
  watch: {
    layer: {
      deep: true,
      handler: function (newVal, oldVal) {
        this.layerRef.tileLayer.setVisible(newVal.active)
      }
    }
  }
}
</script>
