<template>
  <q-dialog v-model="dialog" persistent transition-show="scale" transition-hide="scale">
    <q-card class="text-white q-pa-md" style="width: 80%">
      <q-form
      @submit="onSubmit"
      @reset="reset"
      class="q-gutter-md"
      >
        <q-input
          filled
          v-model="name"
          :label="$t('customLocationName')"
          :hint="$t('locationNameHint')"
          lazy-rules
          :rules="[ inputValidator ]"
        />
        <q-input
          filled
          v-model="description"
          :label="$t('customLocationDescription')"
          lazy-rules
          :rules="[ inputValidator ]"
        />
        <q-select v-model="selectedType" :options="typeOptions" :label="$t('customLocationType')"
          lazy-rules
          :rules="[dropDownValidator]"/>
        <q-select v-model="selectedStatus" :options="statusOptions" :label="$t('customLocationStatus')"
          lazy-rules
          :rules="[dropDownValidator]"/>
        <q-select
        filled
        v-model="selectedExcursion"
        clearable
        use-input
        hide-selected
        fill-input
        input-debounce="0"
        :label="$t('excursion')"
        :options="excursionOptions"
        @filter="filterFn"
        @filter-abort="abortFilterFn"
        >
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey">
                {{$t('noResults')}}
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <div class="row wrap q-gutter-sm">
          <q-btn
            icon="photo_camera"
            :label="$t('takePhoto')"
            color="secondary"
            outline
            :disable="photos.length >= 10"
            @click="takePhoto"
          />
          <q-btn
            icon="photo_library"
            :label="$t('pickFromGallery')"
            color="secondary"
            outline
            :disable="photos.length >= 10"
            @click="pickPhoto"
          />
        </div>

        <div v-if="photos.length > 0" class="row q-gutter-sm">
          <div v-for="(photo, index) in photos" :key="index" class="relative-position">
            <q-img :src="photo.previewUrl" style="width: 120px; height: 120px" fit="cover" class="rounded-borders" />
            <q-btn
              round
              dense
              icon="close"
              size="sm"
              class="absolute-top-right text-white"
              style="background: rgba(0,0,0,0.5); margin: 2px;"
              @click="removePhoto(index)"
            />
          </div>
        </div>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          style="display: none"
          @change="onFileSelected"
        />
        <input
          ref="fileInputMultiple"
          type="file"
          accept="image/*"
          multiple
          style="display: none"
          @change="onFilesSelected"
        />

        <div class="q-gutter-md row items-center justify-end">
          <q-btn :label="$t('submit')" type="submit" color="primary" :loading="submitting" :disable="submitting"/>
          <q-btn :label="$t('cancel')" type="reset" color="primary" flat class="q-ml-sm" />
        </div>
    </q-form>

    </q-card>
  </q-dialog>
</template>

