<template>
  <q-page>
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="justify"
    >
      <q-tab name="packages" label="My Packages" icon="cloud_download" />
      <q-tab name="registry" label="Registry" icon="public" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated>

      <q-tab-panel name="packages">
        <q-pull-to-refresh @refresh="refreshMyPackages">
          <template v-if="offlineMapsStore.packages.length === 0 && !isLoadingPackages">
            <q-item>
              <q-item-section class="text-center">
                <q-item-label class="text-h6" style="padding-top: 40px;">
                  No packages yet
                </q-item-label>
                <q-item-label caption>Request a new offline map from the map view</q-item-label>
              </q-item-section>
            </q-item>
          </template>

          <q-list v-else separator>
            <div v-for="pkg in offlineMapsStore.packages" :key="pkg.id">
              <q-item>
                <q-item-section>
                  <q-item-label class="row items-center q-gutter-xs">
                    <span>{{ pkg.name }}</span>
                    <q-badge :color="statusColor(pkg.status)" :label="pkg.status" />
                  </q-item-label>
                  <q-item-label caption>
                    {{ pkg.layers ? pkg.layers.length : 0 }} layer(s)
                    <span v-if="pkg.bbox"> &mdash; {{ bboxDescription(pkg.bbox) }}</span>
                  </q-item-label>

                  <div v-if="!isPackageInProgress(pkg) && pkg.layers && pkg.layers.length > 0" class="q-mt-sm q-gutter-xs">
                    <div v-for="layer in pkg.layers" :key="layer.layerType" class="q-mb-sm">
                      <div class="row items-center q-gutter-sm">
                        <span class="text-caption">{{ layer.layerType }}</span>
                        <template v-if="layer.status === 'Ready'">
                          <q-btn
                            v-if="!isLayerActive(pkg.id, layer.layerType)"
                            size="sm"
                            color="primary"
                            icon="download"
                            label="Download"
                            :loading="isDownloading(pkg.id, layer.layerType)"
                            @click="downloadLayer(pkg.id, layer.layerType)"
                          />
                          <q-btn
                            v-else
                            size="sm"
                            color="negative"
                            icon="layers_clear"
                            label="Deactivate"
                            flat
                            @click="deactivateLayer(pkg.id, layer.layerType)"
                          />
                        </template>
                        <template v-else>
                          <q-badge :color="statusColor(layer.status)" :label="layer.status" />
                          <q-icon v-if="layer.errorMessage" name="info" color="grey" size="xs">
                            <q-tooltip>{{ layer.errorMessage }}</q-tooltip>
                          </q-icon>
                        </template>
                      </div>
                      <q-linear-progress
                        v-if="isDownloading(pkg.id, layer.layerType)"
                        :value="downloadProgress(pkg.id, layer.layerType)"
                        color="primary"
                        class="q-mt-xs"
                        style="height: 4px"
                      />
                    </div>
                  </div>

                  <div v-if="isPackageInProgress(pkg) && pkg.layers && pkg.layers.length > 0" class="q-mt-sm">
                    <div v-for="layer in pkg.layers" :key="layer.layerType" class="q-mb-xs">
                      <div class="row items-center q-gutter-xs">
                        <span class="text-caption" style="min-width: 80px">{{ layer.layerType }}</span>
                        <q-linear-progress
                          v-if="layer.generationProgress != null"
                          :value="layer.generationProgress"
                          color="orange"
                          class="col"
                          style="height: 6px"
                        />
                        <q-linear-progress
                          v-else
                          indeterminate
                          color="grey-5"
                          class="col"
                          style="height: 6px"
                        />
                        <span v-if="layer.generationProgress != null" class="text-caption text-grey" style="min-width: 36px; text-align: right">
                          {{ Math.round(layer.generationProgress * 100) }}%
                        </span>
                        <span v-else class="text-caption text-grey" style="min-width: 36px; text-align: right">
                          pending
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="isPackageInProgress(pkg)" class="q-mt-xs">
                    <q-linear-progress indeterminate color="orange" style="height: 4px" />
                    <div class="text-caption text-grey q-mt-xs">Generation in progress…</div>
                  </div>
                  <div v-if="pkg.status === 'Failed' && pkg.errorMessage" class="q-mt-xs text-caption text-red">
                    {{ pkg.errorMessage }}
                  </div>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    flat
                    round
                    icon="delete"
                    color="negative"
                    size="sm"
                    @click="confirmDelete(pkg)"
                  />
                </q-item-section>
              </q-item>
              <q-separator />
            </div>
          </q-list>
        </q-pull-to-refresh>
      </q-tab-panel>

      <q-tab-panel name="registry">
        <template v-if="offlineMapsStore.registryPackages.length === 0 && !isLoadingRegistry">
          <q-item>
            <q-item-section class="text-center">
              <q-item-label class="text-h6" style="padding-top: 40px;">
                No public packages found nearby
              </q-item-label>
              <q-item-label caption>Packages within 50 km of the current map center</q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <q-inner-loading :showing="isLoadingRegistry">
          <q-spinner size="40px" color="primary" />
        </q-inner-loading>

        <q-list separator>
          <div v-for="pkg in offlineMapsStore.registryPackages" :key="pkg.id">
            <q-item>
              <q-item-section>
                <q-item-label class="row items-center q-gutter-xs">
                  <span>{{ pkg.name }}</span>
                  <q-badge color="green" label="Ready" />
                </q-item-label>
                <q-item-label caption>
                  {{ pkg.layers ? pkg.layers.length : 0 }} layer(s)
                  <span v-if="pkg.bbox"> &mdash; {{ bboxDescription(pkg.bbox) }}</span>
                </q-item-label>
                <div v-if="pkg.layers && pkg.layers.length > 0" class="q-mt-sm q-gutter-xs">
                  <div v-for="layer in pkg.layers" :key="layer.layerType" class="q-mb-sm">
                    <div class="row items-center q-gutter-sm">
                      <span class="text-caption">{{ layer.layerType }}</span>
                      <q-btn
                        v-if="!isLayerActive(pkg.id, layer.layerType)"
                        size="sm"
                        color="primary"
                        icon="download"
                        label="Download"
                        :loading="isDownloading(pkg.id, layer.layerType)"
                        @click="downloadLayer(pkg.id, layer.layerType)"
                      />
                      <q-btn
                        v-else
                        size="sm"
                        color="negative"
                        icon="layers_clear"
                        label="Deactivate"
                        flat
                        @click="deactivateLayer(pkg.id, layer.layerType)"
                      />
                    </div>
                    <q-linear-progress
                      v-if="isDownloading(pkg.id, layer.layerType)"
                      :value="downloadProgress(pkg.id, layer.layerType)"
                      color="primary"
                      class="q-mt-xs"
                      style="height: 4px"
                    />
                  </div>
                </div>
              </q-item-section>
            </q-item>
            <q-separator />
          </div>
        </q-list>
      </q-tab-panel>

    </q-tab-panels>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useOfflineMapsStore } from 'stores/offline-maps-store'
