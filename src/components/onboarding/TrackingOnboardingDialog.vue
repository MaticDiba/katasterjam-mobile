<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 320px; max-width: 480px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('onboardingTitle') }}</div>
        <q-space />
        <q-btn flat dense icon="close" @click="skip" />
      </q-card-section>

      <q-stepper
        v-model="step"
        flat
        animated
        header-nav
        :contracted="$q.screen.lt.md"
      >
        <q-step :name="1" :title="$t('onboardingStep1Title')" icon="my_location">
          <p>{{ $t('onboardingStep1Body') }}</p>
        </q-step>

        <q-step :name="2" :title="$t('onboardingStep2Title')" icon="travel_explore">
          <p>{{ $t('onboardingStep2Body') }}</p>
          <q-btn
            color="primary"
            icon="settings"
            :label="$t('onboardingOpenAppSettings')"
            @click="openAppSettings"
          />
        </q-step>

        <q-step :name="3" :title="$t('onboardingStep3Title')" icon="battery_charging_full">
          <p>{{ $t('onboardingStep3Body') }}</p>
          <q-btn
            color="primary"
            icon="bolt"
            :label="$t('onboardingDisableBatteryOpt')"
            :loading="batteryWorking"
            @click="askBatteryExemption"
          />
        </q-step>

        <q-step
          v-if="oem"
          :name="4"
          :title="$t('onboardingStep4Title')"
          icon="warning"
        >
          <p>{{ oemGuidanceText }}</p>
          <q-btn
            color="warning"
            icon="settings"
            :label="$t('onboardingOpenAppSettings')"
            @click="openAppSettings"
          />
        </q-step>

        <q-step
          :name="oem ? 5 : 4"
          :title="$t('onboardingDoneTitle')"
          icon="check_circle"
        >
          <p>{{ $t('onboardingDoneBody') }}</p>
        </q-step>

        <template #navigation>
          <q-stepper-navigation>
            <q-btn
              v-if="step > 1"
              flat
              :label="$t('back')"
              class="q-mr-sm"
              @click="step = step - 1"
            />
            <q-btn
              v-if="!isLast"
              color="primary"
              :label="$t('next')"
              @click="step = step + 1"
            />
            <q-btn
              v-else
              color="primary"
              :label="$t('onboardingFinish')"
              @click="finish"
            />
          </q-stepper-navigation>
        </template>
      </q-stepper>
    </q-card>
  </q-dialog>
</template>

<script>
import { useQuasar, Notify } from 'quasar'
import { detectOem, oemGuidanceKey, requestIgnoreBatteryOptimizations, openBatteryOptimizationSettings } from 'src/helpers/oem-survival'

export default {
  name: 'TrackingOnboardingDialog',
  props: {
    modelValue: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'finished', 'skipped'],
  setup () {
    return { $q: useQuasar() }
  },
  data () {
    return {
      step: 1,
      oem: detectOem(),
      batteryWorking: false
    }
  },
  computed: {
    open: {
      get () { return this.modelValue },
      set (val) { this.$emit('update:modelValue', val) }
    },
    totalSteps () {
      return this.oem ? 5 : 4
    },
    isLast () {
      return this.step === this.totalSteps
    },
    oemGuidanceText () {
      // Per-OEM Slovenian/English guidance; falls back to generic if missing.
      const key = oemGuidanceKey(this.oem)
      const translated = this.$t(key)
      // If the key is missing, $t returns the key itself.
      return translated === key ? this.$t('oemGuidanceGeneric') : translated
    }
  },
  watch: {
    modelValue (next) {
      if (next) {
        this.step = 1
        // Re-detect on each open in case of OS updates between sessions.
        this.oem = detectOem()
      }
    }
  },
  methods: {
    openAppSettings () {
      try {
        if (window.BackgroundGeolocation && typeof window.BackgroundGeolocation.showAppSettings === 'function') {
          window.BackgroundGeolocation.showAppSettings()
        }
      } catch (e) {
        Notify.create({ type: 'negative', message: 'Settings open failed: ' + e.message })
      }
    },
    async askBatteryExemption () {
      this.batteryWorking = true
      try {
        const pkg = 'si.katasterjam.app'
        try {
          await requestIgnoreBatteryOptimizations(pkg)
        } catch (e) {
          // Fall back to the list page; user picks our app manually.
          await openBatteryOptimizationSettings()
        }
      } catch (e) {
        Notify.create({
          type: 'warning',
          message: this.$t('onboardingBatteryOptUnavailable')
        })
      } finally {
        this.batteryWorking = false
      }
    },
    finish () {
      this.$emit('finished')
      this.open = false
    },
    skip () {
      this.$emit('skipped')
      this.open = false
    }
  }
}
</script>
