import { defineStore } from 'pinia'
import { Platform, Notify, Dialog } from 'quasar'
import { fromLonLat } from 'ol/proj'
import { db } from 'src/db/db'
import { useLocalTracksStore } from 'src/stores/local-tracks-store'
import { formatDistance, formatDurationCompact } from 'src/helpers/gpx-file'
import { isOnline } from 'src/helpers/network'
import { createTrackSmoother } from 'src/helpers/track-smoothing'

const STARTUP_WATCHDOG_MS = 4000
const RECOVERY_KEY = 'kj.activeTrack'
const ONBOARDING_KEY = 'kj.onboardingComplete'
// Drop fixes worse than this. Stricter than the typical 30m bar: in
// practice it's the only outlier defence (we don't do speed-based rejection
// any more — that broke vehicle tracking). Wait for a clean fix instead of
// recording a noisy one.
const MAX_ACCURACY_METERS = 25

const isOnboardingComplete = () => {
  try { return localStorage.getItem(ONBOARDING_KEY) === '1' } catch (e) { return false }
}
const markOnboardingComplete = () => {
  try { localStorage.setItem(ONBOARDING_KEY, '1') } catch (e) { /* ignore */ }
}

const log = (level, ...args) => console[level]('[location-store]', ...args)

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const readRecoveryState = () => {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

const writeRecoveryState = (state) => {
  try {
    if (state == null) {
      localStorage.removeItem(RECOVERY_KEY)
    } else {
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(state))
    }
  } catch (e) {
    // localStorage can throw in private mode; tracking still works in-memory.
  }
}

