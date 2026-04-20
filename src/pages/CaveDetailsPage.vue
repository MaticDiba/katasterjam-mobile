<template>
  <q-card class="cave-top">
    <SimpleHeaderMap :center="center" :markLocations="markLocations"/>
    <q-card-section>
      <q-fab
        class="absolute"
        style="top: 0; right: 12px; transform: translateY(-50%);"
        vertical-actions-align="right"
        color="primary"
        glossy
        icon="keyboard_arrow_up"
        direction="up"
      >
        <q-fab-action label-position="left" color="green" icon="map" :label="$t('mainMap')" @click="showOnMap" />
        <q-fab-action label-position="left" color="red" :icon="favouriteIcon" :label="$t('favourite')" @click="toggleFavourite"/>
        <q-fab-action label-position="left" color="orange" icon="assist_walker" :label="$t('navigate')" @click="goTo" />
      </q-fab>
      <div class="text-overline text-orange-9">{{$t('caveDetails')}}</div>
      <div class="row no-wrap items-center">
        <div class="col text-h6 ellipsis">
          {{cave.caveNumber}} - {{ cave.name }}
        </div>
        <div class="col-auto text-grey text-caption q-pt-md row no-wrap items-center">
          <q-icon :name="favouriteIcon" :color="cave.isFavourite ? 'red' : 'default'" size="sm"/>
        </div>
      </div>
      <div class="row no-wrap items-center">
        <div class="col-auto text-grey text-caption q-pt-md row no-wrap items-center">
          {{$t('length')}}: {{ cave.length }} m, {{$t('depth')}}: {{ cave.depth }} m
        </div>
      </div>
    </q-card-section>
    <q-separator />
    <q-markup-table>
      <tbody>
        <tr v-if="cave.organizations">
          <td class="text-left table-row-fit">{{$t('organizations')}}</td>
          <td class="text-left table-row-fit">
            <OrganizationsList :organizations="cave.organizations"/>
          </td>
        </tr>
        <tr v-if="cave.dateOfExcursion">
          <td class="text-left table-row-fit">{{$t('dateOfDiscovery')}}</td>
          <td class="text-left table-row-fit">{{ formatDate(cave.dateOfExcursion) }}</td>
        </tr>
        <tr v-if="cave.author">
          <td class="text-left table-row-fit">{{$t('authorsOfReport')}}</td>
          <td class="text-left table-row-fit">{{ cave.author }}</td>
        </tr>
        <tr v-if="cave.team">
          <td class="text-left table-row-fit">{{$t('discoverers')}}</td>
          <td class="text-left table-row-fit">{{ cave.team }}</td>
        </tr>
        <tr v-if="cave.dateOfSubmission">
          <td class="text-left table-row-fit">{{$t('importDate')}}</td>
          <td class="text-left table-row-fit">{{ formatDate(cave.dateOfSubmission) }}</td>
        </tr>
        <tr v-if="cave.notes">
          <td class="text-left table-row-fit">{{$t('note')}}</td>
          <td class="text-left table-row-fit">{{ cave.notes }}</td>
        </tr>
        <tr v-if="cave.turisticCave">
          <td class="text-left table-row-fit">{{$t('showCave')}}</td>
          <td class="text-left table-row-fit">{{ (cave.turisticCave ? 'Yes' : 'No')}}</td>
        </tr>
        <tr v-if="cave.caveTypes">
          <td class="text-left table-row-fit">{{$t('type')}}</td>
          <td class="text-left table-row-fit">
            <span v-for="({name, description}, idx) in cave.caveTypes" :key="idx">
              {{name}} - {{$t(`caveTypes.${description}`)}}
            </span>
          </td>
        </tr>
        <tr v-if="cave.xcoordinate">
          <td class="text-left table-row-fit">{{$t('dk48')}}</td>
          <td class="text-left table-row-fit">{{ cave.xcoordinate }}, {{ cave.ycoordinate }}</td>
        </tr>
        <tr>
          <td class="text-left table-row-fit">{{$t('wgs84')}}</td>
          <td class="text-left table-row-fit">{{ cave.lng.toFixed(5) }}, {{ cave.lat.toFixed(5) }}</td>
        </tr>
        <tr v-if="cave.entranceElevation">
          <td class="text-left table-row-fit">{{$t('entranceElevation')}}</td>
          <td class="text-left table-row-fit">{{ cave.entranceElevation }} m</td>
        </tr>
        <tr v-if="cave.settlement">
          <td class="text-left table-row-fit">{{$t('closestTown')}}</td>
          <td class="text-left table-row-fit">{{ cave.settlement?.name }}</td>
        </tr>
        <tr v-if="cave.settlement">
          <td class="text-left table-row-fit">{{$t('municipality')}}</td>
          <td class="text-left table-row-fit">{{ cave.settlement?.municipality }}</td>
        </tr>
        <tr v-if="cave.kadasterMunicipality">
          <td class="text-left table-row-fit">{{$t('kadasterMunicipality')}}</td>
          <td class="text-left table-row-fit">{{ cave.kadasterMunicipality?.name }}</td>
        </tr>
      </tbody>
    </q-markup-table>
  </q-card>
