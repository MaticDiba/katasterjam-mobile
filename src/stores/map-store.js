import { defineStore } from 'pinia'
import * as olProj from 'ol/proj'
import { EsriJSON } from 'ol/format'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import { useLocalCavesStore } from './local-cave-store'
import { api } from 'src/boot/axios'

export const useMapStore = defineStore('map', {
  state: () => ({
    mapRef: null,
    layers: [{
      active: false,
      label: 'Lidar',
      url: '',
      capabilities: '/api/Map/LidarSkyView/capabilites',
      layerName: 'TEMELJNE_KARTE_LidarTlaZgradbe_D96_obroba',
      projection: 'EPSG:3794',
      attributes: 'Ministrstvo za kulturo, Ministrstvo za okolje in prostor',
      preview: 'map/skyview.png',
      wmtsSource: null,
      maxZoom: 17
    }, {
      active: false,
      label: 'Ortho',
      url: '',
      capabilities: '/api/Map/Ortho2024/capabilites',
      layerName: 'DOF_D96TM_2022_2023_2024',
      projection: 'EPSG:3794',
      attributes: 'Ortophoto podlaga, GURS',
      preview: 'map/ortophoto.png',
      wmtsSource: null,
      maxZoom: 17
    }],
    wmtsSource: null,
    bottomDrawer: false,
    drawerLoading: false,
    clickedFeature: {},
    clickLocation: [],
    extent: [],
    cavesSourceInstance: null
  }),
  getters: {
    getLayers (state) {
      return state.layers
    },
    getClickedFeature (state) {
      return state.clickedFeature
    },
    getDrawerLoading (state) {
      return state.drawerLoading
    },
    showBottomDrawer (state) {
      return state.bottomDrawer
    },
    getMap (state) {
      return state.mapRef.map
    },
    getExtent (state) {
      return state.extent
    },
    getViewProjection (state) {
      return state.mapRef.map.getView().getProjection()
    }
  },
  actions: {
    setSource (layerData, source) {
      const layer = this.layers.find(l => l.label === layerData.label)
      layer.wmtsSource = source
    },
    updateExtent (extent) {
      this.extent = extent
    },
    async mapClick (coordinates, featuresClick) {
      this.bottomDrawer = true
      this.drawerLoading = true
      this.clickLocation = coordinates
      try {
        const lngLat = olProj.toLonLat(coordinates)
        this.clickedFeature = {
          lat: lngLat[1].toFixed(5),
          lng: lngLat[0].toFixed(5),
          type: 'click'
        }
        const features = featuresClick.filter(f => f.values_.type === 'poi')
        if (features.length > 0) {
          this.clickedFeature = {
            ...features[0].values_
          }
        } else if (featuresClick.some(f => f.values_.type === 'cave')) {
          const cavesStore = useLocalCavesStore()
          const feature = featuresClick.find(f => f.values_.type === 'cave')
          const result = await cavesStore.get(feature.values_.caveNumber)
          if (result) {
            const cave = result
            this.clickedFeature = {
              id: cave.caveNumber,
              name: cave.name,
              lat: cave.lat,
              lng: cave.lng,
              length: cave.length,
              depth: cave.depth,
              type: 'cave'
            }
          }
        }
      } catch (error) {
        console.log('error while fetching data: ', error)
      } finally {
        this.drawerLoading = false
      }
    },
    hideDrawer () {
      this.bottomDrawer = false
    },
    saveMapRef (mapRef) {
      this.mapRef = mapRef
    },
    async getCavesFromLocalStorage (coordinates) {
      const lngLat = olProj.toLonLat(coordinates)
      const store = useLocalCavesStore()
      let distance = 4000 / Math.pow(2, (this.getMap.getView().getZoom() - 9))
      distance = distance < 5 ? 5 : distance
      const closestCaves = await store.getClosestCavesFor({
        longitude: lngLat[0],
        latitude: lngLat[1]
      })

      if (closestCaves.length > 0 && closestCaves[0].distance <= distance) {
        return closestCaves[0]
      }

      return null
    },
    async getRemoteFeatures (coordinate) {
      let distance = 4000 / Math.pow(2, (this.getMap.getView().getZoom() - 9))
      distance = distance < 5 ? 5 : distance
      const url = 'https://services7.arcgis.com/V2VriwTjJDabpGg6/arcgis/rest/services/2023_marec_export_ekataster_a/FeatureServer/0/query/?f=json&' +
        'returnGeometry=true&geometry=' +
        encodeURIComponent('{"x":' + (coordinate[0]) + ',"y":' + (coordinate[1]) + ',"spatialReference":{"wkid":102100}}') +
        `&distance=${distance}` +
        '&geometryType=esriGeometryPoint&inSR=102100&outFields=*&outSR=102100'
      const response = await fetch(url)
      const val = await response.text()
      const esriJsonFormat = new EsriJSON()
      const features = esriJsonFormat.readFeatures(val, {
        featureProjection: this.getMap.getView().getProjection()
      })

      return features
    },
    async getCavesLayerSource () {
      if (!this.cavesSourceInstance) {
        const cavesStore = useLocalCavesStore()
        const features = await cavesStore.getAllCaves().then(caves =>
          caves.map(cave => {
            const feature = new Feature({
              geometry: new Point(fromLonLat([cave.lng, cave.lat])),
              type: 'cave',
              caveNumber: cave.caveNumber
            })
            feature.setId(cave.id)

            return feature
          })
        )

        this.cavesSourceInstance = new VectorSource()
        this.cavesSourceInstance.addFeatures(features)
      }

      return this.cavesSourceInstance
    },
    async fetchMapCapabilities () {
      for (const layer of this.layers) {
        if (!layer.capabilities) {
          continue
        }

        const result = await api
          .get(layer.capabilities)
          .then((response) => {
            return response.data
          })
          .catch(function (error) {
            console.error('error sending login request: ', error)
            throw error
          })
        localStorage.setItem(`cap-${layer.label}`, JSON.stringify(result))
      }
    }
  }
})
