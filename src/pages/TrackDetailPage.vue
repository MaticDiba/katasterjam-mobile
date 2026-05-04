<template>
  <q-page class="q-pa-md">
    <template v-if="track">
      <div class="row items-center q-mb-md q-gutter-sm">
        <q-btn flat round dense icon="arrow_back" @click="$router.back()" />
        <div
          class="track-color-swatch"
          :style="{ background: track.color || '#e53935' }"
        />
        <div class="text-h6 ellipsis">{{ track.name }}</div>
      </div>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <div class="text-caption text-grey">{{ $t('gpxDistance') }}</div>
              <div class="text-h6">{{ formatDistance(track.distance || 0) }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey">{{ $t('gpxDuration') }}</div>
              <div class="text-h6">{{ duration || '—' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey">{{ $t('gpxPoints') }}</div>
              <div class="text-h6">{{ track.pointCount || 0 }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey">{{ $t('trackStartedAt') }}</div>
              <div>{{ formatDate(track.startedAt) }}</div>
            </div>
          </div>

          <q-chip
            v-if="track.status === 'interrupted'"
            color="orange"
            text-color="white"
            icon="warning"
            class="q-mt-sm"
          >
            {{ $t('trackStatusInterrupted') }}
          </q-chip>

          <div v-if="excursion" class="q-mt-sm">
            <div class="text-caption text-grey">{{ $t('trackLinkedExcursion') }}</div>
            <q-chip
              clickable
              icon="hiking"
              color="primary"
              text-color="white"
              @click="openExcursion"
            >
              {{ excursion.name }}
            </q-chip>
          </div>

          <div v-if="track.fkExcursionId != null" class="q-mt-sm">
            <q-chip
              v-if="track.syncedAt"
              color="green"
              text-color="white"
              icon="cloud_done"
            >
              {{ $t('trackSyncSynced') }}
            </q-chip>
            <q-chip
              v-else
              color="orange"
              text-color="white"
              icon="cloud_off"
            >
              {{ $t('trackSyncPending') }}
            </q-chip>
          </div>
        </q-card-section>
      </q-card>

      <div class="q-gutter-sm">
        <q-btn
          :color="track.addedToMap ? 'grey-7' : 'primary'"
          :icon="track.addedToMap ? 'visibility_off' : 'visibility'"
          :label="track.addedToMap ? $t('trackHideFromMap') : $t('trackShowOnMap')"
          @click="toggleOnMap"
        />
        <q-btn
          color="primary"
          icon="file_download"
          :label="$t('trackExportGpx')"
          :loading="exporting"
          @click="exportGpx"
        />
        <q-btn
          v-if="track.fkExcursionId != null && !track.syncedAt"
          color="primary"
          icon="cloud_upload"
          :label="$t('trackSyncRetry')"
          :loading="syncing"
          @click="syncNow"
        />
        <q-btn
          color="secondary"
          icon="edit"
          :label="$t('trackRename')"
          @click="promptRename"
        />
        <q-btn
          color="negative"
          icon="delete"
          :label="$t('delete')"
          @click="confirmDelete"
        />
      </div>
    </template>

    <template v-else>
      <q-spinner v-if="loading" />
      <div v-else class="text-grey">{{ $t('trackNotFound') }}</div>
    </template>
  </q-page>
</template>

<style scoped>
.track-color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
}
</style>

<script>
import { useQuasar, Notify } from 'quasar'
import { db } from 'src/db/db'
import { formatDate } from 'src/helpers/date'
import { formatDistance, formatTrackDuration } from 'src/helpers/gpx-file'
import { useLocalTracksStore } from 'stores/local-tracks-store'

export default {
  name: 'TrackDetailPage',
  setup () {
    const store = useLocalTracksStore()
    return {
      store,
      dialog: useQuasar().dialog,
      formatDate,
      formatDistance
    }
  },
  data () {
    return {
      loading: true,
      track: null,
      excursion: null,
      exporting: false,
      syncing: false
    }
  },
  computed: {
    duration () {
      return this.track ? formatTrackDuration(this.track) : null
    }
  },
  watch: {
    '$route.params.id': {
      immediate: true,
      handler () { this.load() }
    }
  },
  methods: {
    async load () {
      this.loading = true
      this.track = await this.store.getById(this.$route.params.id)
      this.excursion = null
      if (this.track && this.track.fkExcursionId != null) {
        try {
          const ex = typeof this.track.fkExcursionId === 'number'
            ? await db.excursions.where('id').equals(this.track.fkExcursionId).first()
            : await db.excursions.where('externalId').equals(this.track.fkExcursionId).first()
          this.excursion = ex || null
        } catch (e) { /* best effort */ }
      }
      this.loading = false
    },
    openExcursion () {
      if (!this.excursion) return
      const id = this.excursion.id && this.excursion.id !== -1
        ? this.excursion.id
        : this.excursion.externalId
      this.$router.push({ name: 'trips-details', params: { id } })
    },
    async toggleOnMap () {
      const next = !this.track.addedToMap
      await this.store.setAddedToMap(this.track.id, next)
      this.track = await this.store.getById(this.track.id)
    },
    async syncNow () {
      this.syncing = true
      try {
        const result = await this.store.uploadOne(this.track.id)
        if (result == null) {
          Notify.create({ type: 'info', message: this.$t('gpxExcursionPending'), timeout: 5000 })
        } else {
          Notify.create({ type: 'positive', message: this.$t('gpxSyncDone'), timeout: 4000 })
          await this.load()
        }
      } catch (err) {
        console.error('Track sync failed', err)
        Notify.create({ type: 'negative', message: this.$t('trackSyncFailed'), timeout: 5000 })
      } finally {
        this.syncing = false
      }
    },
    promptRename () {
      this.dialog({
        title: this.$t('trackRename'),
        prompt: { model: this.track.name, isValid: v => v && v.trim().length > 0 },
        cancel: true,
        persistent: true
      }).onOk(async (name) => {
        await this.store.rename(this.track.id, name.trim())
        this.track = await this.store.getById(this.track.id)
      })
    },
    confirmDelete () {
      this.dialog({
        title: this.$t('confirm'),
        message: this.$t('trackDeleteConfirm'),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        await this.store.delete(this.track.id)
        this.$router.replace({ name: 'tracks-list' })
      })
    },
    async exportGpx () {
      this.exporting = true
      try {
        const result = await this.store.exportGpx(this.track.id)
        const message = result.method === 'mediastore'
          ? this.$t('trackExportSavedTo', { path: 'Downloads/KatasterJam/' + result.filename })
          : this.$t('trackExportDownloaded', { filename: result.filename })
        Notify.create({ type: 'positive', message, timeout: 5000 })
      } catch (err) {
        console.error('GPX export failed', err)
        Notify.create({ type: 'negative', message: this.$t('trackExportFailed'), timeout: 5000 })
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>
