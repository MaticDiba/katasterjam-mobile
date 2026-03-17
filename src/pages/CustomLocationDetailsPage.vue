<template>
  <q-card class="cave-top">
    <SimpleHeaderMap :center="center" :markLocations="markLocations"/>
    <q-card-section>
      <div class="text-overline text-orange-9">{{$t('customLocationDetails')}}</div>
      <div class="row no-wrap items-center">
        <div class="col text-h6 ellipsis">
          {{ customLocation.name }}<q-icon v-if="customLocation.isAuthor" name="check" />
        </div>
      </div>

      <q-fab
        class="absolute"
        style="top: 0; right: 12px; transform: translateY(-50%);"
        vertical-actions-align="right"
        color="primary"
        glossy
        icon="keyboard_arrow_down"
        direction="down"
      >
        <q-fab-action label-position="left" color="green" icon="map" :label="$t('mainMap')" @click="showOnMap" />
        <q-fab-action label-position="left" color="orange" icon="assist_walker" :label="$t('navigate')" @click="goTo" />
      </q-fab>
    </q-card-section>

      <q-card-section horizontal>
        <q-card-section>
          <div class="text-grey text-caption q-pt-md items-center">
          {{$t('date')}}: {{ formatDate(customLocation.createdDate) }}
        </div>
        </q-card-section>
    </q-card-section>
    <q-separator />
    <q-markup-table>
      <tbody>
        <tr v-if="customLocation.organizations">
          <td class="text-left table-row-fit">{{$t('organizations')}}</td>
          <td class="text-left table-row-fit">
            <OrganizationsList :organizations="customLocation.organizations"/>
          </td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('latLng')}}</td>
          <td class="text-left table-row-fit">{{ customLocation.lat }}, {{ customLocation.lng }}</td>
        </tr>
        <tr v-if="customLocation.xgk">
          <td class="text-left table-row-fit">{{$t('GKCoordinates')}}</td>
          <td class="text-left table-row-fit">{{ customLocation.xgk }}, {{ customLocation.ygk }}</td>
        </tr>
        <tr v-if="customLocation.type">
          <td class="text-left table-row-fit">{{$t('customLocationType')}}</td>
          <td class="text-left table-row-fit">{{ $t(`customLocationTypes.${customLocation.type}`) }}</td>
        </tr>
        <tr v-if="customLocation.status">
          <td class="text-left table-row-fit">{{$t('customLocationStatus')}}</td>
          <td class="text-left table-row-fit">{{ $t(`customLocationStatuses.${customLocation.status}`) }}</td>
        </tr>
        <tr v-if="customLocation.elevation">
          <td class="text-left table-row-fit">{{$t('elevation')}}</td>
          <td class="text-left table-row-fit">{{ parseInt(customLocation.elevation) }} {{ $t('elevationAbrv') }}</td>
        </tr>
        <tr v-if="customLocation.geology">
          <td class="text-left table-row-fit">{{$t('geology')}}</td>
          <td class="text-left table-row-fit">{{ customLocation.geology }}</td>
        </tr>
        <tr v-if="customLocation.settlement">
          <td class="text-left table-row-fit">{{$t('settlement')}}</td>
          <td class="text-left table-row-fit">{{ customLocation.settlement }}</td>
        </tr>
        <tr v-if="customLocation.municipalty">
          <td class="text-left table-row-fit">{{$t('municipalty')}}</td>
          <td class="text-left table-row-fit">{{ customLocation.municipalty }}</td>
        </tr>
      </tbody>
    </q-markup-table>

    <q-separator />
    <q-card-section>
      <div class="q-ml-sm" v-html="customLocation.description"></div>
    </q-card-section>

    <template v-if="loadingPhotos || photos.length > 0">
      <q-separator />
      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">{{ $t('photos') }}</div>
        <div v-if="loadingPhotos" class="row justify-center q-pa-md">
          <q-spinner-dots color="primary" size="32px" />
        </div>
        <div v-else class="row q-gutter-sm">
          <div v-for="(photo, index) in photos" :key="photo.externalId || `photo-${index}`">
            <q-img
              :src="photo.url"
              style="width: 120px; height: 120px; border-radius: 8px; cursor: pointer;"
              fit="cover"
              @click="openPhoto(photo)"
            >
              <template v-slot:loading>
                <q-spinner-dots color="primary" />
              </template>
            </q-img>
          </div>
        </div>
      </q-card-section>
    </template>

    <q-dialog v-model="showPhotoDialog" maximized>
      <q-card class="bg-black column no-wrap" style="width: 100vw; height: 100vh;">
        <div class="col relative-position" style="overflow: hidden;">
          <q-img :src="selectedPhotoUrl" fit="contain" class="full-height full-width" />
          <q-inner-loading :showing="loadingFullPhoto" dark>
            <q-spinner-dots size="40px" color="white" />
          </q-inner-loading>
        </div>
        <q-card-actions align="right" class="bg-black">
          <q-btn flat :label="$t('close')" color="white" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>
