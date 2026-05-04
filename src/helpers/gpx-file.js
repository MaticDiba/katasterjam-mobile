import GPX from 'ol/format/GPX'
import { getLength } from 'ol/sphere'
import { createEmpty, extend as extendExtent } from 'ol/extent'
import { smoothPoints } from './track-smoothing'

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

// Compact mm:ss / hh:mm:ss form for the live recording notification.
export function formatDurationCompact (ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/**
 * Serialise a recorded track + its points to GPX 1.1 XML.
 *
 * @param {{ name: string, startedAt?: string, endedAt?: string }} track
 * @param {Array<{ lat: number, lon: number, timestamp?: number, altitude?: number }>} points
 *        Sorted ascending by timestamp by the caller.
 */
export function serializeGpx (track, points) {
  const escape = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  // Smooth before exporting so the GPX matches what the user sees on the
  // map. Kalman re-applied per call — stateless from the caller's POV.
  const exportPoints = smoothPoints(points)

  const lines = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<gpx version="1.1" creator="Kataster jam" xmlns="http://www.topografix.com/GPX/1/1">')
  lines.push('  <metadata>')
  lines.push(`    <name>${escape(track.name)}</name>`)
  if (track.startedAt) {
    lines.push(`    <time>${escape(track.startedAt)}</time>`)
  }
  lines.push('  </metadata>')
  lines.push('  <trk>')
  lines.push(`    <name>${escape(track.name)}</name>`)
  lines.push('    <trkseg>')
  for (const p of exportPoints) {
    if (p.lat == null || p.lon == null) continue
    const attrs = `lat="${p.lat}" lon="${p.lon}"`
    if (p.altitude != null || p.timestamp != null) {
      lines.push(`      <trkpt ${attrs}>`)
      if (p.altitude != null) lines.push(`        <ele>${p.altitude}</ele>`)
      if (p.timestamp != null) lines.push(`        <time>${new Date(p.timestamp).toISOString()}</time>`)
      lines.push('      </trkpt>')
    } else {
      lines.push(`      <trkpt ${attrs}/>`)
    }
  }
  lines.push('    </trkseg>')
  lines.push('  </trk>')
  lines.push('</gpx>')
  return lines.join('\n')
}

export function formatTrackDuration (track) {
  if (!track.startedAt || !track.endedAt) return null
  const ms = new Date(track.endedAt) - new Date(track.startedAt)
  if (Number.isNaN(ms) || ms < 0) return null
  return formatDuration(Math.round(ms / 1000))
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
