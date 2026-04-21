<template>
  <CustomWMTSLayer v-for="layer in mapStore.getLayers" :key="layer.name" :layer="layer"/>
  <ol-vector-layer ref="cavesSource" name="caves">
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
import { ref, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { useMapStore } from 'stores/map-store'
import { useOfflineMapsStore } from 'stores/offline-maps-store'
import CustomWMTSLayer from './CustomWMTSLayer.vue'
import TileLayer from 'ol/layer/Tile'
import VectorTileLayer from 'ol/layer/VectorTile'
import { isOnline } from 'src/helpers/network'

export default {
  components: { CustomWMTSLayer },
  setup () {
    const mapStore = useMapStore()
    const offlineMapsStore = useOfflineMapsStore()
    const olMap = inject('map')
    const cavesSource = ref(null)
    const radius = ref(5)
    const strokeWidth = ref(0.5)
    const stroke = ref('black')
    const fill = ref('rgba(255, 50, 28, 0.6)')

    const { isSkyViewActive, isOrthoPhotoActive, getOrthoPhoto } = storeToRefs(mapStore)
    return {
      isOnline,
      isSkyViewActive,
      isOrthoPhotoActive,
      mapStore,
      offlineMapsStore,
      getOrthoPhoto,
      olMap,
      cavesSource,
      radius,
      strokeWidth,
      stroke,
      fill
    }
  },
  watch: {
    isSkyViewActive (newValue, _oldValue) {
      this.skyViewLayer?.tileLayer?.setVisible(newValue)
    },
    isOnline (online) {
      const map = this.getMap()
      if (!map) return

      const basemap = map.getLayers().getArray().find(l => l.get('name') === 'vector-basemap')
      const contours = map.getLayers().getArray().find(l => l.get('name') === 'vector-contours')

      if (online && !basemap) {
        this.initVectorBasemap(map)
      } else {
        if (basemap) basemap.setVisible(online)
        if (contours) contours.setVisible(online)
      }

      if (!online) {
        for (const [key, active] of Object.entries(this.offlineMapsStore.activeSources)) {
          if (active) {
            active.visible = true
            this.setOfflineLayerVisibility(key, true)
          }
        }
      }
    },
    'offlineMapsStore.activeSourcesSnapshot' (newSnapshot, oldSnapshot) {
      if (newSnapshot === oldSnapshot) return

      const newState = JSON.parse(newSnapshot)
      const oldState = oldSnapshot ? JSON.parse(oldSnapshot) : {}
      const newKeys = Object.keys(newState)
      const oldKeys = Object.keys(oldState)

      for (const key of newKeys) {
        if (!oldKeys.includes(key)) {
          this.addOfflineLayer(key)
        } else if (newState[key] !== oldState[key]) {
          this.setOfflineLayerVisibility(key, newState[key])
        }
      }

      for (const key of oldKeys) {
        if (!newKeys.includes(key)) {
          this.removeOfflineLayer(key)
        }
      }
    }
  },
  async mounted () {
    const map = this.getMap()
    if (map) {
      await this.initVectorBasemap(map)
    }
    for (const key of Object.keys(this.offlineMapsStore.activeSources)) {
      await this.addOfflineLayer(key)
    }
    this.mapStore.getCavesLayerSource().then(source => {
      this.cavesSource.vectorLayer.setSource(source)
    })
  },
  methods: {
    getMap () {
      return this.olMap
    },

    async addOfflineLayer (key) {
      const active = this.offlineMapsStore.activeSources[key]
      if (!active || !active.source) return

      const map = this.getMap()
      if (!map) return

      const existing = map.getLayers().getArray().find(
        l => l.get('name') === `offline-${key}`
      )
      if (existing) return

      const layerProps = {
        name: `offline-${key}`,
        offline: true
      }

      let newLayer
      if (active.isVector) {
        newLayer = new VectorTileLayer({
          source: active.source,
          visible: active.visible !== false,
          properties: layerProps
        })

        if (active.style) {
          try {
            const styleCopy = JSON.parse(JSON.stringify(active.style))
            const sourceNames = Object.keys(styleCopy.sources || {})
            const unified = sourceNames[0] || 'offline'
            if (sourceNames.length > 1) {
              const singleSource = styleCopy.sources[unified]
              styleCopy.sources = { [unified]: singleSource }
              for (const layer of styleCopy.layers) {
                if (layer.source && layer.source !== unified) {
                  layer.source = unified
                }
              }
            }
            const { applyStyle } = await import('ol-mapbox-style')
            await applyStyle(newLayer, styleCopy, { updateSource: false })
          } catch (e) {
            console.warn('Failed to apply vector tile style:', e)
          }
        }
      } else {
        newLayer = new TileLayer({
          source: active.source,
          visible: active.visible !== false,
          properties: layerProps
        })
      }

      const layers = map.getLayers()
      const cavesLayer = layers.getArray().find(l => l.get('name') === 'caves')
      const cavesIdx = cavesLayer ? layers.getArray().indexOf(cavesLayer) : -1
      const insertIdx = cavesIdx >= 0 ? cavesIdx : 0
      layers.insertAt(insertIdx, newLayer)
    },

    setOfflineLayerVisibility (key, visible) {
      const map = this.getMap()
      if (!map) return

      const layer = map.getLayers().getArray().find(
        l => l.get('name') === `offline-${key}`
      )
      if (layer) {
        layer.setVisible(visible !== false)
      }
    },

    async initVectorBasemap (map) {
      if (!isOnline.value) {
        return
      }

      const basemapLayer = new VectorTileLayer({
        properties: { name: 'vector-basemap' }
      })
      const contoursLayer = new VectorTileLayer({
        properties: { name: 'vector-contours' }
      })

      map.getLayers().insertAt(0, basemapLayer)
      map.getLayers().insertAt(1, contoursLayer)

      const transformRequest = (url, type) => {
        if (type === 'Tiles') {
          url = url.replace(/\/tile\//, '/VectorTileServer/tile/')
        }
        return new Request(url)
      }

      try {
        const { applyStyle } = await import('ol-mapbox-style')

        const basemapStyleResp = await fetch(
          'https://cdn.arcgis.com/sharing/rest/content/items/165d7a1e43164d828064eb2027e219d5/resources/styles/root.json?f=json'
        )
        await applyStyle(basemapLayer, await basemapStyleResp.json(), { transformRequest })

        const contoursStyleResp = await fetch(
          'https://cdn.arcgis.com/sharing/rest/content/items/51ca3ce6a16d4080ad955dacd6dd2fe2/resources/styles/root.json?f=json'
        )
        await applyStyle(contoursLayer, await contoursStyleResp.json(), { transformRequest })
      } catch (e) {
        console.warn('Failed to apply vector basemap styles:', e)
      }
    },

    removeOfflineLayer (key) {
      const map = this.getMap()
      if (!map) return

      const layerToRemove = map.getLayers().getArray().find(
        l => l.get('name') === `offline-${key}`
      )

      if (layerToRemove) {
        map.removeLayer(layerToRemove)
      }
    }
  }
}
</script>
