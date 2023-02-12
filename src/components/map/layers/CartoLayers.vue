<template>
  <ol-layerswitcherimage-control />
  <ol-tile-layer>
    <ol-source-osm />
  </ol-tile-layer>
  <ol-tile-layer ref="wmtsLayer">
  </ol-tile-layer>
  <ol-tile-layer ref="layerRef">
    <ol-source-xyz ref="sourceRef" url="https://services7.arcgis.com/V2VriwTjJDabpGg6/ArcGIS/rest/services/2022_marec_export_ekataster_tile_layer/MapServer/WMTS/tile/1.0.0/2022_marec_export_ekataster_tile_layer/default/default028mm/{z}/{y}/{x}.png"/>
  </ol-tile-layer>
</template>

<script>
import { ref } from 'vue'
import * as olHas from 'ol/has'
import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import { WMTSCapabilities } from 'ol/format'
import * as olProj from 'ol/proj'
proj4.defs('EPSG:3912', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=bessel +towgs84=426.9,142.6,460.1,4.91,4.49,-12.42,17.1 +units=m +no_defs')
proj4.defs('EPSG:102060', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=bessel +towgs84=426.62,142.62,460.09,4.98,4.49,-12.42,-17.1 +units=m +no_defs +type=crs')
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs')
proj4.defs('EPSG:3794', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')

register(proj4)

import { openDB } from 'idb'

const dbPromise = openDB('newDatabase', 1, {
  upgrade (db) {
    const store = db.createObjectStore('MapTiles', { autoIncrement: true, keyPath: 'id' })
    store.createIndex('tileKey', ['tileKey'], { unique: true })
  }
})

export default {
  props: ['view', 'map'],
  setup () {
    const layerRef = ref(null)
    const sourceRef = ref(null)
    const wmtsSource = ref(null)
    const wmtsLayer = ref(null)
    const layerName = ref('TEMELJNE_KARTE_LidarTlaZgradbe_D96')
    const styleName = ref('default')
    const url = ref('https://gisserver.gov.si/arcgis/rest/services/TEMELJNE_KARTE/LidarTlaZgradbe_D96/MapServer/WMTS')

    return {
      layerRef,
      sourceRef,
      styleName,
      layerName,
      url,
      wmtsSource,
      wmtsLayer
    }
  },
  data () {
    return {
    }
  },
  created () {
    const loadLayer = async () => {
      const wmtsParser = new WMTSCapabilities()
      const response = await fetch('https://gisserver.gov.si/arcgis/rest/services/TEMELJNE_KARTE/LidarTlaZgradbe_D96/MapServer/WMTS')

      const capText = await response.text()
      const capabilities = wmtsParser.read(capText)
      const optionsFromCap = optionsFromCapabilities(capabilities, {
        layer: 'TEMELJNE_KARTE_LidarTlaZgradbe_D96'
      })
      const options = {
        projection: 'EPSG:3794',
        ...optionsFromCap,
        attributions: ['ddsajdsa'],
        crossOrigin: 'anonymous'
      }
      console.log(options)
      this.wmtsSource = new WMTS(options)
      this.wmtsSource.setTileLoadFunction(function (tile, url) {
        dbPromise.then(db => {
          const tx = db.transaction('MapTiles', 'readonly')
          const tiles = tx.objectStore('MapTiles')
          const index = tiles.index('tileKey')
          const image = tile.getImage()

          const tileKey = tile.tileCoord.join('_')
          index.get(IDBKeyRange.only([tileKey])).then(storedTile => {
            if (!storedTile) {
              console.log('online blob')
              // use online url
              image.src = url
              return
            }
            console.log('stored blob')
            const objUrl = URL.createObjectURL(storedTile.blob)
            image.onload = function () {
              URL.revokeObjectURL(objUrl)
            }
            image.src = objUrl
          }).catch(() => {
            // use online url
            image.src = url
          })
        })
      })
      const layer = this.wmtsLayer.tileLayer
      layer.setSource(this.wmtsSource)
      this.wmtsSource.on('')
      this.map.map.addLayer(layer)
    }
    loadLayer()
    return {
    }
  },
  methods: {
    test () {
      console.log('layerRef', this.layerRef.tileLayer)
      console.log('extent', this.view.calculateExtent)

      const source = this.wmtsSource
      const tileGrid = source.getTileGrid()
      console.log('tileGrid', tileGrid)
      const urlFunc = source.getTileUrlFunction()
      console.log('urlFunc:', urlFunc)
      const extent = this.view.calculateExtent()
      console.log('extent', extent)
      const reprojectedExtent = olProj.transformExtent(extent, this.view.getProjection(), source.getProjection())
      console.log('projected extent: ', reprojectedExtent)
      const tileULRs = []
      for (let zoom = 2; zoom <= 13; zoom++) {
        tileGrid.forEachTileCoord(reprojectedExtent, zoom, (tileCoord) => {
          const url = urlFunc.call(source, tileCoord, olHas.DEVICE_PIXEL_RATIO, source.getProjection())
          tileULRs.push({
            tileCoord, url
          })
        })
      }
      console.log(tileULRs)

      tileULRs.map(t => {
        return new Promise((resolve, reject) => {
          fetch(t.url).then(response => {
            if (response.ok) {
              response.blob().then(async blob => {
                dbPromise.then(db => {
                  const tx = db.transaction('MapTiles', 'readwrite')
                  const store = tx.objectStore('MapTiles')
                  store.add({
                    url: t.url,
                    tileKey: t.tileCoord.join('_'),
                    blob
                  })
                })
              })
            }
          })
        })
      })
    }
  }
}
</script>
