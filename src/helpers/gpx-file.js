import GPX from 'ol/format/GPX'
import { getLength } from 'ol/sphere'
import { createEmpty, extend as extendExtent } from 'ol/extent'

const FORMAT = new GPX()

export async function readFileAsText (file) {
  if (file && typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'))
    reader.readAsText(file)
  })
}

export function parseGpx (text) {
  const features = FORMAT.readFeatures(text, { featureProjection: 'EPSG:3857' })

  if (!features.length) {
    throw new Error('No tracks or routes found in GPX')
  }

  const extent = createEmpty()
  let distanceMeters = 0
  let pointCount = 0

  for (const feature of features) {
    const geom = feature.getGeometry()
    if (!geom) continue

    extendExtent(extent, geom.getExtent())
    const type = geom.getType()

    if (type === 'MultiLineString') {
      distanceMeters += getLength(geom, { projection: 'EPSG:3857' })
      for (const ls of geom.getLineStrings()) {
        pointCount += ls.getCoordinates().length
      }
    } else if (type === 'LineString') {
      distanceMeters += getLength(geom, { projection: 'EPSG:3857' })
      pointCount += geom.getCoordinates().length
    } else if (type === 'Point') {
      pointCount += 1
    }
  }

  const { trackName, startTime, endTime } = extractMeta(text)

  const durationSec = startTime && endTime
    ? Math.max(0, Math.round((endTime - startTime) / 1000))
    : null

  return {
    features,
    extent,
    trackName,
    stats: {
      distanceMeters: Math.round(distanceMeters),
      durationSec,
      pointCount
    }
  }
}

export function formatDistance (m) {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`
  return `${m} m`
}

export function formatDuration (s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function extractMeta (text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const nameNode = doc.querySelector('trk > name, rte > name, metadata > name')
  const trackName = nameNode?.textContent?.trim() || null

  const times = Array.from(doc.querySelectorAll('trkpt > time, rtept > time'))
    .map(n => new Date(n.textContent.trim()))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b)

  return {
    trackName,
    startTime: times[0] || null,
    endTime: times[times.length - 1] || null
  }
}