<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { formatDate } from 'src/helpers/date'
import { fromLonLat } from 'ol/proj'
import Point from 'ol/geom/Point'
import SimpleHeaderMap from 'src/components/map/SimpleHeaderMap.vue'
import OrganizationsList from 'src/components/organizations/OrganizationsList.vue'
import { Feature } from 'ol'
import { useLocalCustomLocationStore } from 'src/stores/local-custom-location-store'
import { api } from 'src/boot/axios'
import { isOnline } from 'src/helpers/network'
export default {
  name: 'customLocationDetailsPage',
  components: { OrganizationsList, SimpleHeaderMap },
  setup () {
    const { dialog } = useQuasar()
    const center = ref([1637531, 5766419])
    const markLocations = ref([])
    const customLocation = ref(null)
    const photos = ref([])
    const loadingPhotos = ref(false)
    const showPhotoDialog = ref(false)
    const selectedPhotoUrl = ref('')
    const loadingFullPhoto = ref(false)
    const fullPhotoUrls = ref([])
    const localStore = useLocalCustomLocationStore()

    return {
      center,
      markLocations,
      confirmDialog: dialog,
      formatDate,
      customLocation,
      photos,
      loadingPhotos,
      showPhotoDialog,
      selectedPhotoUrl,
      loadingFullPhoto,
      fullPhotoUrls,
      localStore
    }
  },
  methods: {
    async openPhoto (photo) {
      this.selectedPhotoUrl = photo.url
      this.showPhotoDialog = true

      if (photo.isLocal) return

      this.loadingFullPhoto = true
      try {
        const response = await api.get(`/api/documents/${photo.id}`, { responseType: 'blob' })
        const fullUrl = URL.createObjectURL(response.data)
        if (!this.showPhotoDialog) {
          URL.revokeObjectURL(fullUrl)
          return
        }
        this.fullPhotoUrls.push(fullUrl)
        this.selectedPhotoUrl = fullUrl
      } catch (e) {
        console.warn('Failed to load full photo', e)
      } finally {
        this.loadingFullPhoto = false
      }
    },
    async loadPhotos () {
      for (const photo of this.photos) {
        if (photo.url && photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url)
        }
      }
      this.loadingPhotos = true
      const photoList = []
      let localPhotos = []

      try {
        if (this.customLocation.externalId) {
          localPhotos = await this.localStore.getLocalPhotos(this.customLocation.externalId)
          photoList.push(...localPhotos)
        }

        if (isOnline.value && this.customLocation.id > 0) {
          try {
            const localServerIds = new Set(localPhotos.filter(p => p.id > 0).map(p => p.id))
            const response = await api.get('/api/documents', {
              params: { CustomLocationId: this.customLocation.id, pageSize: 50 }
            })
            const remoteDocs = response.data.filter(doc => !localServerIds.has(doc.id))
            const batchSize = 5
            for (let i = 0; i < remoteDocs.length; i += batchSize) {
              const batch = remoteDocs.slice(i, i + batchSize)
              const thumbResults = await Promise.allSettled(
                batch.map(async (doc) => {
                  const thumbResponse = await api.get(`/api/documents/Thumbnail/${doc.id}`, { responseType: 'blob' })
                  return { id: doc.id, url: URL.createObjectURL(thumbResponse.data), isLocal: false, name: doc.name }
                })
              )
              for (const result of thumbResults) {
                if (result.status === 'fulfilled') {
                  photoList.push(result.value)
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch remote documents', e)
          }
        }
      } finally {
        this.loadingPhotos = false
      }

      this.photos = photoList
    },
    goTo () {
      this.confirm = true
      const name = `${this.customLocation?.name}`
      this.confirmDialog({
        title: `${this.$t('confirm')}`,
        message: `${this.$t('navigateToCustomLocation')}: ${name}`,
        cancel: true,
        persistent: true
      }).onOk(() => {
        this.$router.push({
          path: '/',
          query: {
            lat: this.customLocation.lat,
            lng: this.customLocation.lng,
            navigate: true,
            customLocation: true,
            name
          }
        })
      })
    },
    showOnMap () {
      this.$router.push({
        path: '/',
        query: {
          lat: this.customLocation.lat,
          lng: this.customLocation.lng,
          customLocation: true
        }
      })
    }
  },
  watch: {
    showPhotoDialog (visible) {
      if (!visible) {
        for (const url of this.fullPhotoUrls) {
          URL.revokeObjectURL(url)
        }
        this.fullPhotoUrls = []
        this.selectedPhotoUrl = ''
      }
    }
  },
  created () {
    this.customLocation = this.$route.meta.customLocation
    const coords = fromLonLat([this.customLocation.lng, this.customLocation.lat])
    this.center = coords
    const mark = new Feature(new Point(coords))
    this.markLocations = [mark]
    this.loadPhotos()
  },
  beforeUnmount () {
    for (const photo of this.photos) {
      if (photo.url && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url)
      }
    }
    for (const url of this.fullPhotoUrls) {
      URL.revokeObjectURL(url)
    }
  }
}
</script>
