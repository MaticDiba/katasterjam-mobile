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
      <q-tab name="packages" :label="$t('myTilesTab')" icon="folder_special" />
      <q-tab name="registry" :label="$t('libraryTab')" icon="public" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated>

      <q-tab-panel name="packages">
        <q-pull-to-refresh @refresh="refreshMyPackages">
          <template v-if="offlineMapsStore.myTiles.length === 0 && !isLoadingPackages">
            <q-item>
              <q-item-section class="text-center">
                <q-item-label class="text-h6" style="padding-top: 40px;">
                  {{ $t('noMyTilesYet') }}
                </q-item-label>
                <q-item-label caption>{{ $t('noMyTilesYetCaption') }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>

          <q-list v-else separator>
            <div v-for="pkg in offlineMapsStore.myTiles" :key="pkg.id">
              <q-item>
                <q-item-section>
                  <q-item-label class="row items-center q-gutter-xs">
                    <span>{{ pkg.name }}</span>
                    <q-badge :color="statusColor(pkg.status)" :label="pkg.status" />
                    <q-badge v-if="pkg.source === 'library'" color="blue-grey" :label="$t('packageFromLibrary')" outline />
                  </q-item-label>
                  <q-item-label caption>
                    {{ pkg.layers ? pkg.layers.length : 0 }} {{ $t('layerCountSuffix') }}
                    <span v-if="pkg.bbox"> &mdash; {{ bboxDescription(pkg.bbox) }}</span>
                  </q-item-label>

                  <div v-if="!isPackageInProgress(pkg) && pkg.layers && pkg.layers.length > 0" class="q-mt-sm q-gutter-xs">
                    <div v-for="layer in pkg.layers" :key="layer.layerType" class="q-mb-sm">
                      <div class="row items-center q-gutter-sm">
                        <span class="text-caption">{{ offlineLayerLabel(layer.layerType) }}</span>
                        <template v-if="layer.status === 'Ready'">
                          <template v-if="isLayerDownloaded(pkg.id, layer.layerType)">
                            <q-toggle
                              :model-value="isLayerActive(pkg.id, layer.layerType) && isLayerVisible(pkg.id, layer.layerType)"
                              color="teal"
                              :label="$t('showOnMap')"
                              @update:model-value="val => toggleLayerOnMap(pkg.id, layer.layerType, val)"
                            />
                            <q-btn
                              flat
                              round
                              dense
                              size="sm"
                              icon="delete_outline"
                              color="grey-7"
                              @click="confirmRemoveLayer(pkg, layer)"
                            >
                              <q-tooltip>{{ $t('removeLayerFromDevice') }}</q-tooltip>
                            </q-btn>
                          </template>
                          <template v-else>
                            <q-btn
                              size="sm"
                              color="primary"
                              icon="download"
                              :label="$t('download')"
                              :loading="isDownloading(pkg.id, layer.layerType)"
                              @click="downloadLayer(pkg.id, layer.layerType)"
                            />
                            <q-btn
                              v-if="isDownloading(pkg.id, layer.layerType)"
                              flat
                              dense
                              size="sm"
                              color="grey-7"
                              icon="close"
                              :aria-label="$t('cancelDownload')"
                              @click="cancelDownload(pkg.id, layer.layerType)"
                            >
                              <q-tooltip>{{ $t('cancelDownload') }}</q-tooltip>
                            </q-btn>
                          </template>
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
                      <div
                        v-if="isDownloading(pkg.id, layer.layerType) && retryAttempt(pkg.id, layer.layerType) > 1"
                        class="text-caption text-orange q-mt-xs"
                      >
                        {{ $t('downloadAttempt', { attempt: retryAttempt(pkg.id, layer.layerType), total: retryTotal(pkg.id, layer.layerType) }) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="isPackageInProgress(pkg) && pkg.layers && pkg.layers.length > 0" class="q-mt-sm">
                    <div v-for="layer in pkg.layers" :key="layer.layerType" class="q-mb-xs">
                      <div class="row items-center q-gutter-xs">
                        <span class="text-caption" style="min-width: 80px">{{ offlineLayerLabel(layer.layerType) }}</span>
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
                          {{ $t('pendingShort') }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="isPackageInProgress(pkg)" class="q-mt-xs">
                    <q-linear-progress indeterminate color="orange" style="height: 4px" />
                    <div class="text-caption text-grey q-mt-xs">{{ $t('generationInProgress') }}</div>
                  </div>
                  <div v-if="pkg.status === 'Failed' && pkg.errorMessage" class="q-mt-xs text-caption text-red">
                    {{ pkg.errorMessage }}
                  </div>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    flat
                    round
                    icon="delete_outline"
                    color="grey-7"
                    size="sm"
                    @click="confirmDelete(pkg)"
                  >
                    <q-tooltip>{{ $t('removeFromDevice') }}</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-separator />
            </div>
          </q-list>
        </q-pull-to-refresh>
      </q-tab-panel>

      <q-tab-panel name="registry">
        <q-banner v-if="offlineMapsStore.isRegistryOffline" class="bg-grey-3 q-mb-md">
          <template v-slot:avatar>
            <q-icon name="cloud_off" color="grey-7" />
          </template>
          {{ $t('offlineRegistryUnavailable') }}
        </q-banner>

        <template v-if="!offlineMapsStore.isRegistryOffline && offlineMapsStore.registryPackages.length === 0 && !isLoadingRegistry">
          <q-item>
            <q-item-section class="text-center">
              <q-item-label class="text-h6" style="padding-top: 40px;">
                {{ $t('noPublicPackagesNearby') }}
              </q-item-label>
              <q-item-label caption>{{ $t('packagesNearbyCaption') }}</q-item-label>
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
                  <q-badge v-if="isInMyTiles(pkg.id)" color="teal" :label="$t('inMyTilesBadge')" />
                  <q-badge v-if="pkg.isAuthor" color="purple" :label="$t('authorBadge')" outline />
                </q-item-label>
                <q-item-label caption>
                  {{ pkg.layers ? pkg.layers.length : 0 }} {{ $t('layerCountSuffix') }}
                  <span v-if="pkg.bbox"> &mdash; {{ bboxDescription(pkg.bbox) }}</span>
                </q-item-label>
                <div v-if="pkg.layers && pkg.layers.length > 0" class="q-mt-sm q-gutter-xs">
                  <div v-for="layer in pkg.layers" :key="layer.layerType" class="q-mb-sm">
                    <div class="row items-center q-gutter-sm">
                      <span class="text-caption">{{ offlineLayerLabel(layer.layerType) }}</span>
                      <template v-if="isLayerDownloaded(pkg.id, layer.layerType)">
                        <q-badge color="teal" :label="$t('downloadedBadge')" outline />
                        <q-btn
                          flat
                          dense
                          size="sm"
                          color="primary"
                          :label="$t('viewInMyTiles')"
                          @click="activeTab = 'packages'"
                        />
                      </template>
                      <template v-else>
                        <q-btn
                          size="sm"
                          color="primary"
                          icon="download"
                          :label="$t('download')"
                          :loading="isDownloading(pkg.id, layer.layerType)"
                          @click="downloadLayer(pkg.id, layer.layerType)"
                        />
                        <q-btn
                          v-if="isDownloading(pkg.id, layer.layerType)"
                          flat
                          dense
                          size="sm"
                          color="grey-7"
                          icon="close"
                          :aria-label="$t('cancelDownload')"
                          @click="cancelDownload(pkg.id, layer.layerType)"
                        >
                          <q-tooltip>{{ $t('cancelDownload') }}</q-tooltip>
                        </q-btn>
                      </template>
                    </div>
                    <q-linear-progress
                      v-if="isDownloading(pkg.id, layer.layerType)"
                      :value="downloadProgress(pkg.id, layer.layerType)"
                      color="primary"
                      class="q-mt-xs"
                      style="height: 4px"
                    />
                    <div
                      v-if="isDownloading(pkg.id, layer.layerType) && retryAttempt(pkg.id, layer.layerType) > 1"
                      class="text-caption text-orange q-mt-xs"
                    >
                      {{ $t('downloadAttempt', { attempt: retryAttempt(pkg.id, layer.layerType), total: retryTotal(pkg.id, layer.layerType) }) }}
                    </div>
                  </div>
                </div>
              </q-item-section>
              <q-item-section side v-if="pkg.isAuthor">
                <q-btn
                  flat
                  round
                  icon="delete"
                  color="negative"
                  size="sm"
                  @click="confirmAuthorDelete(pkg)"
                />
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
import { liveQuery } from 'dexie'
import { useOfflineMapsStore } from 'stores/offline-maps-store'
import { useMapStore } from 'stores/map-store'
import { toLonLat } from 'ol/proj'
import { OFFLINE_VECTOR_STYLE_MISSING } from 'src/utils/vector-mbtiles-source'
import { OFFLINE_MAPS_REQUIRE_NATIVE } from 'src/services/offline-maps-service'
import { sourceKey } from 'src/stores/offline-maps-store'
import { db } from 'src/db/db'

const layerLabelKeys = {
  VectorBasemap: 'vectorBasemapLayer',
  LidarSkyView: 'lidarMapLayer',
  Ortho: 'orthoMapLayer'
}

export default {
  name: 'OfflineMapManagement',

  setup () {
    const offlineMapsStore = useOfflineMapsStore()
    const mapStore = useMapStore()

    const activeTab = ref('packages')
    const isLoadingPackages = ref(false)
    const isLoadingRegistry = ref(false)
    const downloadedKeys = ref(new Set())

    return {
      offlineMapsStore,
      mapStore,
      activeTab,
      isLoadingPackages,
      isLoadingRegistry,
      downloadedKeys
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

    offlineLayerLabel (layerType) {
      const key = layerLabelKeys[layerType]
      return key ? this.$t(key) : layerType
    },

    isLayerActive (packageId, layerType) {
      return !!this.offlineMapsStore.activeSources[sourceKey(packageId, layerType)]
    },

    isLayerVisible (packageId, layerType) {
      const active = this.offlineMapsStore.activeSources[sourceKey(packageId, layerType)]
      return !!active?.visible
    },

    isLayerDownloaded (packageId, layerType) {
      return this.downloadedKeys.has(sourceKey(packageId, layerType))
    },

    isInMyTiles (packageId) {
      return this.offlineMapsStore.myTiles.some(p => p.id === packageId)
    },

    isDownloading (packageId, layerType) {
      const progress = this.offlineMapsStore.downloadProgress[sourceKey(packageId, layerType)]
      return progress !== undefined && progress < 1
    },

    downloadProgress (packageId, layerType) {
      return this.offlineMapsStore.downloadProgress[sourceKey(packageId, layerType)] || 0
    },

    retryAttempt (packageId, layerType) {
      return this.offlineMapsStore.downloadAttempt[sourceKey(packageId, layerType)]?.attempt || 1
    },

    retryTotal (packageId, layerType) {
      return this.offlineMapsStore.downloadAttempt[sourceKey(packageId, layerType)]?.total || 1
    },

    cancelDownload (packageId, layerType) {
      this.offlineMapsStore.cancelDownload(packageId, layerType)
    },

    async loadMyPackages () {
      this.isLoadingPackages = true
      try {
        await this.offlineMapsStore.loadMyTiles()
        this.offlineMapsStore.syncMyTilesWithServer().catch(() => {})
      } finally {
        this.isLoadingPackages = false
      }
    },

    async refreshMyPackages (done) {
      try {
        await this.offlineMapsStore.loadMyTiles()
        await this.offlineMapsStore.syncMyTilesWithServer()
      } catch (_) { /* local view still rendered */ }
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
        if (!this.offlineMapsStore.isRegistryOffline) {
          this.$q.notify({ type: 'negative', message: this.$t('failedToLoadRegistry') })
        }
      } finally {
        this.isLoadingRegistry = false
      }
    },

    async downloadLayer (packageId, layerType) {
      try {
        await this.offlineMapsStore.downloadLayerFile(packageId, layerType)
        this.$q.notify({ type: 'positive', message: `${this.offlineLayerLabel(layerType)} ${this.$t('downloadedMessage')}` })
      } catch (error) {
        if (error?.name === 'AbortError') {
          this.$q.notify({ type: 'info', message: this.$t('downloadCancelled') })
          return
        }
        let message
        if (error?.message === OFFLINE_VECTOR_STYLE_MISSING) {
          message = this.$t('offlineVectorStyleMissing')
        } else if (error?.message === OFFLINE_MAPS_REQUIRE_NATIVE) {
          message = this.$t('offlineMapsRequireNative')
        } else if (error?.name === 'IdleTimeoutError') {
          message = this.$t('downloadStalled')
        } else {
          message = `${this.$t('downloadFailed')}: ${error?.message || error}`
        }
        this.$q.notify({ type: 'negative', message })
      }
    },

    toggleLayerOnMap (packageId, layerType, visible) {
      const active = this.offlineMapsStore.activeSources[sourceKey(packageId, layerType)]
      if (active) {
        this.offlineMapsStore.setLayerVisibility(packageId, layerType, visible)
        return
      }
      if (visible) {
        this.offlineMapsStore.downloadAndActivateLayer(packageId, layerType).catch(error => {
          this.$q.notify({ type: 'negative', message: `${this.$t('downloadFailed')}: ${error?.message || error}` })
        })
      }
    },

    confirmRemoveLayer (pkg, layer) {
      this.$q.dialog({
        title: this.$t('confirm'),
        message: this.$t('confirmRemoveLayerFromDevice', {
          layer: this.offlineLayerLabel(layer.layerType),
          name: pkg.name
        }),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await this.offlineMapsStore.removeLayerFromDevice(pkg.id, layer.layerType)
          this.$q.notify({ type: 'positive', message: this.$t('layerRemovedFromDevice') })
        } catch (error) {
          this.$q.notify({ type: 'negative', message: this.$t('layerRemoveFailed') })
        }
      })
    },

    confirmDelete (pkg) {
      this.$q.dialog({
        title: this.$t('confirm'),
        message: this.$t('confirmRemovePackageFromDevice', { name: pkg.name }),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await this.offlineMapsStore.removePackageFromDevice(pkg.id)
          this.$q.notify({ type: 'positive', message: this.$t('packageRemovedFromDevice') })
        } catch (error) {
          this.$q.notify({ type: 'negative', message: this.$t('packageDeleteFailed') })
        }
      })
    },

    confirmAuthorDelete (pkg) {
      this.$q.dialog({
        title: this.$t('confirm'),
        message: this.$t('confirmAuthorDelete', { name: pkg.name }),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await this.offlineMapsStore.removePackageFromServer(pkg.id)
          this.$q.notify({ type: 'positive', message: this.$t('packageDeleted') })
        } catch (error) {
          this.$q.notify({ type: 'negative', message: this.$t('packageDeleteFailed') })
        }
      })
    }
  },

  mounted () {
    this.loadMyPackages()

    this._downloadedSubscription = liveQuery(() => db.offlineMaps.toArray()).subscribe({
      next: (rows) => {
        const set = new Set()
        for (const r of rows) set.add(sourceKey(r.packageId, r.layerType))
        this.downloadedKeys = set
      },
      error: (e) => console.warn('offlineMaps liveQuery error:', e)
    })
  },

  beforeUnmount () {
    if (this._downloadedSubscription) {
      this._downloadedSubscription.unsubscribe()
      this._downloadedSubscription = null
    }
  }
}
</script>
