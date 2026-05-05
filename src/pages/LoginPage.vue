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
            <q-form @submit.prevent="onSubmit" class="q-gutter-y-md">
              <q-input
                v-model="account.email"
                type="email"
                :label="t('email')"
                outlined
                clearable
                autocomplete="email"
                lazy-rules
                :rules="emailRules"
              />
              <q-input
                v-model="account.password"
                type="password"
                :label="t('password')"
                outlined
                clearable
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
                <span v-if="!indeterminate">{{ Math.round(progress * 100) }}%</span>
              </div>
              <q-linear-progress
                :value="progress"
                :indeterminate="indeterminate"
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
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from 'stores/auth-store'
import { useLocalCavesStore } from 'stores/local-cave-store'
import { useMapStore } from 'stores/map-store'
import { useLocalCustomLocationStore } from 'stores/local-custom-location-store'
import { useLocalExcursionsStore } from 'stores/local-excursion-store'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const route = useRoute()
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
const indeterminate = ref(false)

const emailRules = [
  v => !!v || t('required'),
  v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || t('invalidEmail')
]
const passwordRules = [v => !!v || t('required')]

const syncSteps = [
  { label: 'fetchingCaveData', run: p => cavesStore.tryFetchCavesForOffline(p) },
  { label: 'fetchingCustomLocationData', run: p => customLocations.tryFetchCustomLocationsForOffline(p) },
  { label: 'fetchingCustomLocationTypes', run: () => customLocations.fetchCustomLocationsTypes(), indeterminate: true },
  { label: 'fetchingCustomLocationStatuses', run: () => customLocations.fetchCustomLocationsStatuses(), indeterminate: true },
  { label: 'fetchingExcursionsData', run: p => excursionsStore.tryFetchExcursionsForOffline(p) }
]

async function runStep (step) {
  stepLabel.value = t(step.label)
  indeterminate.value = !!step.indeterminate
  progress.value = 0
  try {
    await step.run(p => {
      progress.value = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 1
    })
  } catch (err) {
    // A single sync step failing must not abort the rest of the chain or
    // make the user think login itself failed — they're already authenticated.
    console.error(`Sync step "${step.label}" failed`, err)
  }
  if (!step.indeterminate) progress.value = 1
}

function safeRedirect () {
  const raw = route.query.redirect
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw
  }
  return '/'
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
      console.error(result.message?.[0])
      $q.notify({ message: t('loginFailed'), color: 'negative' })
      return
    }
    try {
      await mapStore.fetchMapCapabilities()
    } catch (err) {
      console.error('fetchMapCapabilities failed', err)
    }
    for (const step of syncSteps) {
      await runStep(step)
    }
    router.replace(safeRedirect())
  } catch (err) {
    // Only auth-layer errors land here; sync failures are caught in runStep.
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
