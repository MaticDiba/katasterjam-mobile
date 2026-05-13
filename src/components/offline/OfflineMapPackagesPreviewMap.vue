<template>
  <ol-map
    ref="mapRef"
    loadTilesWhileAnimating
    loadTilesWhileInteracting
    :style="{ height }"
    @singleclick="onMapClick"
  >
    <ol-view
      ref="viewRef"
      :enableRotation="false"
      :center="initialCenter"
      :zoom="initialZoom"
      :projection="projection"
    />
    <ol-tile-layer>
      <ol-source-osm />
    </ol-tile-layer>
    <ol-vector-layer ref="vectorLayerRef">
      <ol-source-vector ref="sourceRef" />
    </ol-vector-layer>
  </ol-map>
</template>

<script>
import { ref } from 'vue'
import { fromLonLat } from 'ol/proj'
import Feature from 'ol/Feature'
import Polygon from 'ol/geom/Polygon'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'

const SELECTED_STROKE = 'rgba(255, 87, 34, 0.95)'
const SELECTED_FILL = 'rgba(255, 87, 34, 0.18)'
const NORMAL_STROKE = 'rgba(33, 150, 243, 0.75)'
const NORMAL_FILL = 'rgba(33, 150, 243, 0.08)'

function hasValidExtent (pkg) {
  return Number.isFinite(pkg?.minLon) && Number.isFinite(pkg?.minLat) &&
    Number.isFinite(pkg?.maxLon) && Number.isFinite(pkg?.maxLat) &&
    pkg.maxLon > pkg.minLon && pkg.maxLat > pkg.minLat
}

function bboxToPolygon (pkg) {
  const sw = fromLonLat([pkg.minLon, pkg.minLat])
  const nw = fromLonLat([pkg.minLon, pkg.maxLat])
  const ne = fromLonLat([pkg.maxLon, pkg.maxLat])
  const se = fromLonLat([pkg.maxLon, pkg.minLat])
  return new Polygon([[sw, nw, ne, se, sw]])
}

export default {
  name: 'OfflineMapPackagesPreviewMap',
  props: {
    packages: { type: Array, default: () => [] },
    selectedId: { type: [Number, String], default: null },
    height: { type: String, default: '200px' }
  },
  emits: ['update:selectedId'],
  setup () {
    const mapRef = ref(null)
    const viewRef = ref(null)
    const vectorLayerRef = ref(null)
    const sourceRef = ref(null)
    const projection = ref('EPSG:3857')
    const initialCenter = ref(fromLonLat([14.5, 46.05]))
    const initialZoom = ref(7)
    return { mapRef, viewRef, vectorLayerRef, sourceRef, projection, initialCenter, initialZoom }
  },
  watch: {
    packages: {
      handler () { this.rebuildFeatures() }
    },
    selectedId () {
      this.getOlMap()?.render()
      this.fitToSelected()
    }
  },
  mounted () {
    const layer = this.vectorLayerRef?.vectorLayer
    if (layer) {
      layer.setStyle((feature) => {
        const isSelected = feature.get('packageId') === this.selectedId
        return new Style({
          stroke: new Stroke({
            color: isSelected ? SELECTED_STROKE : NORMAL_STROKE,
            width: isSelected ? 3 : 1.5
          }),
          fill: new Fill({
            color: isSelected ? SELECTED_FILL : NORMAL_FILL
          })
        })
      })
    }
    this.rebuildFeatures()
  },
  methods: {
    getOlMap () { return this.mapRef?.map },
    getOlSource () { return this.sourceRef?.source },

    rebuildFeatures () {
      const source = this.getOlSource()
      if (!source) return
      source.clear()
      const features = this.packages
        .filter(hasValidExtent)
        .map(pkg => {
          const f = new Feature(bboxToPolygon(pkg))
          f.set('packageId', pkg.id)
          return f
        })
      if (features.length > 0) {
        source.addFeatures(features)
      }
      this.fitToAll()
    },

    fitToAll () {
      const source = this.getOlSource()
      const map = this.getOlMap()
      if (!source || !map || source.getFeatures().length === 0) return
      const size = map.getSize()
      if (!size || size[0] === 0 || size[1] === 0) return
      map.getView().fit(source.getExtent(), {
        size,
        padding: [20, 20, 20, 20],
        maxZoom: 13
      })
    },

    fitToSelected () {
      if (this.selectedId == null) return
      const source = this.getOlSource()
      const map = this.getOlMap()
      if (!source || !map) return
      const feature = source.getFeatures().find(f => f.get('packageId') === this.selectedId)
      if (!feature) return
      const size = map.getSize()
      if (!size || size[0] === 0 || size[1] === 0) return
      map.getView().fit(feature.getGeometry().getExtent(), {
        size,
        padding: [30, 30, 30, 30],
        maxZoom: 13,
        duration: 300
      })
    },

    onMapClick (event) {
      const map = this.getOlMap()
      if (!map) return
      const pid = map.forEachFeatureAtPixel(event.pixel, f => f.get('packageId'))
      if (pid != null && pid !== this.selectedId) {
        this.$emit('update:selectedId', pid)
      }
    }
  }
}
</script>
