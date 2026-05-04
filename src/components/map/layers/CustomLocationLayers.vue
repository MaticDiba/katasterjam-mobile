<template>
  <ol-vector-layer :zIndex="1000">
    <ol-source-vector ref="vectorSource">
    <ol-feature v-for="customLocation in customLocations" :key="customLocation.id" :properties="{
        'id': customLocation.id,
        'externalId': customLocation.externalId,
        'name': customLocation.name,
        'lat': customLocation.lat.toFixed(5),
        'lng': customLocation.lng.toFixed(5),
        'type': 'poi'
      }">
        <ol-geom-point :coordinates="customLocation.latLng"></ol-geom-point>

        <ol-style>
          <ol-style-icon :src="customLocation.icon" :scale="1"></ol-style-icon>
        </ol-style>
      </ol-feature>
  </ol-source-vector>
    </ol-vector-layer>
</template>

<script>
import { ref } from 'vue'
import VectorSource from 'ol/source/Vector'
import { useLocalCustomLocationStore } from 'stores/local-custom-location-store'

export default {
  setup () {
    const store = useLocalCustomLocationStore()
    const customLocations = ref([])
    const vectorSource = ref(new VectorSource())
    store.loadForMap().then(() => {
      store.customLocationsForMap.map(cl => customLocations.value.push(cl))
    })

    return {
      vectorSource,
      store,
      customLocations
    }
  }
}
</script>
