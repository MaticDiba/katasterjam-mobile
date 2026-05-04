<template>
  <q-dialog :model-value="modelValue" position="bottom" @update:model-value="val => $emit('update:modelValue', val)">
    <q-card class="layer-chooser-card">
      <div class="row items-center q-px-md q-pt-sm q-pb-xs">
        <div class="text-h6 col">{{ $t('layerChooserTitle') }}</div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </div>

      <q-separator />

      <q-scroll-area style="max-height: 60vh; height: 60vh;">
        <q-list>
          <q-item-label header>{{ $t('baseLayersSection') }}</q-item-label>
          <q-item v-for="layer in mapStore.getLayers" :key="layer.label" clickable @click="selectBaseLayer(layer)">
            <q-item-section avatar>
              <q-avatar rounded size="44px">
                <img :src="layer.preview" :alt="layer.label" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ baseLayerLabel(layer) }}</q-item-label>
              <q-item-label caption lines="3">{{ baseLayerDescription(layer) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle :model-value="layer.active" color="teal" @click.stop="selectBaseLayer(layer)" />
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <q-item-label header>{{ $t('overlayLayersSection') }}</q-item-label>
          <q-item clickable @click="toggleCustomLocations">
            <q-item-section avatar>
              <q-avatar rounded size="44px" color="orange-1" text-color="orange">
                <q-icon name="place" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('customLocationsLayer') }}</q-item-label>
              <q-item-label caption lines="2">{{ $t('customLocationsLayerDescription') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="mapStore.getCustomLocationsVisible"
                color="teal"
                @click.stop="toggleCustomLocations"
              />
            </q-item-section>
          </q-item>

          <q-item v-if="gpxStore.getAddedTracks.length" clickable @click="toggleAllGpx">
            <q-item-section avatar>
              <q-avatar rounded size="44px" color="blue-1" text-color="blue">
                <q-icon name="route" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('gpxTracks') }}</q-item-label>
              <q-item-label caption>{{ gpxSummary }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="anyGpxVisible"
                color="teal"
                @click.stop="toggleAllGpx"
              />
            </q-item-section>
          </q-item>
          <q-item
            v-for="track in gpxStore.getAddedTracks"
            :key="track.externalId"
            clickable
            class="q-pl-xl"
            @click="gpxStore.toggleVisible(track.externalId)"
          >
            <q-item-section>
              <q-item-label>{{ track.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="gpxStore.isVisible(track.externalId)"
                color="teal"
                @click.stop="gpxStore.toggleVisible(track.externalId)"
              />
            </q-item-section>
          </q-item>

          <q-item v-if="recordedTracksStore.getAddedTracks.length" clickable @click="toggleAllRecorded">
            <q-item-section avatar>
              <q-avatar rounded size="44px" color="red-1" text-color="red">
                <q-icon name="timeline" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('recordedTracksLayer') }}</q-item-label>
              <q-item-label caption>{{ recordedSummary }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="anyRecordedVisible"
                color="teal"
                @click.stop="toggleAllRecorded"
              />
            </q-item-section>
          </q-item>
          <q-item
            v-for="track in recordedTracksStore.getAddedTracks"
            :key="`rec-${track.id}`"
            clickable
            class="q-pl-xl"
            @click="recordedTracksStore.toggleVisible(track.id)"
          >
            <q-item-section avatar>
              <div
                class="recorded-track-dot"
                :style="{ background: track.color || '#e53935' }"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ track.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="close"
                size="sm"
                :title="$t('recordedTracksRemoveFromMap')"
                @click.stop="recordedTracksStore.setAddedToMap(track.id, false)"
              />
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="recordedTracksStore.isVisible(track.id)"
                color="teal"
                @click.stop="recordedTracksStore.toggleVisible(track.id)"
              />
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <q-item-label header>{{ $t('offlineLayersSection') }}</q-item-label>

          <div v-if="offlineGroups.length === 0" class="q-pa-md text-center text-grey-7">
            <q-icon name="offline_bolt" size="42px" color="grey-5" />
            <div class="q-mt-sm">{{ $t('noOfflineLayersYet') }}</div>
            <q-btn
              class="q-mt-md"
              color="primary"
              icon="add"
              :label="$t('createOfflineMap')"
              :disable="!canCreate"
              @click="onCreateClicked"
            />
            <div v-if="!canCreate" class="text-caption text-grey-6 q-mt-xs">
              {{ $t('zoomInToCreateOffline') }}
            </div>
          </div>

          <template v-else>
            <div v-for="group in offlineGroups" :key="group.packageId">
              <q-item-label class="text-weight-medium q-px-md q-pt-sm">
                {{ group.packageName }}
                <q-badge v-if="group.source === 'library'" color="blue-grey" :label="$t('packageFromLibrary')" outline class="q-ml-sm" />
              </q-item-label>
              <q-item v-for="layer in group.layers" :key="`${group.packageId}_${layer.layerType}`" clickable @click="selectOfflineLayer(group.packageId, layer.layerType)">
                <q-item-section avatar>
                  <q-avatar rounded size="44px" color="teal-1" text-color="teal">
                    <q-icon name="offline_bolt" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ offlineLayerLabel(layer.layerType) }}</q-item-label>
                  <q-item-label caption lines="3">{{ offlineLayerDescription(layer.layerType) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle
                    :model-value="isOfflineLayerVisible(group.packageId, layer.layerType)"
                    color="teal"
                    @click.stop="selectOfflineLayer(group.packageId, layer.layerType)"
                  />
                </q-item-section>
              </q-item>
            </div>
          </template>
        </q-list>
      </q-scroll-area>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref } from 'vue'
import { liveQuery } from 'dexie'
import { useMapStore } from 'stores/map-store'
import { useOfflineMapsStore, sourceKey } from 'stores/offline-maps-store'
import { useLocalGpxStore } from 'stores/local-gpx-store'
import { useLocalTracksStore } from 'stores/local-tracks-store'
import { db } from 'src/db/db'
import { OFFLINE_VECTOR_STYLE_MISSING } from 'src/utils/vector-mbtiles-source'
import { OFFLINE_MAPS_REQUIRE_NATIVE } from 'src/services/offline-maps-service'

const layerLabelKeys = {
  VectorBasemap: 'vectorBasemapLayer',
  LidarSkyView: 'lidarMapLayer',
  Ortho: 'orthoMapLayer'
}

const layerDescriptionKeys = {
  VectorBasemap: 'vectorBasemapLayerDescription',
  LidarSkyView: 'lidarMapLayerDescription',
  Ortho: 'orthoMapLayerDescription'
}

const baseLayerLabelKeys = {
  Lidar: 'lidarMapLayer',
  Ortho: 'orthoMapLayer'
}

const baseLayerDescriptionKeys = {
  Lidar: 'lidarMapLayerDescription',
  Ortho: 'orthoMapLayerDescription'
}

export default {
  name: 'LayerChooserSheet',

  props: {
    modelValue: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: true }
  },

  emits: ['update:modelValue', 'create-click'],

  setup () {
    const mapStore = useMapStore()
    const offlineMapsStore = useOfflineMapsStore()
    const gpxStore = useLocalGpxStore()
    const recordedTracksStore = useLocalTracksStore()
    const downloadedKeys = ref(new Set())

    return { mapStore, offlineMapsStore, gpxStore, recordedTracksStore, downloadedKeys }
  },

  computed: {
    anyGpxVisible () {
      return this.gpxStore.getVisibleIds.length > 0
    },
    gpxSummary () {
      const added = this.gpxStore.getAddedTracks.length
      const visible = this.gpxStore.getVisibleIds.length
      return `${visible}/${added}`
    },
    anyRecordedVisible () {
      return this.recordedTracksStore.getVisibleIds.length > 0
    },
    recordedSummary () {
      const added = this.recordedTracksStore.getAddedTracks.length
      const visible = this.recordedTracksStore.getVisibleIds.length
      return `${visible}/${added}`
    },
    offlineGroups () {
      const groups = []
      for (const pkg of this.offlineMapsStore.myTiles) {
        const layers = (pkg.layers || []).filter(layer =>
          this.downloadedKeys.has(sourceKey(pkg.id, layer.layerType))
        )
        if (layers.length === 0) continue
        groups.push({
          packageId: pkg.id,
          packageName: pkg.name,
          source: pkg.source,
          layers
        })
      }
      return groups
    }
  },

  methods: {
    baseLayerLabel (layer) {
      const key = baseLayerLabelKeys[layer.label]
      return key ? this.$t(key) : layer.label
    },

    baseLayerDescription (layer) {
      const key = baseLayerDescriptionKeys[layer.label]
      return key ? this.$t(key) : (layer.attributes || '')
    },

    offlineLayerLabel (layerType) {
      const key = layerLabelKeys[layerType]
      return key ? this.$t(key) : layerType
    },

    offlineLayerDescription (layerType) {
      const key = layerDescriptionKeys[layerType]
      return key ? this.$t(key) : ''
    },

    isOfflineLayerVisible (packageId, layerType) {
      const active = this.offlineMapsStore.activeSources[sourceKey(packageId, layerType)]
      return !!active?.visible
    },

    deactivateAllLayers () {
      for (const l of this.mapStore.getLayers) {
        if (l.active) l.active = false
      }
      for (const active of Object.values(this.offlineMapsStore.activeSources)) {
        if (active?.visible) {
          this.offlineMapsStore.setLayerVisibility(active.packageId, active.layerType, false)
        }
      }
    },

    selectBaseLayer (layer) {
      if (layer.active) {
        layer.active = false
        return
      }
      this.deactivateAllLayers()
      layer.active = true
    },

    toggleCustomLocations () {
      this.mapStore.setCustomLocationsVisible(!this.mapStore.getCustomLocationsVisible)
    },

    toggleAllGpx () {
      this.gpxStore.setAllVisible(!this.anyGpxVisible)
    },

    toggleAllRecorded () {
      this.recordedTracksStore.setAllVisible(!this.anyRecordedVisible)
    },

    async selectOfflineLayer (packageId, layerType) {
      const key = sourceKey(packageId, layerType)
      const active = this.offlineMapsStore.activeSources[key]

      if (active?.visible) {
        this.offlineMapsStore.setLayerVisibility(packageId, layerType, false)
        return
      }

      this.deactivateAllLayers()

      if (active) {
        this.offlineMapsStore.setLayerVisibility(packageId, layerType, true)
        return
      }

      try {
        await this.offlineMapsStore.downloadAndActivateLayer(packageId, layerType)
      } catch (error) {
        let message
        if (error?.message === OFFLINE_VECTOR_STYLE_MISSING) {
          message = this.$t('offlineVectorStyleMissing')
        } else if (error?.message === OFFLINE_MAPS_REQUIRE_NATIVE) {
          message = this.$t('offlineMapsRequireNative')
        } else {
          message = `${this.$t('downloadFailed')}: ${error?.message || error}`
        }
        this.$q.notify({ type: 'negative', message })
      }
    },

    onCreateClicked () {
      this.$emit('update:modelValue', false)
      this.$emit('create-click')
    }
  },

  mounted () {
    this._downloadedSubscription = liveQuery(() => db.offlineMaps.toArray()).subscribe({
      next: (rows) => {
        const set = new Set()
        for (const r of rows) set.add(sourceKey(r.packageId, r.layerType))
        this.downloadedKeys = set
      },
      error: (e) => console.warn('offlineMaps liveQuery error:', e)
    })

    this.offlineMapsStore.loadMyTiles().catch(() => {})
    this.gpxStore.refresh().catch(() => {})
    this.recordedTracksStore.refresh().catch(() => {})
  },

  beforeUnmount () {
    if (this._downloadedSubscription) {
      this._downloadedSubscription.unsubscribe()
      this._downloadedSubscription = null
    }
  }
}
</script>

<style scoped>
.layer-chooser-card {
  width: 100%;
  max-width: 600px;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}
.recorded-track-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
}
</style>
