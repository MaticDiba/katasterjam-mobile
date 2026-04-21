export async function createNativeMBTilesSource (nativeDb) {
  const metaRows = await nativeDb.query('SELECT name, value FROM metadata')
  const meta = {}
  for (const row of metaRows) meta[row.name] = row.value

  const format = (meta.format || 'png').toLowerCase()
  const minZoom = meta.minzoom ? parseInt(meta.minzoom) : 0
  const maxZoom = meta.maxzoom ? parseInt(meta.maxzoom) : 18
  const mime = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png'

  const { default: XYZ } = await import('ol/source/XYZ.js')
  const { default: TileState } = await import('ol/TileState.js')

  const source = new XYZ({
    url: '{z}/{x}/{y}',
    minZoom,
    maxZoom,
    tileLoadFunction: (tile) => {
      const coord = tile.getTileCoord()
      const z = coord[0]
      const x = coord[1]
      const tmsY = (1 << z) - 1 - coord[2]

      nativeDb.queryTile(z, x, tmsY).then((tileData) => {
        if (tileData && tileData.length > 0) {
          const blob = new Blob([tileData], { type: mime })
          const blobUrl = URL.createObjectURL(blob)
          const img = tile.getImage()
          const cleanup = () => URL.revokeObjectURL(blobUrl)
          img.addEventListener('load', cleanup, { once: true })
          img.addEventListener('error', cleanup, { once: true })
          img.src = blobUrl
        } else {
          tile.setState(TileState.ERROR)
        }
      }).catch((err) => {
        console.error('[mbtiles-native] Tile query error:', err)
        tile.setState(TileState.ERROR)
      })
    }
  })

  return { source, db: nativeDb, format }
}

export function disposeMBTilesDB (db) {
  if (db) db.close()
}
