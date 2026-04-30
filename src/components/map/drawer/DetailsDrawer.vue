<template>
  <div class="q-pa-md q-gutter-sm">
    <q-dialog v-model="dialog" position="bottom" @hide="hideDrawer" seamless>
      <q-card style="width: 350px;">

        <q-card-section v-if="drawerLoading" class="row justify-center items-center" >
          <q-spinner
            color="primary"
            size="3em"
            :thickness="2"
          />
        </q-card-section>
        <template v-else>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-weight-bold" v-if="clickedFeature.type !== 'click'">[{{ clickedFeature.id }}] {{ clickedFeature.name }}</div>
            <div class="text-weight-bold" v-else>{{ $t('clickInfo') }}:</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section class="row items-center no-wrap">
            <div>
              <div class="text-grey" v-if="clickedFeature.type === 'cave'">{{ $t('length') }}: {{ clickedFeature.length }} m, {{ $t('depth') }}: {{ clickedFeature.depth }} m</div>
              <div class="text-grey">{{ $t('lat') }}: {{ clickedFeature.lat }}, {{ $t('lng') }}: {{ clickedFeature.lng }}</div>
            </div>
            <q-space />
            <q-btn flat round icon="info" v-if="clickedFeature.type !== 'click'" @click="info(clickedFeature.id)"/>
            <q-btn flat round icon="add_a_photo" v-if="clickedFeature.type === 'poi' && clickedFeature.externalId" @click="addPhotos()"/>
            <q-btn flat round icon="add" v-if="clickedFeature.type == 'click'" @click="addNewLocation()"/>
            <q-btn flat round icon="assist_walker"  @click="goTo()"/>
          </q-card-section>
        </template>
      </q-card>
    </q-dialog>
    <AddPhotosDialog
      v-if="clickedFeature.externalId"
      v-model="showAddPhotos"
      :location-external-id="clickedFeature.externalId"
    />
  </div>
</template>
<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { fromLonLat } from 'ol/proj'
import Point from 'ol/geom/Point'
import { Feature } from 'ol'
import { storeToRefs } from 'pinia'
import { useMapStore } from 'stores/map-store'
import { useLocationStore } from 'stores/location-store'
import AddPhotosDialog from 'src/components/custom-locations/AddPhotosDialog.vue'

export default {
  components: { AddPhotosDialog },
  setup () {
    const quasar = useQuasar()
    const mapStore = useMapStore()
    const locationStore = useLocationStore()
    mapStore.hideDrawer()
    const dialog = ref(false)
    const showAddPhotos = ref(false)
    const { showBottomDrawer } = storeToRefs(mapStore)

    return {
      dialog,
      confirmDialog: quasar.dialog,
      mapStore,
      locationStore,
      showBottomDrawer,
      showAddPhotos
    }
  },
  computed: {
    clickedFeature () {
      return this.mapStore.getClickedFeature
    },
    drawerLoading () {
      return this.mapStore.getDrawerLoading
    }
  },
  methods: {
    hideDrawer () {
      this.mapStore.hideDrawer()
    },
    goTo () {
      const name = `[${this.clickedFeature.id}] ${this.clickedFeature.name}`
      this.confirmDialog({
        title: `${this.$t('confirm')}`,
        message: `${this.$t(this.clickedFeature.type === 'cave' ? 'navigateToCave' : 'navigateToCustomLocation')}: ${name}`,
        cancel: true,
        persistent: true
      }).onOk(() => {
        const coords = fromLonLat([this.clickedFeature.lng, this.clickedFeature.lat])
        const mark = new Feature(new Point(coords))
        this.locationStore.startNavigation(mark)
      })
    },
    info (id) {
      this.$router.push({
        name: this.clickedFeature.type === 'cave' ? 'caves-details' : 'custom-locations-details',
        params: { id }
      })
    },
    addNewLocation () {
      this.locationStore.createNew([this.clickedFeature.lng, this.clickedFeature.lat])
    },
    addPhotos () {
      this.showAddPhotos = true
    }
  },
  watch: {
    showBottomDrawer (newValue, oldValue) {
      this.dialog = newValue
    }
  }
}
</script>
