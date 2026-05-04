// Detect device manufacturer from the WebView's User-Agent. This is
// "best-effort" — UA strings vary by ROM, but the patterns below cover the
// OEMs that ship the most aggressive background killers (per dontkillmyapp.com).
//
// Returns one of: 'xiaomi' | 'huawei' | 'samsung' | 'oneplus' | 'oppo' | 'vivo' | null

export function detectOem () {
  if (typeof navigator === 'undefined') return null
  const ua = (navigator.userAgent || '').toLowerCase()
  if (/(xiaomi|miui|redmi|poco)/.test(ua)) return 'xiaomi'
  if (/(huawei|honor)/.test(ua)) return 'huawei'
  // Samsung devices: model codes like SM-A536B, or literal 'samsung' (less common)
  if (/samsung|\bsm-[a-z0-9]+/.test(ua)) return 'samsung'
  if (/oneplus/.test(ua)) return 'oneplus'
  if (/oppo/.test(ua)) return 'oppo'
  if (/vivo/.test(ua)) return 'vivo'
  return null
}

// i18n key for the per-OEM guidance message.
export function oemGuidanceKey (oem) {
  return `oemGuidance.${oem}`
}

// Fire the system intent that opens the battery-optimization-exemption
// dialog for our package. Sideload-only flow — Play Store apps need a
// declaration on Play Console for this intent.
export function requestIgnoreBatteryOptimizations (packageName) {
  return new Promise((resolve, reject) => {
    const shim = window.cordova && window.cordova.plugins && window.cordova.plugins.intentShim
    if (!shim || typeof shim.startActivity !== 'function') {
      reject(new Error('intentShim not available'))
      return
    }
    shim.startActivity(
      {
        action: 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        data: 'package:' + packageName
      },
      () => resolve(),
      (err) => reject(new Error(String(err)))
    )
  })
}

// Fall back to opening the OS battery-optimization list. Used when the
// targeted REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent fails.
export function openBatteryOptimizationSettings () {
  return new Promise((resolve, reject) => {
    const shim = window.cordova && window.cordova.plugins && window.cordova.plugins.intentShim
    if (!shim || typeof shim.startActivity !== 'function') {
      reject(new Error('intentShim not available'))
      return
    }
    shim.startActivity(
      { action: 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS' },
      () => resolve(),
      (err) => reject(new Error(String(err)))
    )
  })
}
