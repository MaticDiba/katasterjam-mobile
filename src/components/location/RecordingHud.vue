<template>
  <q-chip
    v-if="visible"
    text-color="white"
    icon="fiber_manual_record"
    class="recording-hud-chip"
    :style="{ background: trackColor }"
    clickable
    @click="$emit('stop')"
    :title="$t('trackTapToStop')"
  >
    <span class="hud-pulse" />
    <span class="q-ml-xs">{{ duration }}</span>
    <span class="q-ml-sm">{{ formatDistance(distance) }}</span>
    <span v-if="accuracy != null" class="q-ml-sm text-caption">±{{ Math.round(accuracy) }}m</span>
  </q-chip>
</template>

<script>
import { useLocationStore } from 'stores/location-store'
import { formatDistance } from 'src/helpers/gpx-file'

export default {
  name: 'RecordingHud',
  emits: ['stop'],
  setup () {
    const store = useLocationStore()
    return { store, formatDistance }
  },
  data () {
    return {
      tickerId: null,
      now: Date.now()
    }
  },
  computed: {
    visible () {
      return this.store.getLocationTracking
    },
    accuracy () {
      return this.store.getMyLocationAccuracy
    },
    distance () {
      return this.store.activeTrackDistance || 0
    },
    trackColor () {
      return this.store.activeTrackColor || '#e53935'
    },
    duration () {
      // Find the active track in the store (createdAt timestamp). We don't
      // have direct access without a getter, so rely on a local startedAt
      // captured the first time visible flips true.
      if (!this._startedAt) return '00:00'
      const elapsed = Math.max(0, Math.floor((this.now - this._startedAt) / 1000))
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      const pad = (n) => String(n).padStart(2, '0')
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler (next) {
        if (next) {
          this._startedAt = Date.now()
          this.now = Date.now()
          this._startTicker()
        } else {
          this._stopTicker()
          this._startedAt = null
        }
      }
    }
  },
  beforeUnmount () {
    this._stopTicker()
  },
  methods: {
    _startTicker () {
      this._stopTicker()
      this.tickerId = setInterval(() => {
        this.now = Date.now()
      }, 1000)
    },
    _stopTicker () {
      if (this.tickerId != null) {
        clearInterval(this.tickerId)
        this.tickerId = null
      }
    }
  }
}
</script>

<style scoped>
.recording-hud-chip {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.hud-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: hudPulse 1.2s ease-in-out infinite;
}
@keyframes hudPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
</style>
