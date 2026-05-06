<template>
  <PageFullScreen style="background: #eee">
    <ol-map
      loadTilesWhileAnimating
      loadTilesWhileInteracting
      style="height:100%;"
      :moveTolerance="5"
      ref="mapRef">

      <ol-view
        ref="view"
        :enableRotation="false"
        :center="center"
        :zoom="zoom"
        :projection="projection"
        @change:center="centerChanged"
        @change:resolution="resolutionChanged"/>
      <CartoLayers/>
      <LocationLayers
        :view="view"
        @centerChanged="centerChanged"/>
      <CustomLocationLayers v-if="mapStore.getCustomLocationsVisible"/>
      <GpxLayers/>
      <RecordedTracksLayer/>
      <ol-vector-layer>
        <ol-source-vector :features="markLocations">
        </ol-source-vector>
      </ol-vector-layer>
      <q-resize-observer @resize="onScreenOrientationChange" />
    </ol-map>
    <q-page-sticky position="top-right" :offset="[18, 18]">
      <q-btn
        fab
        color="purple"
        icon="layers"
        @click="layerChooserOpen = true"
      />
    </q-page-sticky>

    <q-page-sticky position="top" :offset="[0, 18]">
      <RecordingHud @stop="stopRecording" />
    </q-page-sticky>

    <LayerChooserSheet
      v-model="layerChooserOpen"
      :can-create="canCreateOfflineMap"
      @create-click="showOfflineMapDialog = true"
    />

    <q-page-sticky position="bottom-left" :offset="[18, 18]">
      <q-btn fab :icon="isCenterFixed ? 'my_location' : 'location_searching'" color="accent" @click="myLocationClicked" />
    </q-page-sticky>
    <q-page-sticky position="bottom" :offset="[0, 18]">
      <div ref="scaleLineEl" class="map-scale-line" />
    </q-page-sticky>
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-fab size="100px"
        vertical-actions-align="right"
        glossy
        color="purple"
        icon="add"
        direction="up">
        <q-fab-action
          label-position="right"
          color="primary"
          :disable="!canCreateOfflineMap"
          @click="openOfflineMapDialog"
          icon="cloud_download"
          :label="$t('offlineMapFabLabel')"
        >
          <q-tooltip v-if="!canCreateOfflineMap" anchor="center left" self="center right">
            {{ $t('zoomInToCreateOffline') }}
          </q-tooltip>
        </q-fab-action>
        <q-fab-action label-position="right" color="secondary" :icon="trackLocationIcon ? 'stop_circle' : 'play_arrow'"  label="Start track" @click="trackingClicked" />
      </q-fab>
    </q-page-sticky>
    <DetailsDrawer />
    <AddLocation />

    <q-dialog v-model="showOfflineMapDialog" noBackdropDismiss>
      <q-card style="width: 300px" class="q-px-sm q-pb-md">
        <q-form @submit.prevent="submitOfflineMapRequest" class="q-gutter-md">
          <q-card-section>
            <div class="text-h6">{{ $t('dataForOffline') }}</div>
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="offlineForm.name"
              :label="$t('offlineDataName')"
              dense
              outlined
              :rules="[val => (val && val.length > 0) || 'Name is required']"
            />
          </q-card-section>
          <q-item-label header>{{ $t('mapLayers') }}</q-item-label>
          <q-item dense>
            <q-item-section avatar>
              <q-checkbox v-model="offlineForm.layers" val="VectorBasemap" color="teal" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('vectorBasemapLayer') }}</q-item-label>
              <q-item-label caption>{{ $t('vectorBasemapLayerDescription') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section avatar>
              <q-checkbox v-model="offlineForm.layers" val="LidarSkyView" color="teal" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('lidarMapLayer') }}</q-item-label>
              <q-item-label caption>{{ $t('lidarMapLayerDescription') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section avatar top>
              <q-checkbox v-model="offlineForm.layers" val="Ortho" color="teal" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('orthoMapLayer') }}</q-item-label>
              <q-item-label caption>{{ $t('orthoMapLayerDescription') }}</q-item-label>
            </q-item-section>
          </q-item>
          <div class="q-px-md">
            <div class="text-caption text-grey q-mb-xs">Zoom range</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model.number="offlineForm.minZoom"
                  label="Min zoom"
                  type="number"
                  dense
                  outlined
                  :rules="[val => (val >= 0 && val <= 19) || '0-19']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="offlineForm.maxZoom"
                  label="Max zoom"
                  type="number"
                  dense
                  outlined
                  :rules="[val => (val >= 0 && val <= 19) || '0-19']"
                />
              </div>
            </div>
          </div>
          <div
            v-if="sizeEstimate && offlineForm.layers.length > 0"
            class="q-mx-md q-mt-md q-pa-sm rounded-borders"
            :class="tileCountWarning === 'over-limit'
              ? 'bg-red-1'
              : tileCountWarning === 'near-limit'
                ? 'bg-orange-1'
                : 'bg-grey-2'"
          >
            <div class="text-subtitle2 q-mb-xs">{{ $t('estimatedDownloadSize') }}</div>
            <div class="row justify-between">
              <span>{{ $t('totalTiles') }}</span>
              <strong>{{ sizeEstimate.total.tiles.toLocaleString() }}</strong>
            </div>
            <div class="row justify-between">
              <span>{{ $t('estimatedSize') }}</span>
              <strong>{{ formatBytes(sizeEstimate.total.bytes) }}</strong>
            </div>
            <q-separator class="q-my-xs" />
            <div
              v-for="row in sizeEstimate.perLayer"
              :key="row.layer"
              class="row justify-between text-caption"
            >
              <span>{{ layerLabel(row.layer) }}</span>
              <span>{{ row.tiles.toLocaleString() }} · {{ formatBytes(row.bytes) }}</span>
            </div>
            <div v-if="tileCountWarning === 'over-limit'" class="text-negative text-caption q-mt-xs">
              {{ $t('estimateOverLimit', { max: MAX_TILE_COUNT.toLocaleString() }) }}
            </div>
            <div v-else-if="tileCountWarning === 'near-limit'" class="text-warning text-caption q-mt-xs">
              {{ $t('estimateNearLimit') }}
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              {{ $t('estimateDisclaimer') }}
            </div>
          </div>
          <q-card-actions align="center" class="q-mt-md">
            <q-btn
              type="submit"
              color="primary"
              :label="$t('download')"
              :loading="isRequestingOffline"
              :disable="offlineForm.layers.length === 0 || tileCountWarning === 'over-limit'"
            />
            <q-btn :label="$t('cancel')" color="primary" flat class="q-ml-sm" @click="showOfflineMapDialog = false" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </PageFullScreen>
