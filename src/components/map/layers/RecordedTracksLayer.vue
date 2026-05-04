<template>
  <ol-vector-layer :zIndex="1101">
    <ol-source-vector :features="visibleFeatures" />
  </ol-vector-layer>
</template>

<script>
import { ref, watch } from 'vue'
import { fromLonLat } from 'ol/proj'
import Feature from 'ol/Feature'
import LineString from 'ol/geom/LineString'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import { db } from 'src/db/db'
import { useLocalTracksStore } from 'stores/local-tracks-store'
import { smoothPoints } from 'src/helpers/track-smoothing'

const DEFAULT_COLOR = '#e53935'

function buildLineStyle (color) {
  return new Style({
    stroke: new Stroke({ color: color || DEFAULT_COLOR, width: 4 })
  })
}

export default {
  name: 'RecordedTracksLayer',
  setup () {
    const store = useLocalTracksStore()
    const visibleFeatures = ref([])
    // Cache by trackId — completed tracks don't grow, so the feature can be
    // reused across toggles without re-querying trackPoints.
    const featureCache = new Map()

    async function buildFeatureForId (id) {
      if (featureCache.has(id)) return featureCache.get(id)
      const track = store.getTracks.find(t => t.id === id)
      if (!track) return null
      const points = await db.trackPoints
        .where('[trackId+timestamp]')
        .between([id, 0], [id, Infinity])
        .toArray()
      // Re-smooth on read so the rendered polyline matches the live one
      // and Kalman tuning can be changed without a DB migration.
      const smoothed = smoothPoints(points)
      if (smoothed.length < 2) return null
      const coords = smoothed.map(p => fromLonLat([p.lon, p.lat]))
      const feature = new Feature({ geometry: new LineString(coords) })
      feature.setStyle(buildLineStyle(track.color))
      feature.set('trackId', id)
      featureCache.set(id, feature)
      return feature
    }

    async function rebuild () {
      const ids = store.getVisibleIds
      const features = []
      for (const id of ids) {
        const f = await buildFeatureForId(id)
        if (f) features.push(f)
      }
      visibleFeatures.value = features
    }

    watch(() => [...store.getVisibleIds], rebuild, { immediate: true })

    store.refresh().catch(() => {})

    return { store, visibleFeatures }
  }
}
</script>
