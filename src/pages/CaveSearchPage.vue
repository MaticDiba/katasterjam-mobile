<template>
  <q-input
    v-model="query"
    @update:model-value="executeSearch"
    debounce="500"
    filled
    placeholder="Search"
    hint="Search for cave by name or number"
  >
    <template v-slot:append>
      <q-icon name="search" />
    </template>
    <template v-slot:after>
      <q-btn round dense flat icon="gps_fixed" @click="searchAroundMe" :color="currentSort === 'distance' ? 'light-green' : ''"/>
    </template>
  </q-input>
  <q-list ref="scrollTargetRef" class="scroll" >
    <div v-for="(cave, index) in caves" :key="index" >
      <q-slide-item @left="opt => goTo(opt, cave)">
        <template v-slot:left>
          <q-icon name="assist_walker" />
        </template>
        <q-item clickable @click="caveClick(cave.caveNumber)">
          <q-item-section avatar top>
            <q-avatar icon="info" color="primary" text-color="white" />
          </q-item-section>

          <q-item-section>
            <q-item-label lines="1">{{ cave.caveNumber }} - {{ cave.name }}</q-item-label>
            <q-item-label caption>Length: {{ cave.length }} m, depth: {{ cave.depth }} m</q-item-label>
            <q-item-label caption>{{ cave.organization }}</q-item-label>
            <q-item-label v-if="cave.distance" caption>Distance: {{ parseInt(cave.distance) }} m</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-icon name="map" color="green" size="lg" @click.stop="showOnMapClick(cave)"/>
          </q-item-section>
        </q-item>
      </q-slide-item>
      <q-separator/>
    </div>
  </q-list>
  <q-btn unelevated color="light-blue-7" size="lg" class="full-width" label="Load more" @click="loadMore" :disabled="(totalPages <= pageNumber)"/>
  <q-dialog v-model="confirm" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <q-avatar icon="assist_walker" color="primary" text-color="white" />
        <span class="q-ml-sm">Do you want to start navigation to the cave: <b>[{{selectedCave.caveNumber}}] {{selectedCave.name}}</b>?</span>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Go!" color="primary" v-close-popup @click="navigateToSelectedCave"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref } from 'vue'
import { useCavesStore } from 'stores/cave-store'
export default {
  name: 'CaveSearchPage',
  setup () {
    const store = useCavesStore()

    if (store.getCaves.length === 0) {
      store.searchForCaves().then(() => {
        console.log('caves loaded')
      })
    }
    const query = ref(store.getQuery)
    const selectedCave = ref(null)

    return {
      store,
      query,
      confirm: ref(false),
      selectedCave,
      closeSlider: null
    }
  },
  data () {
    return {
      locationBtnColor: ''
    }
  },
  computed: {
    caves () {
      return this.store.getCaves
    },
    pageNumber () {
      return this.store.getPageNumber
    },
    totalPages () {
      return this.store.getTotalPages
    },
    currentSort () {
      return this.store.getCurrentSort
    }
  },
  methods: {
    goTo ({ reset }, cave) {
      reset()
      console.log('go to cave (TODO): ', cave)
      this.selectedCave = cave
      this.confirm = true
    },
    navigateToSelectedCave () {
      console.log('navigateToSelectedCave to cave (TODO): ', this.selectedCave)

      this.$router.push({
        path: '/',
        query: {
          lat: this.selectedCave.lat,
          lng: this.selectedCave.lng,
          navigate: true
        }
      })
    },
    caveClick (caveNumber) {
      console.log('show cave details (TODO): ', caveNumber)
    },
    showOnMapClick (cave) {
      this.$router.push({
        path: '/',
        query: {
          lat: cave.lat,
          lng: cave.lng
        }
      })
    },
    async loadMore () {
      this.store.incrementPageNumber()

      await this.store.searchForCaves()
    },
    async executeSearch () {
      this.store.clearLocationParameters()
      this.store.addQueryParameter(this.query)
      await this.store.searchForCaves()
    },
    async searchAroundMe () {
      if (this.currentSort) {
        this.store.clearLocationParameters()
        this.store.addQueryParameter(this.query)
        await this.store.searchForCaves()

        return
      }
      this.locationBtnColor = 'light-green'
      if (this.$q.platform.is.cordova) {
        window.BackgroundGeolocation.getCurrentLocation(async (location) => {
          this.query = ''
          this.store.setLocationParameters({
            ...this.store.getSearchParameters,
            query: this.query,
            y: location.latitude,
            x: location.longitude,
            sort: 'distance',
            sortDirection: 'asc',
            pageNumber: 1
          })

          await this.store.searchForCaves()
        }, (code, message) => {
          console.error('Error when trying to fetch location', code, message)
        }, {
          enableHighAccuracy: true
        })
      } else {
        navigator.geolocation.getCurrentPosition(async (position) => {
          this.query = ''
          this.store.setLocationParameters({
            ...this.store.getSearchParameters,
            query: this.query,
            y: position.coords.latitude,
            x: position.coords.longitude,
            sort: 'distance',
            sortDirection: 'asc',
            pageNumber: 1
          })

          await this.store.searchForCaves()
        }, (error) => {
          console.log(error)
        })
      }
    }
  }
}
</script>
