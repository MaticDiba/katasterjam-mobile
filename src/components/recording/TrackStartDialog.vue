<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 320px; max-width: 480px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('trackStartTitle') }}</div>
        <q-space />
        <q-btn flat dense icon="close" @click="cancel" />
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input
          v-model="trackName"
          :label="$t('trackStartName')"
          dense
          outlined
          autofocus
        />

        <div>
          <div class="text-caption text-grey q-mb-xs">{{ $t('trackStartColor') }}</div>
          <div class="row q-gutter-sm">
            <q-btn
              v-for="swatch in palette"
              :key="swatch"
              round
              dense
              size="md"
              :style="{ background: swatch, color: '#fff' }"
              :icon="selectedColor === swatch ? 'check' : undefined"
              @click="selectedColor = swatch"
            />
          </div>
        </div>

        <q-select
          v-model="selectedExcursion"
          :options="excursionOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          clearable
          dense
          outlined
          :label="$t('trackStartExcursionOptional')"
          :hint="excursionHint"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$t('trackStartCancel')" @click="cancel" />
        <q-btn
          color="primary"
          :label="$t('trackStartConfirm')"
          icon="play_arrow"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { db } from 'src/db/db'
import { formatDate } from 'src/helpers/date'

const PALETTE = [
  '#e53935', // red
  '#fb8c00', // orange
  '#fdd835', // yellow
  '#43a047', // green
  '#00897b', // teal
  '#1e88e5', // blue
  '#8e24aa', // purple
  '#546e7a' // gray
]

export default {
  name: 'TrackStartDialog',
  props: {
    modelValue: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  data () {
    return {
      palette: PALETTE,
      trackName: '',
      selectedColor: PALETTE[0],
      selectedExcursion: null,
      excursions: []
    }
  },
  computed: {
    open: {
      get () { return this.modelValue },
      set (val) { this.$emit('update:modelValue', val) }
    },
    excursionOptions () {
      return this.excursions.map(e => ({
        // Stable identifier we can resolve back to a server id later.
        value: typeof e.id === 'number' && e.id > 0 ? e.id : e.externalId,
        label: this.formatExcursion(e)
      }))
    },
    excursionHint () {
      if (this.excursionOptions.length === 0) return this.$t('trackStartExcursionsEmpty')
      return ''
    }
  },
  watch: {
    modelValue (next) {
      if (next) this.reset()
    }
  },
  methods: {
    async reset () {
      this.trackName = new Date().toLocaleString('sl-SI')
      this.selectedColor = PALETTE[0]
      this.selectedExcursion = null
      try {
        const all = await db.excursions.toArray()
        // Most-recent first.
        all.sort((a, b) => {
          const da = new Date(a.dateOfExcursion || 0).getTime()
          const dbt = new Date(b.dateOfExcursion || 0).getTime()
          return dbt - da
        })
        this.excursions = all
      } catch (e) {
        this.excursions = []
      }
    },
    formatExcursion (e) {
      const date = e.dateOfExcursion ? formatDate(e.dateOfExcursion) : ''
      return [e.name, date].filter(Boolean).join(' · ')
    },
    confirm () {
      this.$emit('confirm', {
        name: (this.trackName || '').trim() || new Date().toLocaleString('sl-SI'),
        color: this.selectedColor,
        fkExcursionId: this.selectedExcursion
      })
      this.open = false
    },
    cancel () {
      this.$emit('cancel')
      this.open = false
    }
  }
}
</script>
