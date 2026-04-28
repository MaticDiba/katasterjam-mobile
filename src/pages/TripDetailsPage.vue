<template>
  <q-card class="cave-top">
    <q-card-section>
      <div class="text-overline text-orange-9">{{$t('excursionDetails')}}</div>
      <div class="row no-wrap items-center">
        <div class="col text-h6 ellipsis">
          {{ excursion.name }}
        </div>
      </div>

      <q-fab
        class="absolute"
        style="top: 10px; right: 12px;"
        vertical-actions-align="right"
        color="primary"
        glossy
        icon="keyboard_arrow_down"
        direction="down"
      >
        <q-fab-action label-position="left" color="green" icon="map" :label="$t('showDataOnMap')" @click="showOnMap" />
        <q-fab-action label-position="left" color="red" :icon="favouriteIcon" :label="$t('favourite')" @click="toggleFavourite"/>
        <q-fab-action v-if="canJoinExcursion" label-position="left" color="orange" icon="check" :label="$t('joinExcursion')" @click="joinExcursion" />
      </q-fab>
    </q-card-section>

      <q-card-section horizontal>
        <q-card-section>
          <div class="text-grey text-caption q-pt-md items-center">
          {{$t('excursionParticipants')}}: {{excursion.participants}}
        </div>
        </q-card-section>
        <q-card-actions vertical class="justify-around">
          <q-icon :name="favouriteIcon" :color="excursion.isFavourite ? 'red' : 'default'" size="sm"/>
        </q-card-actions>
    </q-card-section>
    <q-separator />
    <q-markup-table>
      <tbody>
        <tr>
          <td class="text-left table-row-fit">{{$t('caves')}}</td>
          <td class="text-left table-row-fit">
            <span :key="cave.caveNumber" v-for="(cave, index) in excursion.caves">
              {{ cave.caveNumber }} - {{ cave.name }}<span v-if="index+1 < excursion.caves.length">, </span>
            </span>
          </td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('organizations')}}</td>
          <td class="text-left table-row-fit">
            <OrganizationsList :organizations="excursion.organizations"/>
          </td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('dateOfExcursion')}}</td>
          <td class="text-left table-row-fit">{{ formatDate(excursion.dateOfExcursion) }}</td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('excursionDuration')}}</td>
          <td class="text-left table-row-fit">{{ excursion.duration }}h</td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('excursionPurpose')}}</td>
          <td class="text-left table-row-fit">{{ $t(`excursionPurposes.${excursion.type}`) }}</td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('excursionStatus')}}</td>
          <td class="text-left table-row-fit">{{ $t(`excursionStatuses.${excursion.status}`) }}</td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('author')}}</td>
          <td class="text-left table-row-fit">{{ excursion.author }}</td>
        </tr>
      </tbody>
    </q-markup-table>

    <q-separator />
    <q-card-section>
      <div class="q-ml-sm" v-html="excursion.description"></div>
    </q-card-section>

    <q-separator />
    <q-card-section>
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle2">{{ $t('gpxTracks') }}</div>
        <q-space />
        <q-btn
          size="sm"
          color="primary"
          icon="upload_file"
          :label="$t('importGpx')"
          @click="importGpxForExcursion"
        />
      </div>
      <q-list v-if="gpxTracks.length" dense>
        <q-item v-for="track in gpxTracks" :key="track.externalId">
          <q-item-section>
            <q-item-label>{{ track.name }}</q-item-label>
            <q-item-label caption>
              {{ formatDistance(track.stats?.distanceMeters || 0) }} ·
              {{ track.stats?.pointCount || 0 }} {{ $t('gpxPoints').toLowerCase() }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              dense
              icon="map"
              color="green"
              @click="showTrackOnMap(track)"
            />
          </q-item-section>
        </q-item>
      </q-list>
      <div v-else class="text-caption text-grey">{{ $t('gpxListEmpty') }}</div>
    </q-card-section>
  </q-card>
</template>
<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { formatDate } from 'src/helpers/date'
import { api } from 'src/boot/api'
import OrganizationsList from 'src/components/organizations/OrganizationsList.vue'
import { useLocalGpxStore } from 'stores/local-gpx-store'
import { formatDistance } from 'src/helpers/gpx-file'

export default {
  name: 'ExcursionDetailsPage',
  components: { OrganizationsList },
  setup () {
    const { dialog } = useQuasar()
    const excursion = ref(null)
    const gpxTracks = ref([])
    const gpxStore = useLocalGpxStore()

    return {
      confirmDialog: dialog,
      formatDate,
      formatDistance,
      excursion,
      gpxTracks,
      gpxStore
    }
  },
  computed: {
    favouriteIcon () {
      return this.excursion.isFavourite ? 'favorite' : 'favorite_border'
    },
    canJoinExcursion () {
      return !this.excursion.meParticipant && !this.excursion.requestedJoin
    }
  },
  methods: {
    showOnMap () {
      console.log('todo')
    },
    async loadGpxTracks () {
      if (!this.excursion) return
      const key = this.excursion.id && this.excursion.id !== -1
        ? this.excursion.id
        : this.excursion.externalId
      this.gpxTracks = await this.gpxStore.getForExcursion(key)
    },
    importGpxForExcursion () {
      const excursionId = this.excursion.id && this.excursion.id !== -1
        ? this.excursion.id
        : this.excursion.externalId
      this.$router.push({
        name: 'gpx-import',
        query: { excursionId: String(excursionId) }
      })
    },
    async showTrackOnMap (track) {
      await this.gpxStore.addToMap(track.externalId)
      const parsed = await this.gpxStore.loadParsed(track.externalId)
      const extent = parsed?.extent
      this.$router.push({
        path: '/',
        query: extent ? { extent: extent.join(',') } : {}
      })
    },
    async toggleFavourite () {
      if (this.excursion.isFavourite) {
        try {
          await api.delete('/api/favorites/', {
            data: {
              excursionId: this.excursion.id
            }
          })
          this.excursion.isFavourite = false
        } catch (error) {
          console.error(error)
        }
      } else {
        try {
          await api.post('/api/favorites', {
            excursionId: this.excursion.id
          })
          this.excursion.isFavourite = true
        } catch (error) {
          console.error(error)
        }
      }
    },
    async joinExcursion () {
      this.confirmDialog({
        title: `${this.$t('confirm')}`,
        message: `${this.$t('joinExcursionText')}${this.excursion.name}`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await api.post(`/api/excursions/${this.excursion.id}/join`)
          this.excursion.requestedJoin = true
        } catch (error) {
          console.error(error)
        }
      })
    }
  },
  async created () {
    this.excursion = this.$route.meta.excursion
    await this.loadGpxTracks()
  }
}
</script>
