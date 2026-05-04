<template>
  <q-dialog v-model="dialog" persistent transition-show="scale" transition-hide="scale">
    <q-card class="text-white q-pa-md" style="width: 80%">
      <q-form @submit="onSubmit" @reset="reset" class="q-gutter-md">
        <div class="text-subtitle1">{{ $t('addPhotos') }}</div>

        <div class="row wrap q-gutter-sm">
          <q-btn
            icon="photo_camera"
            :label="$t('takePhoto')"
            color="secondary"
            outline
            :disable="photos.length >= 10 || submitting"
            @click="takePhoto"
          />
          <q-btn
            icon="photo_library"
            :label="$t('pickFromGallery')"
            color="secondary"
            outline
            :disable="photos.length >= 10 || submitting"
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
              :disable="submitting"
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
          <q-btn
            :label="$t('submit')"
            type="submit"
            color="primary"
            :loading="submitting"
            :disable="submitting || photos.length === 0"
          />
          <q-btn :label="$t('cancel')" type="reset" color="primary" flat class="q-ml-sm" :disable="submitting" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref } from 'vue'
import { Platform, Notify } from 'quasar'
import { useLocalCustomLocationStore } from 'stores/local-custom-location-store'
import { db } from 'src/db/db'
import * as fileStorage from 'src/helpers/file-storage'

export default {
  name: 'AddPhotosDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    locationExternalId: {
      type: String,
      default: null
    }
  },
  emits: ['update:modelValue', 'saved'],
  setup () {
    const localCustomLocationStore = useLocalCustomLocationStore()
    const photos = ref([])
    const submitting = ref(false)
    return {
      photos,
      submitting,
      localCustomLocationStore
    }
  },
  computed: {
    dialog: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      }
    }
  },
  methods: {
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
      this.$refs.fileInputMultiple.click()
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
    async onSubmit () {
      if (this.submitting) return
      if (!this.locationExternalId) {
        console.error('AddPhotosDialog: missing locationExternalId')
        Notify.create({ type: 'negative', message: this.$t('photosAddError') })
        return
      }
      if (this.photos.length === 0) return

      this.submitting = true
      const savedExternalIds = []
      try {
        for (const photo of this.photos) {
          const externalId = await this.localCustomLocationStore.savePhotoLocally(
            this.locationExternalId, photo.blob, photo.fileName, photo.mimeType
          )
          if (externalId) savedExternalIds.push(externalId)
        }

        await this.localCustomLocationStore.sync()

        const allUploaded = savedExternalIds.length > 0 &&
          (await Promise.all(savedExternalIds.map(eid => db.files.get(eid))))
            .every(f => f && f.id !== -1)

        Notify.create({
          type: allUploaded ? 'positive' : 'info',
          message: this.$t(allUploaded ? 'photosSynced' : 'photosSavedOffline')
        })

        this.$emit('saved')
        this.reset()
      } catch (error) {
        console.error('Error adding photos', error)
        Notify.create({ type: 'negative', message: this.$t('photosAddError') })
      } finally {
        this.submitting = false
      }
    },
    reset () {
      for (const photo of this.photos) {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      }
      this.photos = []
      this.dialog = false
    }
  }
}
</script>
