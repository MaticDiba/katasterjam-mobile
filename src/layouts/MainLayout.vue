<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          Kataster jam
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>
          {{ $t('menu') }}
        </q-item-label>

        <q-item clickable :to="{ name: 'home' }" exact>
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('home') }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable :to="{ name: 'caves' }">
          <q-item-section avatar>
            <q-icon name="egg_alt" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('caves') }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable :to="{ name: 'trips' }">
          <q-item-section avatar>
            <q-icon name="hiking" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('trips') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'custom-locations' }">
          <q-item-section avatar>
            <q-icon name="place" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('customLocations') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'gpx-list' }">
          <q-item-section avatar>
            <q-icon name="route" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('gpxTracks') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'tracks-list' }">
          <q-item-section avatar>
            <q-icon name="timeline" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ $t('tracksRecorded') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'offline-maps' }">
          <q-item-section avatar>
            <q-icon name="map" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Offline Maps</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click.once="logOutButton">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>{{ $t('logOut') }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <TrackingOnboardingDialog
      :model-value="locationStore.onboardingDialogOpen"
      @update:model-value="onOnboardingDialogState"
      @finished="locationStore.onOnboardingFinished()"
      @skipped="locationStore.onOnboardingSkipped()"
    />

    <TrackStartDialog
      :model-value="locationStore.trackStartDialogOpen"
      @update:model-value="onTrackStartDialogState"
      @confirm="locationStore.confirmTrackStart($event)"
      @cancel="locationStore.cancelTrackStart()"
    />
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useLocationStore } from 'stores/location-store'
import TrackingOnboardingDialog from 'src/components/onboarding/TrackingOnboardingDialog.vue'
import TrackStartDialog from 'src/components/recording/TrackStartDialog.vue'

export default defineComponent({
  name: 'MainLayout',

  components: { TrackingOnboardingDialog, TrackStartDialog },

  setup () {
    const store = useAuthStore()
    const locationStore = useLocationStore()
    const leftDrawerOpen = ref(false)

    return {
      store,
      locationStore,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  },
  methods: {
    async logOutButton () {
      try {
        await this.store.logOut()
      } finally {
        this.$router.replace('/login')
      }
    },
    onOnboardingDialogState (open) {
      // Sync the dialog's v-model back to the store, in case the user
      // dismisses with the X button or the persistent dismiss path.
      this.locationStore.onboardingDialogOpen = open
    },
    onTrackStartDialogState (open) {
      // Same v-model sync for the track-start dialog.
      this.locationStore.trackStartDialogOpen = open
    }
  }
})
</script>
