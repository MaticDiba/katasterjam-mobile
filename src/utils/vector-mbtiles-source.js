import { inflate } from 'pako'

export const OFFLINE_VECTOR_STYLE_MISSING = 'OFFLINE_VECTOR_STYLE_MISSING'

export async function createVectorMBTilesSource (nativeDb) {
  const metaRows = await nativeDb.query('SELECT name, value FROM metadata')
  const meta = {}
  for (const row of metaRows) meta[row.name] = row.value

  const minZoom = meta.minzoom ? parseInt(meta.minzoom) : 0
  const maxZoom = meta.maxzoom ? parseInt(meta.maxzoom) : 18

  let style = null
  if (meta.style) {
    try {
      style = JSON.parse(meta.style)
    } catch (e) {
      console.warn('Failed to parse vector tile style from MBTiles metadata:', e)
    }
  }
  if (!style) {
    throw new Error(OFFLINE_VECTOR_STYLE_MISSING)
  }

  const { default: VectorTileSource } = await import('ol/source/VectorTile.js')
  const { MVT } = await import('ol/format.js')

  const mvtFormat = new MVT()

  const source = new VectorTileSource({
    format: mvtFormat,
    url: '{z}/{x}/{y}',
    minZoom,
    maxZoom,
    tileLoadFunction: (tile) => {
      const coord = tile.getTileCoord()
      const z = coord[0]
      const x = coord[1]
      const tmsY = (1 << z) - 1 - coord[2]

      tile.setLoader(async (extent, resolution, projection) => {
        try {
          let tileData = await nativeDb.queryTile(z, x, tmsY)
          if (!tileData || tileData.length === 0) {
            tile.setFeatures([])
            return
          }

          if (tileData.length >= 2 && tileData[0] === 0x1f && tileData[1] === 0x8b) {
            tileData = inflate(tileData)
          }

          const features = mvtFormat.readFeatures(tileData.buffer, {
            extent,
            featureProjection: projection
          })
          tile.setFeatures(features)
        } catch (e) {
          console.error('[vector-mbtiles] Failed to load/parse MVT tile:', e)
          tile.setFeatures([])
        }
      })
    }
  })

  return { source, db: nativeDb, style }
}
