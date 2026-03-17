import { ref } from 'vue'
import { Platform } from 'quasar'

export const isOnline = ref(true)

const onOnlineCallbacks = []
let onlineDebounceTimer = null

function fireOnlineCallbacks () {
  clearTimeout(onlineDebounceTimer)
  onlineDebounceTimer = setTimeout(() => {
    onOnlineCallbacks.forEach(cb => cb())
  }, 1000)
}

export function initNetworkStatus () {
  if (Platform.is.cordova) {
    document.addEventListener('online', () => {
      isOnline.value = true
      fireOnlineCallbacks()
    }, false)
    document.addEventListener('offline', () => {
      isOnline.value = false
      clearTimeout(onlineDebounceTimer)
    }, false)
    isOnline.value = navigator.connection?.type !== 'none'
  } else {
    isOnline.value = navigator.onLine
    window.addEventListener('online', () => {
      isOnline.value = true
      fireOnlineCallbacks()
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
      clearTimeout(onlineDebounceTimer)
    })
  }
}

export function onOnline (callback) {
  onOnlineCallbacks.push(callback)
  return () => {
    const index = onOnlineCallbacks.indexOf(callback)
    if (index >= 0) onOnlineCallbacks.splice(index, 1)
  }
}
