<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="login-page column items-center justify-center q-pa-md">
        <div class="login-brand text-center q-mb-lg">
          <q-icon name="terrain" size="80px" color="white" />
          <div class="text-h4 text-white text-weight-bold q-mt-sm">eKatasterJam</div>
          <div class="text-subtitle1 text-grey-3 q-mt-xs">{{ t('loginTagline') }}</div>
        </div>

        <q-card class="login-card full-width">
          <q-card-section>
            <q-form @submit.prevent="onSubmit" class="q-gutter-md">
              <q-input
                v-model="account.email"
                type="email"
                :label="t('email')"
                outlined
                autocomplete="email"
                lazy-rules
                :rules="emailRules"
              />
              <q-input
                v-model="account.password"
                type="password"
                :label="t('password')"
                outlined
                autocomplete="current-password"
                lazy-rules
                :rules="passwordRules"
              />
              <q-btn
                type="submit"
                color="primary"
                :label="t('loginLabel')"
                :loading="loggingIn"
                unelevated
                class="full-width"
              >
                <template v-slot:loading>
                  <q-spinner-hourglass class="on-right" />
                  {{ t('loggingIn') }}
                </template>
              </q-btn>
            </q-form>

            <div v-if="loggingIn" class="q-mt-md">
              <div class="row items-center justify-between text-caption text-grey-7 q-mb-xs">
                <span>{{ stepLabel }}</span>
                <span>{{ Math.round(progress * 100) }}%</span>
              </div>
              <q-linear-progress
                :value="progress"
                color="primary"
                rounded
                instant-feedback
              />
            </div>
          </q-card-section>

          <q-separator />
          <q-card-section class="text-center text-grey-7 q-py-sm">
            {{ t('register') }}
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from 'stores/auth-store'
import { useLocalCavesStore } from 'stores/local-cave-store'
import { useMapStore } from 'stores/map-store'
import { useLocalCustomLocationStore } from 'stores/local-custom-location-store'
import { useLocalExcursionsStore } from 'stores/local-excursion-store'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const $q = useQuasar()

const authStore = useAuthStore()
const cavesStore = useLocalCavesStore()
const mapStore = useMapStore()
const customLocations = useLocalCustomLocationStore()
const excursionsStore = useLocalExcursionsStore()

const account = reactive({ email: '', password: '' })
const loggingIn = ref(false)
const progress = ref(0)
const stepLabel = ref('')

const emailRules = [
  v => !!v || t('required'),
  v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || t('invalidEmail')
]
const passwordRules = [v => !!v || t('required')]

async function runStep (labelKey, fn) {
  stepLabel.value = t(labelKey)
  progress.value = 0
  await fn(p => { progress.value = p })
  progress.value = 1
}

async function onSubmit () {
  loggingIn.value = true
  try {
    const result = await authStore.login({
      email: account.email,
      password: account.password,
      rememberMe: true
    })
    if (!result.success) {
      console.error(result.message[0])
      $q.notify({ message: t('loginFailed'), color: 'negative' })
      return
    }
    await mapStore.fetchMapCapabilities()
    await runStep('fetchingCaveData', p => cavesStore.tryFetchCavesForOffline(p))
    await runStep('fetchingCustomLocationData', p => customLocations.tryFetchCustomLocationsForOffline(p))
    stepLabel.value = t('fetchingCustomLocationTypes')
    await customLocations.fetchCustomLocationsTypes()
    stepLabel.value = t('fetchingCustomLocationStatuses')
    await customLocations.fetchCustomLocationsStatuses()
    await runStep('fetchingExcursionsData', p => excursionsStore.tryFetchExcursionsForOffline(p))
    router.replace('/')
  } catch (err) {
    console.error(err)
    $q.notify({ message: t('loginFailed'), color: 'negative' })
  } finally {
    loggingIn.value = false
  }
}
</script>

<style scoped>
.login-page {
  background: linear-gradient(160deg, #1976D2 0%, #0d47a1 100%);
}
.login-card {
  max-width: 420px;
  border-radius: 12px;
}
.login-brand {
  user-select: none;
}
</style>
