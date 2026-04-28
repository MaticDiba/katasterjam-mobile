<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">{{ $t('gpxTracks') }}</div>
      <q-space />
      <q-btn
        v-if="hasPending"
        color="secondary"
        icon="cloud_upload"
        :label="$t('gpxSyncAll')"
        :loading="syncing"
        @click="syncAll"
      />
      <q-btn
        color="primary"
        icon="upload_file"
        :label="$t('importGpx')"
        @click="goToImport"
      />
    </div>

    <q-list v-if="tracks.length" bordered separator>
      <q-item v-for="track in tracks" :key="track.externalId">
        <q-item-section>
          <q-item-label>{{ track.name }}</q-item-label>
          <q-item-label caption>
            {{ formatDistance(track.stats?.distanceMeters || 0) }} ·
            {{ track.stats?.pointCount || 0 }} {{ $t('gpxPoints').toLowerCase() }} ·
            {{ formatDate(track.createdAt) }}
          </q-item-label>
          <q-item-label caption>
            <q-chip v-if="track.id === -1" dense color="orange" text-color="white" icon="cloud_off" size="sm">
              {{ $t('gpxNotSynced') }}
            </q-chip>
            <q-chip v-else dense color="green" text-color="white" icon="cloud_done" size="sm">
              {{ $t('gpxSynced') }}
            </q-chip>
            <q-chip
              v-if="store.isOnMap(track.externalId)"
              dense
              color="blue"
              text-color="white"
              icon="layers"
              size="sm"
            >
              {{ $t('gpxOnMap') }}
            </q-chip>
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="row q-gutter-xs">
            <q-btn
              v-if="track.id === -1"
              flat
              round
              dense
              icon="cloud_upload"
              color="secondary"
              :loading="uploadingIds.has(track.externalId)"
              @click="uploadOne(track)"
            />
            <q-btn
              v-if="!store.isOnMap(track.externalId)"
              flat
              round
              dense
              icon="add_location_alt"
              color="green"
              :title="$t('gpxAddToMap')"
              @click="addToMap(track)"
            />
            <q-btn
              v-else
              flat
              round
              dense
              icon="layers_clear"
              color="blue-grey"
              :title="$t('gpxRemoveFromMap')"
              @click="removeFromMap(track)"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="red"
              @click="confirmDelete(track)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="text-center text-grey q-pa-xl">
      {{ $t('gpxListEmpty') }}
    </div>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import { useQuasar, Notify } from 'quasar'
import { formatDate } from 'src/helpers/date'
import { useLocalGpxStore } from 'stores/local-gpx-store'
import { formatDistance } from 'src/helpers/gpx-file'

export default {
  name: 'GpxListPage',
  setup () {
    const store = useLocalGpxStore()
    return {
      store,
      dialog: useQuasar().dialog,
      formatDate,
      formatDistance,
      syncing: ref(false),
      uploadingIds: ref(new Set())
    }
  },
  computed: {
    tracks () {
      return this.store.getTracks
    },
    hasPending () {
      return this.tracks.some(t => t.id === -1)
    }
  },
  async mounted () {
    await this.store.refresh()
  },
  methods: {
    goToImport () {
      this.$router.push({ name: 'gpx-import' })
    },
    async addToMap (track) {
      await this.store.addToMap(track.externalId)
      const parsed = await this.store.loadParsed(track.externalId)
      const extent = parsed?.extent
      this.$router.push({
        path: '/',
        query: extent ? { extent: extent.join(',') } : {}
      })
    },
    async removeFromMap (track) {
      await this.store.removeFromMap(track.externalId)
    },
    confirmDelete (track) {
      this.dialog({
        title: this.$t('confirm'),
        message: this.$t('gpxDeleteConfirm'),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        await this.store.delete(track.externalId)
      })
    },
    async syncAll () {
      this.syncing = true
      try {
        await this.store.sync()
        Notify.create({ type: 'positive', message: this.$t('gpxSyncDone') })
      } catch (err) {
        console.error(err)
        Notify.create({ type: 'negative', message: this.$t('gpxSyncFailed') })
      } finally {
        this.syncing = false
      }
    },
    async uploadOne (track) {
      this.uploadingIds.add(track.externalId)
      this.uploadingIds = new Set(this.uploadingIds)
      try {
        const result = await this.store.uploadOne(track.externalId)
        if (result && result.id !== -1) {
          Notify.create({ type: 'positive', message: this.$t('gpxSyncDone') })
        } else {
          Notify.create({ type: 'info', message: this.$t('gpxExcursionPending') })
        }
      } catch (err) {
        console.error(err)
        Notify.create({ type: 'negative', message: this.$t('gpxSyncFailed') })
      } finally {
        this.uploadingIds.delete(track.externalId)
        this.uploadingIds = new Set(this.uploadingIds)
      }
    }
  }
}
</script>