export const useLocationStore = defineStore('location', {
  state: () => ({
    foregroundLocationActivated: false,
    isCordova: Platform.is.cordova,
    projection: null,
    rotation: 45,
    watchId: null,
    locationWatchId: null,
    locationPermissionDenied: false,
    locationTracking: false,
    navigationActive: false,
    myLocation: {},
    myTrack: [],
    navigateTo: [],
    addLocation: [],
    activeTrackId: null,
    activeTrackColor: '#e53935',
    activeTrackName: '',
    activeTrackExcursionId: null,
    lastFixCoords: null,
    activeTrackDistance: 0,
    _trackStartedAtMs: null,
    _notifTimerId: null,
    onboardingDialogOpen: false,
    trackStartDialogOpen: false,
    // Set to true while we are waiting for the user to finish onboarding
    // before kicking off the actual tracking start. Used so we know to
    // resume the start flow once they finish or skip the wizard.
    _pendingTrackingStart: false,
    // Kalman-pair smoother for the active recording. Lazily created in
    // _beginTracking(); cleared in _finalizeActiveTrack(). Lives in state
    // for testability but isn't reactive — Pinia leaves plain object
    // values alone unless they're inspected through `.value`.
    _smoother: null
  }),

  getters: {
    getProjection (state) {
      return state.projection
    },
    getRotation (state) {
      return state.rotation
    },
    getLocationTracking (state) {
      return state.locationTracking
    },
    getNavigationActive (state) {
      return state.navigationActive
    },
    getMyLocation (state) {
      return state.myLocation
    },
    getMyLocationAccuracy (state) {
      return state.myLocation.accuracy
    },
    getMyLocationCoordinates (state) {
      return state.myLocation.coordinates
    },
    getMyTrack (state) {
      return state.myTrack
    },
    getNavigateTo (state) {
      return state.navigateTo
    },
    foregroundNotNeeded (state) {
      return !state.locationTracking && !state.navigationActive
    },
    getAddLocation (state) {
      return state.addLocation
    },
    getWatchId (state) {
      return state.watchId
    },
    getLocationWatchId (state) {
      return state.locationWatchId
    }
  },
  actions: {
    initialize (projection) {
      this.projection = projection
      if (!this.isCordova) {
        return
      }

      // ACTIVITY_PROVIDER lets the OS power-manage GPS via activity
      // recognition (walking/still/in-vehicle), so we get prompt updates
      // when moving and let the chip rest when stationary. It auto-falls-
      // back to DISTANCE_FILTER_PROVIDER on devices without Play Services.
      // Smoothing is now handled client-side by the Kalman filter in
      // track-smoothing.js, so 5m / 1s sampling is plenty — over-sampling
      // at 1m just feeds noise into the filter without adding detail.
      // stopOnStillActivity:false keeps fixes flowing during stationary
      // cave-mouth work where the user genuinely isn't walking.
      window.BackgroundGeolocation.configure({
        locationProvider: window.BackgroundGeolocation.ACTIVITY_PROVIDER,
        desiredAccuracy: window.BackgroundGeolocation.HIGH_ACCURACY,
        stationaryRadius: 15,
        distanceFilter: 5,
        stopOnTerminate: false,
        stopOnStillActivity: false,
        debug: false,
        startForeground: true,
        notificationsEnabled: true,
        interval: 1000,
        fastestInterval: 500,
        activitiesInterval: 10000
      })

      window.BackgroundGeolocation.on('authorization', (status) => {
        log('info', 'authorization event', status)
        if (status !== window.BackgroundGeolocation.AUTHORIZED) {
          setTimeout(() => {
            Dialog.create({
              title: 'Kataster jam',
              message: 'Za beleženje sledi je potreben dostop do lokacije. Odprite nastavitve in izberite "Vedno dovoli".',
              ok: { label: 'Odpri nastavitve' },
              cancel: { label: 'Prekliči' }
            }).onOk(() => {
              window.BackgroundGeolocation.showAppSettings()
            })
          }, 1000)
        }
      })

      window.BackgroundGeolocation.on('location', (location) => {
        this.newLocationUpdate(location)
      })

      window.BackgroundGeolocation.on('error', (error) => {
        log('error', 'plugin error event', error)
        const code = error && error.code ? `[${error.code}] ` : ''
        const message = (error && error.message) || 'Beleženje lokacije se ni zagnalo.'
        Notify.create({
          type: 'negative',
          message: `${code}${message}`,
          timeout: 6000,
          actions: [{ label: 'Nastavitve', color: 'white', handler: () => window.BackgroundGeolocation.showAppSettings() }]
        })
        this.foregroundLocationActivated = false
      })

      window.BackgroundGeolocation.on('start', () => {
        log('info', 'service started')
      })
      window.BackgroundGeolocation.on('stop', () => {
        log('info', 'service stopped')
        this.foregroundLocationActivated = false
        if (this.locationTracking) {
          // Service stop event always means a clean shutdown — either the
          // user tapped Stop in the notification, or the JS side called
          // stop(). OS hard-kills don't get to fire this event (the
          // WebView dies with the service); those are detected on next
          // app launch via checkForInterruptedTrack.
          this.locationTracking = false
          this._finalizeActiveTrack('completed')
            .then(finalised => {
              if (finalised) this._showFinishDialog(finalised)
            })
            .catch(e => log('error', 'finalize on stop failed', e))
        }
      })
    },
    async newLocationUpdate (location, options = {}) {
      // First gate: drop the worst GPS warm-up readings before they can
      // pollute Kalman state.
      if (location.accuracy != null && location.accuracy > MAX_ACCURACY_METERS) {
        return
      }

      // The dot is real-time — feed it raw coords from whichever source
      // arrived (JS watcher in foreground, BG plugin always).
      const dotCoords = fromLonLat([location.longitude, location.latitude])
      this.myLocation = {
        coordinates: dotCoords,
        accuracy: location.accuracy,
        latitude: location.latitude,
        longitude: location.longitude
      }

      if (this.getNavigationActive) {
        this.updateNavigation(dotCoords)
      }

      // The polyline + persistence are driven by the BG plugin only, with
      // Kalman smoothing applied. JS-watcher fixes update the dot above
      // and stop here — having two sources push to the polyline produced
      // jagged results before.
      if (options.fromJsWatch) return

      if (this.getLocationTracking) {
        const sm = this._smoother
          ? this._smoother.push(location.latitude, location.longitude)
          : { lat: location.latitude, lon: location.longitude }
        const smoothedCoords = fromLonLat([sm.lon, sm.lat])
        this.updateMyTrack(smoothedCoords)
        // Persist raw lat/lon — re-tunable later by changing Kalman params
        // and re-rendering. The DB stays the ground truth.
        await this._persistTrackPoint(location)
      }

      this._signalBgFinish()
    },
    _signalBgFinish () {
      // iOS-only: the plugin needs finish() inside every location callback
      // or iOS will kill the app for not signalling completion of its
      // background processing window. No-op on Android.
      if (!this.isCordova) return
      try {
        if (typeof window.BackgroundGeolocation?.finish === 'function') {
          window.BackgroundGeolocation.finish()
        }
      } catch (e) { /* ignore */ }
    },
    async _persistTrackPoint (location) {
      if (this.activeTrackId == null) return
      const ts = location.time || Date.now()

      // Distance accumulation for live notification & final stats.
      if (this.lastFixCoords) {
        this.activeTrackDistance += haversineMeters(
          this.lastFixCoords[0], this.lastFixCoords[1],
          location.latitude, location.longitude
        )
      }
      this.lastFixCoords = [location.latitude, location.longitude]

      try {
        await db.trackPoints.add({
          trackId: this.activeTrackId,
          timestamp: ts,
          lat: location.latitude,
          lon: location.longitude,
          accuracy: location.accuracy ?? null,
          altitude: location.altitude ?? null,
          speed: location.speed ?? null
        })
        // Touch the recovery state on every fix — survives app death.
        writeRecoveryState({
          activeTrackId: this.activeTrackId,
          lastFixTimestamp: ts
        })
      } catch (e) {
        log('error', 'failed to persist track point', e)
      }
    },
    async _createTrack (options = {}) {
      const tracksStore = useLocalTracksStore()
      const id = await tracksStore.createTrack({
        name: options.name,
        color: options.color,
        fkExcursionId: options.fkExcursionId
      })
      this.activeTrackId = id
      this.activeTrackName = options.name || ''
      this.activeTrackColor = options.color || '#e53935'
      this.activeTrackExcursionId = options.fkExcursionId || null
      this.lastFixCoords = null
      this.activeTrackDistance = 0
      this._trackStartedAtMs = Date.now()
      writeRecoveryState({ activeTrackId: id, lastFixTimestamp: Date.now() })
      log('info', 'created track', id, options)
    },
    async _finalizeActiveTrack (status) {
      if (this.activeTrackId == null) return null
      const id = this.activeTrackId
      const startedAtMs = this._trackStartedAtMs
      const finishedAt = new Date()
      const finalDistance = Math.round(this.activeTrackDistance)
      const excursionId = this.activeTrackExcursionId
      let pointCount = 0
      this._stopNotifTimer()
      try {
        pointCount = await db.trackPoints.where('trackId').equals(id).count()
        await db.tracks.update(id, {
          status,
          endedAt: finishedAt.toISOString(),
          distance: finalDistance,
          pointCount,
          // Show the just-finished track on the map straight away — the user
          // wanted recordings to land on the map by default. They can toggle
          // it off via the layer chooser or remove it from the tracks list.
          addedToMap: status === 'completed',
          mapVisible: true
        })
        // Pull the new state into the local-tracks-store so the layer chooser
        // / RecordedTracksLayer reactively pick up the change.
        try { await useLocalTracksStore().refresh() } catch (e) { /* best effort */ }
      } catch (e) {
        log('error', 'failed to finalize track', e)
      }
      this.activeTrackId = null
      this.activeTrackName = ''
      this.activeTrackColor = '#e53935'
      this.activeTrackExcursionId = null
      this.lastFixCoords = null
      this.activeTrackDistance = 0
      this._trackStartedAtMs = null
      // Clear the live polyline so TrackingLayer goes blank between sessions.
      this.myTrack = []
      // Drop the Kalman state — next _beginTracking() builds a fresh one.
      this._smoother = null
      writeRecoveryState(null)
      // Auto-trigger upload if linked to an excursion and we're online.
      // Fire-and-forget; uploadPending() will retry on next onOnline tick.
      if (status === 'completed' && excursionId != null && this.isCordova && isOnline.value) {
        useLocalTracksStore().uploadOne(id).catch(e => log('warn', 'auto-upload failed', e))
      }
      return { trackId: id, status, startedAtMs, finishedAt, finalDistance, pointCount, excursionId }
    },
    _refreshNotification () {
      if (!this.locationTracking || !this.isCordova) return
      const elapsed = formatDurationCompact(Date.now() - (this._trackStartedAtMs || Date.now()))
      const dist = formatDistance(Math.round(this.activeTrackDistance))
      const acc = this.myLocation && this.myLocation.accuracy
        ? `±${Math.round(this.myLocation.accuracy)}m`
        : ''
      const text = `${elapsed} · ${dist}${acc ? ' ' + acc : ''}`
      try {
        window.BackgroundGeolocation.configure({
          notificationTitle: 'Kataster jam – beleženje sledi',
          notificationText: text
        })
      } catch (e) {
        // Plugin may have torn down; ignore.
      }
    },
    _startNotifTimer () {
      this._stopNotifTimer()
      if (!this.isCordova) return
      // First refresh runs immediately, then on a 10s cadence.
      this._refreshNotification()
      this._notifTimerId = setInterval(() => this._refreshNotification(), 10_000)
    },
    _stopNotifTimer () {
      if (this._notifTimerId != null) {
        clearInterval(this._notifTimerId)
        this._notifTimerId = null
      }
    },
    async checkForInterruptedTrack () {
      const recovery = readRecoveryState()
      if (!recovery || recovery.activeTrackId == null) return

      // Ground truth: ask the native service if it is still alive. A stale
      // lastFixTimestamp on its own is NOT a kill signal — the user can be
      // stationary indoors for minutes without any new fix while the FG
      // service is perfectly healthy.
      if (this.isCordova && window.BackgroundGeolocation) {
        const stillRunning = await new Promise(resolve => {
          try {
            window.BackgroundGeolocation.checkStatus(
              (status) => resolve(!!(status && status.isRunning)),
              () => resolve(false)
            )
          } catch (e) {
            resolve(false)
          }
        })
        if (stillRunning) {
          // Service is alive; this was a normal background/resume cycle.
          // Re-arm our local flags so the UI matches reality and keep the
          // recovery beacon in place for the next genuine kill.
          this.activeTrackId = recovery.activeTrackId
          this.locationTracking = true
          this.foregroundLocationActivated = true
          log('info', 'recovery skipped: native service still running')
          return
        }
      }

      const track = await db.tracks.get(recovery.activeTrackId)
      if (!track) {
        writeRecoveryState(null)
        return
      }

      // Native service is gone but we still had an active track; this is a
      // real interruption. Mark up front so the user sees the right status
      // even if they dismiss the dialog without acting.
      const pointCount = await db.trackPoints.where('trackId').equals(track.id).count()
      await db.tracks.update(track.id, {
        status: 'interrupted',
        endedAt: track.endedAt || new Date(recovery.lastFixTimestamp || Date.now()).toISOString(),
        pointCount
      })
      writeRecoveryState(null)
      this.locationTracking = false
      this.activeTrackId = null

      const lastFixAt = recovery.lastFixTimestamp
        ? new Date(recovery.lastFixTimestamp).toLocaleTimeString('sl-SI')
        : 'neznana'
      Dialog.create({
        title: 'Beleženje prekinjeno',
        message: `Beleženje sledi "${track.name}" se je prekinilo. Zadnja zabeležena točka: ${lastFixAt}. Točke do prekinitve so shranjene.`,
        ok: { label: 'V redu' }
      })
    },
    async toggleLocationTracking () {
      if (!this.locationTracking) {
        // First-time gating: show onboarding wizard before anything else.
        if (this.isCordova && !isOnboardingComplete()) {
          this._pendingTrackingStart = true
          this.onboardingDialogOpen = true
          return
        }
        // Onboarding done (or web preview): show the start dialog so the user
        // can pick a name, color, and optional excursion.
        this.trackStartDialogOpen = true
      } else {
        // Going from on → off: confirm first — the recording chip sits very
        // close to the layer-toggle FAB and accidental taps were ending
        // recordings prematurely.
        Dialog.create({
          title: 'Ustavi beleženje?',
          message: 'Trenutna sled bo shranjena in beleženje se bo zaključilo.',
          ok: { label: 'Ustavi', color: 'negative' },
          cancel: { label: 'Prekliči', flat: true },
          persistent: true
        }).onOk(async () => {
          this.locationTracking = false
          this.stopForeground()
          const finalised = await this._finalizeActiveTrack('completed')
          if (finalised) this._showFinishDialog(finalised)
        })
      }
    },
    async confirmTrackStart (options) {
      this.trackStartDialogOpen = false
      await this._beginTracking(options || {})
    },
    cancelTrackStart () {
      this.trackStartDialogOpen = false
    },
    async _beginTracking (options) {
      const opts = options || {}
      if (this.isCordova) {
        window.BackgroundGeolocation.configure({
          notificationTitle: 'Kataster jam – beleženje sledi',
          notificationText: opts.name || 'Beleženje GPS sledi je v teku'
        })
      }
      // Fresh polyline for the new session — guards against any stragglers
      // left over from an interrupted previous track.
      this.myTrack = []
      // Fresh Kalman state per track so the previous track's filter doesn't
      // bias the start of this one.
      this._smoother = createTrackSmoother()
      await this._createTrack(opts)
      this.locationTracking = true
      this.startForeground()
      this._startNotifTimer()
    },
    async onOnboardingFinished () {
      markOnboardingComplete()
      this.onboardingDialogOpen = false
      if (this._pendingTrackingStart) {
        this._pendingTrackingStart = false
        // After onboarding, fall through to the start dialog rather than
        // jumping straight into recording — user still needs to pick options.
        this.trackStartDialogOpen = true
      }
    },
    onOnboardingSkipped () {
      // Don't mark complete — user will see the wizard again next time.
      // Don't auto-start either; they bailed out.
      this.onboardingDialogOpen = false
      this._pendingTrackingStart = false
    },
    _showFinishDialog ({ trackId, startedAtMs, finishedAt, finalDistance, pointCount }) {
      const finished = finishedAt instanceof Date ? finishedAt : new Date(finishedAt)
      const elapsedMs = startedAtMs ? Math.max(0, finished.getTime() - startedAtMs) : 0
      const duration = formatDurationCompact(elapsedMs)
      const dist = formatDistance(finalDistance || 0)
      Dialog.create({
        title: 'Beleženje zaključeno',
        message: `${duration} · ${dist} · ${pointCount} točk`,
        ok: { label: 'V redu' },
        cancel: { label: 'Pokaži sled', flat: true }
      }).onCancel(() => {
        // Cancel-button click is wired to "Show track" so the user can navigate
        // straight to the detail page after stopping. Use a hash-route nav so
        // we don't have to inject vue-router into a Pinia action.
        try {
          if (typeof window !== 'undefined' && window.location) {
            window.location.hash = `#/tracks/${trackId}`
          }
        } catch (e) { /* navigation best-effort */ }
      })
    },
    stopNavigation () {
      this.navigationActive = false
      this.stopForeground()
      this.updateNavigation([])
    },
    startNavigation (goTo) {
      this.goTo = goTo
      if (this.navigateTo.length === 2) {
        this.navigateTo[0] = this.goTo.getGeometry().getCoordinates()
      }
      if (this.isCordova) {
        window.BackgroundGeolocation.configure({
          notificationTitle: 'Kataster jam – navigacija',
          notificationText: 'Navigacija do lokacije je v teku'
        })
      }
      this.navigationActive = true
      this.startForeground()
    },
    startForeground () {
      if (this.foregroundLocationActivated) {
        return
      }
      if (!this.isCordova) {
        this.foregroundLocationActivated = true
        return
      }

      this.foregroundLocationActivated = true
      window.BackgroundGeolocation.checkStatus((status) => {
        log('info', 'pre-start status', status)
        if (status.isRunning) {
          return
        }
        if (!status.locationServicesEnabled) {
          Notify.create({
            type: 'warning',
            message: 'GPS je izključen. Vklopite ga v sistemskih nastavitvah.',
            timeout: 6000
          })
          this.foregroundLocationActivated = false
          this.locationTracking = false
          this.navigationActive = false
          this._finalizeActiveTrack('interrupted').catch(() => {})
          return
        }

        Promise.resolve(window.BackgroundGeolocation.start()).catch((err) => {
          log('error', 'start() rejected', err)
          Notify.create({
            type: 'negative',
            message: 'Napaka pri zagonu beleženja: ' + (err && err.message ? err.message : err),
            timeout: 6000
          })
          this.foregroundLocationActivated = false
          this.locationTracking = false
          this._finalizeActiveTrack('interrupted').catch(() => {})
        })

        setTimeout(() => {
          if (!this.foregroundLocationActivated) {
            return
          }
          window.BackgroundGeolocation.checkStatus((later) => {
            if (later && later.isRunning) {
              return
            }
            log('warn', 'service not running after start()', later)
            Notify.create({
              type: 'warning',
              message: 'Beleženje se ni zagnalo. Preverite dovoljenje "Vedno dovoli" za lokacijo in dovoljenje za obvestila.',
              timeout: 8000,
              actions: [{ label: 'Nastavitve', color: 'white', handler: () => window.BackgroundGeolocation.showAppSettings() }]
            })
            this.foregroundLocationActivated = false
            this.locationTracking = false
            this._finalizeActiveTrack('interrupted').catch(() => {})
          })
        }, STARTUP_WATCHDOG_MS)
      })
    },
    stopForeground () {
      if (this.foregroundLocationActivated && this.foregroundNotNeeded) {
        if (this.isCordova) {
          window.BackgroundGeolocation.stop()
        }
        this.foregroundLocationActivated = false
      }
    },
    updateMyTrack (coords) {
      this.myTrack.push(coords)
    },
    updateNavigation (coords) {
      this.navigateTo = coords.length === 0 ? [] : [this.goTo.getGeometry().getCoordinates(), coords]
    },
    initCompassAndLocation () {
      if ('compass' in navigator && this.watchId == null) {
        this.watchId = navigator.compass.watchHeading((heading) => {
          this.rotation = heading.magneticHeading
        }, (compassError) => {
          console.warn('Compass not available (error code: ' + compassError.code + ')')
        }, {
          frequency: 1000
        })
      } else if (!('compass' in navigator)) {
        console.log('Compass not supported on this device.')
      }
      if (this.locationWatchId != null) {
        return
      }
      this.locationWatchId = navigator.geolocation.watchPosition((position) => {
        // The JS watchPosition stream is much smoother than what
        // BackgroundGeolocation produces in foreground. Always feed it into
        // the dot/polyline; mark it so newLocationUpdate skips DB writes
        // (BackgroundGeolocation handles persistence — it's the source that
        // keeps producing fixes when the app is backgrounded).
        this.locationPermissionDenied = false
        this.newLocationUpdate(position.coords, { fromJsWatch: true })
      }, (err) => {
        console.error('Error when trying to fetch location', err && err.code, err && err.message)
        if (err && err.code === 1) {
          this.locationPermissionDenied = true
        }
        // Clear the id so a future requestMyLocation()/initCompassAndLocation()
        // can re-arm the watch once permission flips back on.
        if (this.locationWatchId != null) {
          try { navigator.geolocation.clearWatch(this.locationWatchId) } catch (e) { /* ignore */ }
          this.locationWatchId = null
        }
      }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000
      })
    },
    clearWatches () {
      if (this.watchId != null && navigator.compass && navigator.compass.clearWatch) {
        try { navigator.compass.clearWatch(this.watchId) } catch (e) { /* ignore */ }
      }
      this.watchId = null
      if (this.locationWatchId != null) {
        try { navigator.geolocation.clearWatch(this.locationWatchId) } catch (e) { /* ignore */ }
      }
      this.locationWatchId = null
    },
    requestMyLocation () {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((position) => {
          this.locationPermissionDenied = false
          this.newLocationUpdate(position.coords, { fromJsWatch: true })
          // Re-arm the continuous watch now that the user granted permission.
          this.initCompassAndLocation()
          resolve(this.myLocation.coordinates)
        }, (err) => {
          if (err && err.code === 1) {
            this.locationPermissionDenied = true
          }
          reject(err)
        }, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        })
      })
    },
    createNew (location) {
      this.addLocation = location
    }
  }
})
