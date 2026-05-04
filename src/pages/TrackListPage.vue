<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h6">{{ $t('tracksRecorded') }}</div>
      <q-space />
    </div>

    <q-list v-if="tracks.length" bordered separator>
      <q-item
        v-for="track in tracks"
        :key="track.id"
        clickable
        @click="openDetail(track)"
      >
        <q-item-section avatar>
          <div
            class="track-color-dot"
            :style="{ background: track.color || '#e53935' }"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ track.name }}</q-item-label>
          <q-item-label caption>
            {{ formatDistance(track.distance || 0) }}
            <span v-if="durationOf(track)"> · {{ durationOf(track) }}</span>
            · {{ track.pointCount || 0 }} {{ $t('gpxPoints').toLowerCase() }}
          </q-item-label>
          <q-item-label caption>
            {{ formatDate(track.startedAt) }}
            <q-chip
              v-if="track.status === 'interrupted'"
              dense
              color="orange"
              text-color="white"
              size="sm"
              icon="warning"
            >
              {{ $t('trackStatusInterrupted') }}
            </q-chip>
            <q-chip
              v-else-if="track.status === 'recording'"
              dense
              color="red"
              text-color="white"
              size="sm"
              icon="fiber_manual_record"
            >
              {{ $t('trackStatusRecording') }}
            </q-chip>
            <q-chip
              v-if="track.fkExcursionId != null && track.syncedAt"
              dense
              color="green"
              text-color="white"
              size="sm"
              icon="cloud_done"
            >
              {{ $t('trackSyncSynced') }}
            </q-chip>
            <q-chip
              v-else-if="track.fkExcursionId != null"
              dense
              color="orange"
              text-color="white"
              size="sm"
              icon="cloud_off"
            >
              {{ $t('trackSyncPending') }}
            </q-chip>
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-toggle
            :model-value="!!track.addedToMap"
            color="teal"
            :title="track.addedToMap ? $t('trackHideFromMap') : $t('trackShowOnMap')"
            @click.stop="onMapToggle(track)"
          />
        </q-item-section>

        <q-item-section side>
          <q-icon name="chevron_right" />
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="text-center text-grey q-pa-xl">
      {{ $t('tracksListEmpty') }}
    </div>
  </q-page>
</template>

<script>
import { formatDate } from 'src/helpers/date'
import { formatDistance, formatTrackDuration } from 'src/helpers/gpx-file'
import { useLocalTracksStore } from 'stores/local-tracks-store'

export default {
  name: 'TrackListPage',
  setup () {
    const store = useLocalTracksStore()
    return { store, formatDate, formatDistance }
  },
  computed: {
    tracks () {
      return this.store.getTracks
    }
  },
  async mounted () {
    await this.store.refresh()
  },
  methods: {
    durationOf (track) {
      return formatTrackDuration(track)
    },
    openDetail (track) {
      this.$router.push({ name: 'tracks-detail', params: { id: track.id } })
    },
    async onMapToggle (track) {
      await this.store.setAddedToMap(track.id, !track.addedToMap)
    }
  }
}
</script>

<style scoped>
.track-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
}
</style>