</template>

<script>
import { ref, defineComponent } from 'vue'
import { fromLonLat, toLonLat } from 'ol/proj'
import Point from 'ol/geom/Point'
import { Feature } from 'ol'
import ScaleLine from 'ol/control/ScaleLine'
import PageFullScreen from 'layouts/PageFullScreen.vue'
import CartoLayers from 'src/components/map/layers/CartoLayers.vue'
import LocationLayers from 'src/components/map/layers/LocationLayers.vue'
import CustomLocationLayers from 'src/components/map/layers/CustomLocationLayers.vue'
import GpxLayers from 'src/components/map/layers/GpxLayers.vue'
import RecordedTracksLayer from 'src/components/map/layers/RecordedTracksLayer.vue'
import LayerChooserSheet from 'src/components/map/layers/LayerChooserSheet.vue'
import DetailsDrawer from 'src/components/map/drawer/DetailsDrawer.vue'
import AddLocation from 'src/components/custom-locations/AddLocation.vue'
import RecordingHud from 'src/components/location/RecordingHud.vue'
import { useLocationStore } from 'stores/location-store'
import { useMapStore } from 'stores/map-store'
import { useOfflineMapsStore } from 'stores/offline-maps-store'
import {
  estimatePackage,
  formatBytes,
  MAX_TILE_COUNT
} from 'src/utils/offline-maps-estimator'

export const MIN_CREATE_OFFLINE_ZOOM = 14

const LAYER_LABEL_KEY = {
  VectorBasemap: 'vectorBasemapLayer',
  LidarSkyView: 'lidarMapLayer',
  Ortho: 'orthoMapLayer'
}