<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Platform, Notify } from 'quasar'
import { v4 as uuidv4 } from 'uuid'
import { getDBDateNow } from 'src/helpers/date'
import { useLocationStore } from 'stores/location-store'
import { useLocalExcursionsStore } from 'stores/local-excursion-store'
import { useLocalCustomLocationStore } from 'stores/local-custom-location-store'
import * as fileStorage from 'src/helpers/file-storage'
export default {
  setup () {
    const locationStore = useLocationStore()
    const excursionStore = useLocalExcursionsStore()
    const localCustomLocationStore = useLocalCustomLocationStore()
    const dialog = ref(false)
    const name = ref(null)
    const description = ref(null)
    const photos = ref([])
    const submitting = ref(false)
    const { getAddLocation } = storeToRefs(locationStore)
    const excursionOptions = ref([])
    const typeOptions = ref([])
    const statusOptions = ref([])
    localCustomLocationStore.getCustomLocationsTypes.then(types => {
      typeOptions.value = types.map(t => {
        return {
          value: t.id,
          label: t.name
        }
      })
    })
    localCustomLocationStore.getCustomLocationsStatuses.then(statuses => {
      statusOptions.value = statuses.map(s => {
        return {
          value: s.id,
          label: s.description
        }
      })
    })

    return {
      dialog,
      name,
      description,
      photos,
      submitting,
      getAddLocation,
      locationStore,
      excursionStore,
      localCustomLocationStore,
      selectedType: ref(null),
      typeOptions,
      selectedStatus: ref(null),
      statusOptions,
      selectedExcursion: ref(null),
      excursionOptions
    }
  },
  computed: {
  },
  methods: {
    async onSubmit () {
      if (this.submitting) return
      this.submitting = true
      const externalId = uuidv4()
      try {
        await this.localCustomLocationStore.add({
          id: -1,
          createdDate: getDBDateNow(),
          description: this.description,
          externalId,
          isAuthor: true,
          lat: this.getAddLocation[1],
          lng: this.getAddLocation[0],
          name: this.name,
          organizations: [],
          typeId: this.selectedType.value,
          statusId: this.selectedStatus.value,
          excursionId: this.selectedExcursion?.value
        })

        for (const photo of this.photos) {
          await this.localCustomLocationStore.savePhotoLocally(
            externalId, photo.blob, photo.fileName, photo.mimeType
          )
        }

        await this.localCustomLocationStore.sync()
        const synced = await this.localCustomLocationStore.getByExternalId(externalId)
        if (synced && synced.id !== -1) {
          Notify.create({ type: 'positive', message: this.$t('locationSynced') })
        } else {
          Notify.create({ type: 'info', message: this.$t('locationSavedOffline') })
        }
        this.reset()
      } catch (error) {
        console.error('Error creating custom location', error)
        await this.localCustomLocationStore.rollbackCreate(externalId)
        Notify.create({ type: 'negative', message: this.$t('locationCreateError') })
      } finally {
        this.submitting = false
      }
    },
    takePhoto () {
      if (Platform.is.cordova) {
        navigator.camera.getPicture(
          (fileUri) => this.addPhotoFromUri(fileUri),
          (err) => {
            console.error('Camera error', err)
            Notify.create({ type: 'warning', message: this.$t('cameraError') })
          },
          {
            quality: 70,
            destinationType: window.Camera.DestinationType.FILE_URI,
            sourceType: window.Camera.PictureSourceType.CAMERA,
            correctOrientation: true,
            targetWidth: 1280
          }
        )
      } else {
        this.$refs.fileInput.click()
      }
    },
    pickPhoto () {
      if (Platform.is.cordova) {
        navigator.camera.getPicture(
          async (base64Data) => {
            try {
              const blob = await fetch('data:image/jpeg;base64,' + base64Data).then(r => r.blob())
              const previewUrl = URL.createObjectURL(blob)
              this.photos.push({
                blob,
                fileName: `gallery-${Date.now()}.jpg`,
                mimeType: 'image/jpeg',
                previewUrl
              })
            } catch (err) {
              console.error('Error processing gallery photo', err)
              Notify.create({ type: 'warning', message: this.$t('galleryError') })
            }
          },
          (err) => {
            console.error('Gallery error', err)
            Notify.create({ type: 'warning', message: this.$t('galleryError') })
          },
          {
            quality: 70,
            destinationType: window.Camera.DestinationType.DATA_URL,
            sourceType: window.Camera.PictureSourceType.PHOTOLIBRARY,
            correctOrientation: true,
            targetWidth: 1280
          }
        )
      } else {
        this.$refs.fileInputMultiple.click()
      }
    },
    async addPhotoFromUri (fileUri) {
      try {
        const fileName = fileUri.split('/').pop() || `photo-${Date.now()}.jpg`
        const blob = await fileStorage.readFileAsBlob(fileUri)
        const previewUrl = URL.createObjectURL(blob)
        this.photos.push({
          blob,
          fileName,
          mimeType: blob.type || 'image/jpeg',
          previewUrl
        })
      } catch (err) {
        console.error('Error reading photo from URI', err)
        Notify.create({ type: 'warning', message: this.$t('cameraError') })
      }
    },
    onFileSelected (event) {
      const file = event.target.files[0]
      if (file) {
        this.addPhotoFromFile(file)
      }
      event.target.value = ''
    },
    onFilesSelected (event) {
      for (const file of event.target.files) {
        if (this.photos.length >= 10) {
          Notify.create({ type: 'warning', message: this.$t('photoLimitReached') })
          break
        }
        this.addPhotoFromFile(file)
      }
      event.target.value = ''
    },
    addPhotoFromFile (file) {
      const previewUrl = URL.createObjectURL(file)
      this.photos.push({
        blob: file,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        previewUrl
      })
    },
    removePhoto (index) {
      const photo = this.photos[index]
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl)
      }
      this.photos.splice(index, 1)
    },
    reset () {
      this.dialog = false
      this.name = null
      this.description = null
      this.selectedExcursion = null
      this.selectedStatus = null
      this.selectedType = null
      for (const photo of this.photos) {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      }
      this.photos = []
    },
    filterFn (val, update, abort) {
      setTimeout(() => {
        update(
          async () => {
            this.excursionStore.addQueryParameter(val.toLowerCase())
            await this.excursionStore.search()
            this.excursionOptions = this.excursionStore.getExcursions.map(e => {
              return {
                label: e.name,
                value: e.id
              }
            })
            this.excursionStore.addQueryParameter()
          },
          ref => {
            if (val !== '' && ref.options.length > 0) {
              ref.setOptionIndex(-1)
              ref.moveOptionSelection(1, true)
            }
          }
        )
      }, 300)
    },
    abortFilterFn () {
      console.log('delayed filter aborted')
    },
    inputValidator (val) {
      return (val && val.length > 0) || this.$t('required')
    },
    dropDownValidator (val) {
      return val || this.$t('required')
    }
  },
  watch: {
    getAddLocation (newValue, oldValue) {
      this.dialog = newValue?.length > 0
    }
  }
}
</script>
