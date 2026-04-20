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
  </q-card>
</template>
<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { formatDate } from 'src/helpers/date'
import { api } from 'src/boot/api'
import OrganizationsList from 'src/components/organizations/OrganizationsList.vue'
export default {
  name: 'ExcursionDetailsPage',
  components: { OrganizationsList },
  setup () {
    const { dialog } = useQuasar()
    const excursion = ref(null)

    return {
      confirmDialog: dialog,
      formatDate,
      excursion
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
  created () {
    this.excursion = this.$route.meta.excursion
  }
}
</script>