</template>

<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { fromLonLat } from 'ol/proj'
import Point from 'ol/geom/Point'
import { Feature } from 'ol'
import OrganizationsList from 'src/components/organizations/OrganizationsList.vue'
import { api } from 'src/boot/api'
import { formatDate } from 'src/helpers/date'
import SimpleHeaderMap from 'src/components/map/SimpleHeaderMap.vue'

export default {
  name: 'CaveDetailsPage',
  components: { OrganizationsList, SimpleHeaderMap },
  setup () {
    const { dialog } = useQuasar()
    const center = ref([1637531, 5766419])
    const markLocations = ref([])
    const cave = ref(null)
    const confirmRef = ref(null)

    return {
      confirmDialog: dialog,
      center,
      confirm: ref(false),
      markLocations,
      cave,
      confirmRef,
      formatDate
    }
  },
  computed: {
    favouriteIcon () {
      return this.cave.isFavourite ? 'favorite' : 'favorite_border'
    },
    selectedName () {
      return `[${this.cave?.caveNumber}] ${this.cave?.name}`
    }
  },
  methods: {
    goTo () {
      this.confirm = true
      const name = `[${this.cave?.caveNumber}] ${this.cave?.name}`
      this.confirmDialog({
        title: `${this.$t('confirm')}`,
        message: `${this.$t('navigateToCave')}: ${name}`,
        cancel: true,
        persistent: true
      }).onOk(() => {
        this.$router.push({
          path: '/',
          query: {
            lat: this.cave.lat,
            lng: this.cave.lng,
            navigate: true,
            name
          }
        })
      })
    },
    showOnMap () {
      this.$router.push({
        path: '/',
        query: {
          lat: this.cave.lat,
          lng: this.cave.lng
        }
      })
    },
    async toggleFavourite () {
      if (this.cave.isFavourite) {
        try {
          await api.delete('/api/favorites/', {
            data: {
              caveId: this.cave.caveNumber
            }
          })
          this.cave.isFavourite = false
        } catch (error) {
          console.error(error)
        }
      } else {
        try {
          await api.post('/api/favorites', {
            caveId: this.cave.caveNumber
          })
          this.cave.isFavourite = true
        } catch (error) {
          console.error(error)
        }
      }
    }
  },
  created () {
    this.cave = this.$route.meta.cave
    const coords = fromLonLat([this.cave.lng, this.cave.lat])
    this.center = coords
    const mark = new Feature(new Point(coords))
    this.markLocations = [mark]
  }
}
</script>

<style>
.table-row-fit {
  word-wrap: break-word;
  white-space: normal !important
}
</style>
