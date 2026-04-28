export const MAX_TILE_COUNT = 200_000

export const AVG_BYTES_PER_TILE = {
  VectorBasemap: 4_500,
  LidarSkyView: 30_000,
  Ortho: 45_000
}

const FALLBACK_BYTES_PER_TILE = 20_000

export function tileCountForBbox (minLon, minLat, maxLon, maxLat, z) {
  const n = 1 << z
  let xMin = Math.floor(((minLon + 180) / 360) * n)
  let xMax = Math.floor(((maxLon + 180) / 360) * n)
  const latRadMin = (minLat * Math.PI) / 180
  const latRadMax = (maxLat * Math.PI) / 180
  let yMin = Math.floor(
    ((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2) * n
  )
  let yMax = Math.floor(
    ((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2) * n
  )
  xMin = Math.max(0, Math.min(xMin, n - 1))
  xMax = Math.max(0, Math.min(xMax, n - 1))
  yMin = Math.max(0, Math.min(yMin, n - 1))
  yMax = Math.max(0, Math.min(yMax, n - 1))
  return (xMax - xMin + 1) * (yMax - yMin + 1)
}

export function tileCountForRange (minLon, minLat, maxLon, maxLat, minZoom, maxZoom) {
  let total = 0
  for (let z = minZoom; z <= maxZoom; z++) {
    total += tileCountForBbox(minLon, minLat, maxLon, maxLat, z)
  }
  return total
}

export function estimatePackage ({ minLon, minLat, maxLon, maxLat, minZoom, maxZoom, layers }) {
  const empty = { perLayer: [], total: { tiles: 0, bytes: 0 } }
  if (
    !Array.isArray(layers) || layers.length === 0 ||
    !Number.isFinite(minZoom) || !Number.isFinite(maxZoom) ||
    minZoom > maxZoom ||
    [minLon, minLat, maxLon, maxLat].some(v => !Number.isFinite(v))
  ) {
    return empty
  }
  const tilesPerLayer = tileCountForRange(minLon, minLat, maxLon, maxLat, minZoom, maxZoom)
  const perLayer = layers.map(layer => ({
    layer,
    tiles: tilesPerLayer,
    bytes: tilesPerLayer * (AVG_BYTES_PER_TILE[layer] ?? FALLBACK_BYTES_PER_TILE)
  }))
  return {
    perLayer,
    total: {
      tiles: perLayer.reduce((s, l) => s + l.tiles, 0),
      bytes: perLayer.reduce((s, l) => s + l.bytes, 0)
    }
  }
}

export function formatBytes (bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
