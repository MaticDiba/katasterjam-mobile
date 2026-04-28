<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="text-h6">{{ $t('importGpx') }}</div>
      </q-card-section>

      <q-card-section v-if="!loaded">
        <q-btn
          icon="upload_file"
          color="primary"
          :label="$t('pickGpxFile')"
          @click="openFilePicker"
        />
        <input
          ref="fileInput"
          type="file"
          accept=".gpx,application/gpx+xml,application/octet-stream"
          style="display: none"
          @change="onFileSelected"
        />
      </q-card-section>

      <q-form v-else class="q-gutter-md q-px-md q-pb-md" @submit.prevent="onSubmit">
        <div class="text-caption text-grey">{{ fileName }}</div>

        <q-input
          v-model="name"
          filled
          :label="$t('gpxTrackName')"
          :rules="[val => (val && val.length > 0) || $t('required')]"
        />

        <q-select
          v-model="selectedExcursion"
          filled
          clearable
          use-input
          hide-selected
          fill-input
          input-debounce="250"
          :label="$t('excursion')"
          :options="excursionOptions"
          @filter="filterExcursions"
        >
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey">
                {{ $t('noResults') }}
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <q-select
          v-model="selectedStatus"
          filled
          :label="$t('gpxStatus')"
          :options="statusOptions"
          :rules="[val => !!val || $t('required')]"
        />

        <q-list dense v-if="stats" bordered class="rounded-borders">
          <q-item>
            <q-item-section>{{ $t('gpxDistance') }}</q-item-section>
            <q-item-section side>{{ formatDistance(stats.distanceMeters) }}</q-item-section>
          </q-item>
          <q-item v-if="stats.durationSec">
            <q-item-section>{{ $t('gpxDuration') }}</q-item-section>
            <q-item-section side>{{ formatDuration(stats.durationSec) }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>{{ $t('gpxPoints') }}</q-item-section>
            <q-item-section side>{{ stats.pointCount }}</q-item-section>
          </q-item>
        </q-list>

        <q-checkbox
          v-model="uploadNow"
          :label="$t('gpxUploadNow')"
        />
        <div v-if="!isOnline" class="text-caption text-grey">
          {{ $t('gpxOfflineNote') }}
        </div>

        <div class="row q-gutter-sm justify-end">
          <q-btn
            :label="$t('cancel')"
            flat
            color="primary"
            @click="onCancel"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('save')"
            :loading="saving"
          />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import { Notify } from 'quasar'
import { useLocalGpxStore } from 'stores/local-gpx-store'
import { useLocalExcursionsStore } from 'stores/local-excursion-store'
import { useGpxIntakeStore } from 'stores/gpx-intake-store'
import { parseGpx, readFileAsText, formatDistance, formatDuration } from 'src/helpers/gpx-file'
import { isOnline } from 'src/helpers/network'

export default {
  name: 'GpxImportPage',
  setup () {
    const gpxStore = useLocalGpxStore()
    const excursionsStore = useLocalExcursionsStore()
    const intakeStore = useGpxIntakeStore()

    return {
      gpxStore,
      excursionsStore,
      intakeStore,
      isOnline,
      loaded: ref(false),
      fileName: ref(''),
      text: ref(null),
      name: ref(''),
      selectedExcursion: ref(null),
      selectedStatus: ref(null),
      stats: ref(null),
      excursionOptions: ref([]),
      saving: ref(false),
      uploadNow: ref(isOnline.value),
      formatDistance,
      formatDuration
    }
  },
  computed: {
    statusOptions () {
      return [
        { value: 1, label: this.$t('gpxStatusPublic') },
        { value: 2, label: this.$t('gpxStatusPrivate') },
        { value: 3, label: this.$t('gpxStatusClub') },
        { value: 4, label: this.$t('gpxStatusRegistered') }
      ]
    }
  },
  async mounted () {
    const intake = this.intakeStore.consume()
    if (intake?.text != null) {
      this.applyText(intake.text, intake.name)
    }
    const excursionId = intake?.defaultExcursionId ?? this.$route.query.excursionId
    if (excursionId != null && excursionId !== '') {
      await this.preselectExcursion(excursionId)
    }
    this.selectedStatus = this.statusOptions[0]
  },
  methods: {
    openFilePicker () {
      this.$refs.fileInput.click()
    },
    async onFileSelected (event) {
      const picked = event.target.files[0]
      event.target.value = ''
      if (picked) await this.loadFile(picked)
    },
    applyText (text, fileName) {
      try {
        const parsed = parseGpx(text)
        this.text = text
        this.fileName = fileName || 'track.gpx'
        this.loaded = true
        this.name = parsed.trackName || this.fileName.replace(/\.gpx$/i, '')
        this.stats = parsed.stats
      } catch (err) {
        console.error('Invalid GPX file:', err?.message || err, err)
        Notify.create({
          type: 'negative',
          message: `${this.$t('gpxInvalidFile')}: ${err?.message || err}`,
          timeout: 8000
        })
      }
    },
    async loadFile (file) {
      try {
        const text = await readFileAsText(file)
        this.applyText(text, file.name)
      } catch (err) {
        console.error('Invalid GPX file:', err?.message || err, err)
        Notify.create({
          type: 'negative',
          message: `${this.$t('gpxInvalidFile')}: ${err?.message || err}`,
          timeout: 8000
        })
      }
    },
    async preselectExcursion (excursionId) {
      const excursion = await this.excursionsStore.get(excursionId)
      if (excursion) {
        this.selectedExcursion = { label: excursion.name, value: excursion.id }
      }
    },
    filterExcursions (val, update) {
      update(async () => {
        this.excursionsStore.addQueryParameter((val || '').toLowerCase())
        await this.excursionsStore.search()
        this.excursionOptions = this.excursionsStore.getExcursions.map(e => ({
          label: e.name,
          value: e.id
        }))
      })
    },
    onCancel () {
      this.$router.back()
    },
    async onSubmit () {
      if (!this.loaded || this.text == null) return
      this.saving = true
      try {
        const { record, extent } = await this.gpxStore.importFromText(this.text, this.fileName, {
          excursionId: this.selectedExcursion?.value ?? null,
          statusId: this.selectedStatus?.value ?? 1,
          name: this.name
        })
        await this.gpxStore.addToMap(record.externalId)

        if (this.uploadNow && this.isOnline) {
          try {
            const uploaded = await this.gpxStore.uploadOne(record.externalId)
            if (uploaded && uploaded.id !== -1) {
              Notify.create({ type: 'positive', message: this.$t('gpxSyncDone') })
            } else {
              Notify.create({ type: 'info', message: this.$t('gpxImportSuccess') })
            }
          } catch (err) {
            console.error('Immediate upload failed', err)
            Notify.create({ type: 'warning', message: this.$t('gpxImportSuccess') })
          }
        } else {
          Notify.create({ type: 'positive', message: this.$t('gpxImportSuccess') })
        }

        this.$router.replace({
          path: '/',
          query: {
            extent: extent.join(',')
          }
        })
      } catch (err) {
        console.error('GPX import failed', err)
        Notify.create({ type: 'negative', message: this.$t('gpxInvalidFile') })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