import { useMapStore } from 'stores/map-store'
import { toLonLat } from 'ol/proj'
import { OFFLINE_VECTOR_STYLE_MISSING } from 'src/utils/vector-mbtiles-source'
import { OFFLINE_MAPS_REQUIRE_NATIVE } from 'src/services/offline-maps-service'
import { sourceKey } from 'src/stores/offline-maps-store'

export default {
  name: 'OfflineMapManagement',

  setup () {
    const $q = useQuasar()
    const offlineMapsStore = useOfflineMapsStore()
    const mapStore = useMapStore()

    const activeTab = ref('packages')
    const isLoadingPackages = ref(false)
    const isLoadingRegistry = ref(false)

    return {
      $q,
      offlineMapsStore,
      mapStore,
      activeTab,
      isLoadingPackages,
      isLoadingRegistry
    }
  },

  watch: {
    activeTab (newTab) {
      if (newTab === 'packages') {
        this.loadMyPackages()
      } else if (newTab === 'registry') {
        this.loadRegistry()
      }
    }
  },

  methods: {
    statusColor (status) {
      const map = {
        Ready: 'green',
        Generating: 'orange',
        Pending: 'orange',
        Failed: 'red',
        Expired: 'grey'
      }
      return map[status] || 'grey'
    },

    isPackageInProgress (pkg) {
      return pkg.status === 'Generating' || pkg.status === 'Pending'
    },

    bboxDescription (bbox) {
      if (!bbox || bbox.length < 4) return ''
      return `${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)} → ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}`
    },

    isLayerActive (packageId, layerType) {
      return !!this.offlineMapsStore.activeSources[sourceKey(packageId, layerType)]
    },

    isDownloading (packageId, layerType) {
      const progress = this.offlineMapsStore.downloadProgress[sourceKey(packageId, layerType)]
      return progress !== undefined && progress < 1
    },

    downloadProgress (packageId, layerType) {
      return this.offlineMapsStore.downloadProgress[sourceKey(packageId, layerType)] || 0
    },

    async loadMyPackages () {
      this.isLoadingPackages = true
      try {
        await this.offlineMapsStore.fetchMyPackages()
      } catch (error) {
        this.$q.notify({ type: 'negative', message: 'Failed to load packages' })
      } finally {
        this.isLoadingPackages = false
      }
    },

    async refreshMyPackages (done) {
      await this.loadMyPackages()
      if (done) done()
    },

    async loadRegistry () {
      this.isLoadingRegistry = true
      try {
        const center = this.mapStore.mapRef?.map?.getView()?.getCenter()
        let lat, lon
        if (center) {
          const wgs84 = toLonLat(center)
          lon = wgs84[0]
          lat = wgs84[1]
        }
        await this.offlineMapsStore.fetchRegistry(lat, lon)
      } catch (error) {
        this.$q.notify({ type: 'negative', message: 'Failed to load registry' })
      } finally {
        this.isLoadingRegistry = false
      }
    },

    async downloadLayer (packageId, layerType) {
      try {
        await this.offlineMapsStore.downloadAndActivateLayer(packageId, layerType)
        this.$q.notify({ type: 'positive', message: `${layerType} layer activated` })
      } catch (error) {
        let message
        if (error?.message === OFFLINE_VECTOR_STYLE_MISSING) {
          message = this.$t('offlineVectorStyleMissing')
        } else if (error?.message === OFFLINE_MAPS_REQUIRE_NATIVE) {
          message = this.$t('offlineMapsRequireNative')
        } else {
          message = `Download failed: ${error?.message || error}`
        }
        this.$q.notify({ type: 'negative', message })
      }
    },

    deactivateLayer (packageId, layerType) {
      this.offlineMapsStore.deactivateLayer(packageId, layerType)
      this.$q.notify({ type: 'info', message: `${layerType} layer deactivated` })
    },

    confirmDelete (pkg) {
      this.$q.dialog({
        title: 'Confirm',
        message: `Delete package "${pkg.name}"? This will remove all downloaded layers.`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await this.offlineMapsStore.removePackage(pkg.id)
          this.$q.notify({ type: 'positive', message: 'Package deleted' })
        } catch (error) {
          this.$q.notify({ type: 'negative', message: 'Failed to delete package' })
        }
      })
    }
  },

  mounted () {
    this.loadMyPackages()
  }
}
</script>