export default defineComponent({
  name: 'IndexPage',
  components: { PageFullScreen, CartoLayers, LocationLayers, CustomLocationLayers, GpxLayers, RecordedTracksLayer, LayerChooserSheet, DetailsDrawer, AddLocation, RecordingHud },
  setup () {
    const locationStore = useLocationStore()
    const mapStore = useMapStore()
    const offlineMapsStore = useOfflineMapsStore()
    const center = ref(mapStore.lastCenter ?? [1637531, 5766419])
    const projection = ref('EPSG:3857')
    const zoom = ref(mapStore.lastZoom ?? 8)
    const markLocations = ref([])
    const goTo = ref(null)
    const showOfflineMapDialog = ref(false)
    const isRequestingOffline = ref(false)
    const layerChooserOpen = ref(false)
    const offlineForm = ref({
      name: '',
      layers: [],
      minZoom: 5,
      maxZoom: 18
    })

    const view = ref('')
    const mapRef = ref('')
    const scaleLineEl = ref(null)
    const scaleLine = ref(null)
    mapStore.saveMapRef(mapRef)

    return {
      locationStore,
      center,
      projection,
      zoom,
      view,
      mapRef,
      scaleLineEl,
      scaleLine,
      markLocations,
      goTo,
      mapStore,
      offlineMapsStore,
      showOfflineMapDialog,
      isRequestingOffline,
      offlineForm,
      layerChooserOpen,
      formatBytes,
      MAX_TILE_COUNT
    }
  },
  data () {
    if (this.$route.query.lat && this.$route.query.lng) {
      const coords = fromLonLat([this.$route.query.lng, this.$route.query.lat])
      const mark = new Feature(new Point(coords))
      this.markLocations = [mark]
      this.center = coords
      this.zoom = 15
      this.goTo = this.$route.query.navigate ? mark : null
    }
    if (this.$route.query.customLocation) {
      this.mapStore.setCustomLocationsVisible(true)
    }
    const pendingGpxExtent = this.$route.query.extent
      ? this.$route.query.extent.split(',').map(Number).filter(n => !Number.isNaN(n))
      : null

    return {
      currentCenter: this.center,
      currentZoom: this.zoom,
      currentResolution: this.resolution,
      fixedCenter: false,
      pendingGpxExtent: pendingGpxExtent && pendingGpxExtent.length === 4 ? pendingGpxExtent : null
    }
  },
  computed: {
    trackLocationIcon () {
      return this.locationStore.getLocationTracking
    },
    navigationActive () {
      return this.locationStore.getNavigationActive
    },
    isCenterFixed () {
      return this.fixedCenter
    },
    canCreateOfflineMap () {
      return (this.currentZoom || 0) >= MIN_CREATE_OFFLINE_ZOOM
    },
    sizeEstimate () {
      const extent = this.mapStore.getExtent
      if (!extent || extent.length !== 4) return null
      const [minLon, minLat] = toLonLat([extent[0], extent[1]])
      const [maxLon, maxLat] = toLonLat([extent[2], extent[3]])
      return estimatePackage({
        minLon,
        minLat,
        maxLon,
        maxLat,
        minZoom: this.offlineForm.minZoom,
        maxZoom: this.offlineForm.maxZoom,
        layers: this.offlineForm.layers
      })
    },
    tileCountWarning () {
      const tiles = this.sizeEstimate?.total.tiles ?? 0
      if (tiles > MAX_TILE_COUNT) return 'over-limit'
      if (tiles > MAX_TILE_COUNT * 0.8) return 'near-limit'
      return null
    }
  },
  methods: {
    async onMapClick (evt) {
      if (evt.coordinate) {
        const featuresClick = this.mapRef.map.getFeaturesAtPixel(evt.pixel, {
          hitTolerance: 8,
          layerFilter: (layer) => {
            const name = layer.get('name')
            return name !== 'vector-basemap' && name !== 'vector-contours' && !layer.get('offline')
          }
        })
        await this.mapStore.mapClick(evt.coordinate, featuresClick)
      }
    },
    zoomChanged (currentZoom) {
      this.currentZoom = currentZoom
      this.mapStore.updateExtent(this.mapRef.map.getView().calculateExtent())
      this.mapStore.saveViewState(null, currentZoom)
    },
    trackingClicked (evt) {
      this.locationStore.toggleLocationTracking()
    },
    stopRecording () {
      if (this.locationStore.getLocationTracking) {
        this.locationStore.toggleLocationTracking()
      }
    },
    async myLocationClicked () {
      let coords = this.locationStore.getMyLocationCoordinates
      if (!coords) {
        try {
          coords = await this.locationStore.requestMyLocation()
        } catch (err) {
          const diagnostic = window.cordova && window.cordova.plugins && window.cordova.plugins.diagnostic
          this.$q.notify({
            type: 'warning',
            message: this.$t('locationUnavailable'),
            timeout: 5000,
            actions: this.$q.platform.is.cordova && diagnostic
              ? [{ label: this.$t('openSettings'), color: 'white', handler: () => diagnostic.switchToLocationSettings() }]
              : []
          })
          return
        }
      }
      if (!coords) {
        return
      }
      this.center = coords
      this.fixedCenter = true
      this.zoom = this.zoom < 15 ? 15 : this.currentZoom
    },
    resolutionChanged (event) {
      this.currentResolution = event.target.getResolution()
      this.zoomChanged(event.target.getZoom())
    },
    centerChanged (event) {
      if (!event.target) {
        return
      }
      const center = event.target.getCenter()
      if (this.view === '') {
        return
      }
      this.currentCenter = center
      this.mapStore.saveViewState(center, null)
      if (this.view.getInteracting()) {
        this.fixedCenter = false
      } else if (this.fixedCenter) {
        this.center = center
      }
    },
    onScreenOrientationChange () {
      this.mapRef.updateSize()
    },
    openOfflineMapDialog () {
      if (!this.canCreateOfflineMap) {
        this.$q.notify({ type: 'info', message: this.$t('zoomInToCreateOffline') })
        return
      }
      this.showOfflineMapDialog = true
    },
    layerLabel (layerType) {
      const key = LAYER_LABEL_KEY[layerType]
      return key ? this.$t(key) : layerType
    },
    async submitOfflineMapRequest () {
      if (!this.canCreateOfflineMap) {
        this.$q.notify({ type: 'info', message: this.$t('zoomInToCreateOffline') })
        return
      }
      this.isRequestingOffline = true
      try {
        const extent = this.mapStore.getExtent
        const [minLon, minLat] = toLonLat([extent[0], extent[1]])
        const [maxLon, maxLat] = toLonLat([extent[2], extent[3]])
        const payload = {
          name: this.offlineForm.name,
          minLon,
          minLat,
          maxLon,
          maxLat,
          layers: [...this.offlineForm.layers],
          minZoom: this.offlineForm.minZoom,
          maxZoom: this.offlineForm.maxZoom
        }
        await this.offlineMapsStore.requestNewPackage(payload)
        this.$q.notify({ type: 'positive', message: 'Offline map request submitted' })
        this.offlineForm.name = ''
        this.offlineForm.layers = []
        this.showOfflineMapDialog = false
      } catch (error) {
        const msg = error?.response?.data?.message || error?.message || 'Request failed'
        this.$q.notify({ type: 'negative', message: msg })
      } finally {
        this.isRequestingOffline = false
      }
    }
  },
  watch: {
    view (newVal, oldVal) {
      this.locationStore.initialize(newVal.getProjection())
      if (this.goTo) {
        this.locationStore.startNavigation(this.goTo)
      }
      if (this.pendingGpxExtent) {
        newVal.fit(this.pendingGpxExtent, { padding: [60, 60, 60, 60], duration: 500 })
        this.pendingGpxExtent = null
      }
    }
  },
  mounted () {
    this.mapRef.map.on('click', async (evt) => {
      await this.onMapClick(evt)
    })
    this.scaleLine = new ScaleLine({
      units: 'metric',
      bar: false,
      minWidth: 80,
      target: this.scaleLineEl
    })
    this.mapRef.map.addControl(this.scaleLine)
    this.offlineMapsStore.loadLocalLayers()
  },
  beforeUnmount () {
    if (this.scaleLine) {
      this.mapRef?.map?.removeControl(this.scaleLine)
      this.scaleLine = null
    }
  }
})
</script>

<style scoped>
.map-scale-line {
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  line-height: 1.2;
}
.map-scale-line :deep(.ol-scale-line) {
  position: static;
  background: transparent;
  padding: 0;
}
.map-scale-line :deep(.ol-scale-line-inner) {
  color: #333;
  border-color: #333;
}
</style>
