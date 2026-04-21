<template>
  <q-page>
    <offline-map-management />
  </q-page>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useOfflineMapsStore } from 'stores/offline-maps-store'
import { apiUrl } from 'src/boot/api'
import { startOfflineMapHub, stopOfflineMapHub } from 'src/services/offline-maps-signalr'
import OfflineMapManagement from 'src/components/offline/OfflineMapManagement.vue'

const authStore = useAuthStore()
const offlineMapsStore = useOfflineMapsStore()

onMounted(async () => {
  await offlineMapsStore.fetchMyPackages()
  await startOfflineMapHub(apiUrl, () => authStore.getAccessToken)
})

onBeforeUnmount(async () => {
  await stopOfflineMapHub()
})
</script>
