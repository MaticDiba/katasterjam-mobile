import KalmanFilter from 'kalmanjs'

// R = measurement noise (lower = more smoothing). Q = process noise (higher
// = more responsive). R=0.1 / Q=3 is a light touch — it knocks down the
// 2-5m walking jitter without lagging vehicle speed. R=0.01 lagged badly
// in cars; the accuracy gate (in location-store.js) is the primary
// outlier defence, so Kalman doesn't need to be aggressive.
export const KALMAN_R = 0.1
export const KALMAN_Q = 3

/**
 * Stateful 1-D Kalman pair for latitude and longitude. Each new track gets
 * its own smoother — call reset() if the same instance is re-used.
 *
 * No speed-based outlier rejection: it killed driving sessions where the
 * implied speed between consecutive fixes stayed above the cap with no
 * recovery path. We rely on the accuracy gate upstream instead.
 */
export function createTrackSmoother () {
  const kLat = new KalmanFilter({ R: KALMAN_R, Q: KALMAN_Q })
  const kLon = new KalmanFilter({ R: KALMAN_R, Q: KALMAN_Q })

  return {
    /**
     * @returns {{ lat:number, lon:number }} smoothed pair.
     */
    push (lat, lon) {
      return {
        lat: kLat.filter(lat),
        lon: kLon.filter(lon)
      }
    },
    reset () {
      if (typeof kLat.reset === 'function') kLat.reset()
      if (typeof kLon.reset === 'function') kLon.reset()
    }
  }
}

/**
 * Stateless batch smoother for an existing array of points (used when
 * re-rendering completed tracks).
 */
export function smoothPoints (points) {
  const smoother = createTrackSmoother()
  const out = []
  for (const p of points) {
    if (p.lat == null || p.lon == null) continue
    const sm = smoother.push(p.lat, p.lon)
    out.push({ ...p, lat: sm.lat, lon: sm.lon })
  }
  return out
}
