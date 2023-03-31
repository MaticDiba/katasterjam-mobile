<template>
  <ol-tile-layer z-index="2" ref="layerRef">
  </ol-tile-layer>
</template>

<script>
import { ref } from 'vue'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import { WMTSCapabilities } from 'ol/format'
import { useMapStore } from 'stores/map-store'
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
      const wmtsParser = new WMTSCapabilities()
      const response = await fetch(layerData.url)
      const capText = await response.text()
      const capabilities = wmtsParser.read(capText)
      const optionsFromCap = optionsFromCapabilities(capabilities, {
        layer: layerData.layerName
      })
      const options = {
        projection: layerData.projection,
        ...optionsFromCap,
        attributions: [layerData.attributes],
        crossOrigin: 'anonymous'
      }
      this.wmtsSource = new WMTS(options)

      layerRef.tileLayer.setVisible(true)
      layerRef.tileLayer.setSource(this.wmtsSource)
    }
    await loadLayer(this.layer, this.layerRef)
  }
}
</script>
