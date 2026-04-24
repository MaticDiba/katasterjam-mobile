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

    <LayerChooserSheet
      v-model="layerChooserOpen"
      :can-create="canCreateOfflineMap"
      @create-click="showOfflineMapDialog = true"
    />

    <q-page-sticky position="bottom-left" :offset="[18, 18]">
      <q-btn fab :icon="isCenterFixed ? 'my_location' : 'location_searching'" color="accent" @click="myLocationClicked" />
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
          <q-card-actions align="center" class="q-mt-md">
            <q-btn
              type="submit"
              color="primary"
              :label="$t('download')"
              :loading="isRequestingOffline"
              :disable="offlineForm.layers.length === 0"
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
import PageFullScreen from 'layouts/PageFullScreen.vue'
import CartoLayers from 'src/components/map/layers/CartoLayers.vue'
import LocationLayers from 'src/components/map/layers/LocationLayers.vue'
import CustomLocationLayers from 'src/components/map/layers/CustomLocationLayers.vue'
import LayerChooserSheet from 'src/components/map/layers/LayerChooserSheet.vue'
import DetailsDrawer from 'src/components/map/drawer/DetailsDrawer.vue'
import AddLocation from 'src/components/custom-locations/AddLocation.vue'
import { useLocationStore } from 'stores/location-store'
import { useMapStore } from 'stores/map-store'
import { useOfflineMapsStore } from 'stores/offline-maps-store'

export const MIN_CREATE_OFFLINE_ZOOM = 14

export default defineComponent({
  name: 'IndexPage',
  components: { PageFullScreen, CartoLayers, LocationLayers, CustomLocationLayers, LayerChooserSheet, DetailsDrawer, AddLocation },
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
    mapStore.saveMapRef(mapRef)

    return {
      locationStore,
      center,
      projection,
      zoom,
      view,
      mapRef,
      markLocations,
      goTo,
      mapStore,
      offlineMapsStore,
      showOfflineMapDialog,
      isRequestingOffline,
      offlineForm,
      layerChooserOpen
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

    return {
      currentCenter: this.center,
      currentZoom: this.zoom,
      currentResolution: this.resolution,
      fixedCenter: false
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
    }
  },
  methods: {
    async onMapClick (evt) {
      if (evt.coordinate) {
        const featuresClick = this.mapRef.map.getFeaturesAtPixel(evt.pixel, {
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
    myLocationClicked (evt) {
      this.center = this.locationStore.getMyLocationCoordinates
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
    }
  },
  mounted () {
    this.mapRef.map.on('click', async (evt) => {
      await this.onMapClick(evt)
    })
    this.offlineMapsStore.loadLocalLayers()
  }
})
</script>
