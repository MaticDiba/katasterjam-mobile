<template>
  <ol-vector-layer :zIndex="1100">
    <ol-source-vector :features="visibleFeatures" />
  </ol-vector-layer>
</template>

<script>
import { ref, watch } from 'vue'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Circle from 'ol/style/Circle'
import Fill from 'ol/style/Fill'
import { useLocalGpxStore } from 'stores/local-gpx-store'

const LINE_STYLE = new Style({
  stroke: new Stroke({ color: '#1e88e5', width: 4 })
})
const POINT_STYLE = new Style({
  image: new Circle({
    radius: 5,
    fill: new Fill({ color: '#1e88e5' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 })
  })
})

function styleFeature (feature) {
  const type = feature.getGeometry()?.getType()
  if (type === 'Point') {
    feature.setStyle(POINT_STYLE)
  } else {
    feature.setStyle(LINE_STYLE)
  }
}

export default {
  name: 'GpxLayers',
  setup () {
    const store = useLocalGpxStore()
    const visibleFeatures = ref([])
    const featureCache = new Map()

    async function loadForId (externalId) {
      if (featureCache.has(externalId)) return featureCache.get(externalId)
      const parsed = await store.loadParsed(externalId)
      if (!parsed) return []
      parsed.features.forEach(styleFeature)
      featureCache.set(externalId, parsed.features)
      return parsed.features
    }

    async function rebuild () {
      const ids = store.getVisibleIds
      const all = []
      for (const id of ids) {
        const features = await loadForId(id)
        all.push(...features)
      }
      visibleFeatures.value = all
    }

    watch(() => [...store.getVisibleIds], () => {
      rebuild()
    }, { immediate: true })

    store.refresh()

    return {
      store,
      visibleFeatures
    }
  }
}
</script>
