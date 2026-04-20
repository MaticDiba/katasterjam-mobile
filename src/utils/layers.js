import { useMapStore } from 'src/stores/map-store'
import { db } from 'src/db/db'
import { api } from 'src/boot/api'
import * as olHas from 'ol/has'
import * as olProj from 'ol/proj'
import XYZ from 'ol/source/XYZ'

export async function loadWmtsTilesFor (offlineRequest, layer) {
  const mapStore = useMapStore()
  const source = mapStore.getLayers.find(l => l.label === layer).wmtsSource
  const tileGrid = source.getTileGrid()
  const urlFunc = source.getTileUrlFunction()

  const reprojectedExtent = olProj.transformExtent(offlineRequest.extent, mapStore.getViewProjection, source.getProjection())
  const tileULRs = []

  for (let zoom = 1; zoom <= 18; zoom++) {
    tileGrid.forEachTileCoord(reprojectedExtent, zoom, (tileCoord) => {
      const url = urlFunc.call(source, tileCoord, olHas.DEVICE_PIXEL_RATIO, source.getProjection(), offlineRequest.inProgress)
      tileULRs.push({
        tileCoord, url
      })
    })
  }

  return await downloadTiles(tileULRs, offlineRequest.update, layer, offlineRequest.offlineId, false, offlineRequest.inProgress)
}

export async function loadXYZTilesFor (offlineRequest, url, layer, replaceXY) {
  const source = new XYZ({
    url
  })
  const tileGrid = source.getTileGrid()
  const urlFunc = source.getTileUrlFunction()

  const tileULRs = []

  for (let zoom = 2; zoom <= 17; zoom++) {
    tileGrid.forEachTileCoord(offlineRequest.extent, zoom, (tileCoord) => {
      const url = urlFunc.call(source, tileCoord, olHas.DEVICE_PIXEL_RATIO, source.getProjection())
      tileULRs.push({
        tileCoord, url
      })
    })
  }

  return await downloadTiles(tileULRs, offlineRequest.update, layer, offlineRequest.offlineId, replaceXY, offlineRequest.inProgress)
}

async function downloadTiles (tileULRs, update, layer, offlineId, replaceXY, inProgress) {
  let size = 0
  for (let i = 0; i < tileULRs.length; i++) {
    inProgress.throwIfCancelled()
    const tile = tileULRs[i]
    update(i / tileULRs.length)
    const storedTile = await db.tiles.where('tileKey')
      .equals(tile.url)
      .first()
    if (storedTile) {
      continue
    }
    let [z, x, y] = tile.tileCoord
    if (replaceXY) {
      [z, y, x] = tile.tileCoord
    }
    try {
      const response = await api.get(`/api/map/${layer}/${z}/${y}/${x}`, {
        responseType: 'blob'
      })
      if (response.status === 200) {
        const blob = response.data
        size += blob.size
        await db.tiles.put({
          tileKey: tile.url,
          image: blob,
          offlineId,
          importId: 1
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  return size
}
