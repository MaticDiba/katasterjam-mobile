import * as signalR from '@microsoft/signalr'
import { useOfflineMapsStore } from 'src/stores/offline-maps-store'

let connection = null

export async function startOfflineMapHub (apiUrl, getToken) {
  if (connection) return

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/OfflineMaps`, {
      accessTokenFactory: getToken
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build()

  connection.on('OnGenerationProgress', (packageId, layerType, progress) => {
    const store = useOfflineMapsStore()
    const pkg = store.packages.find(p => p.id === packageId)
    if (!pkg) return

    const layer = pkg.layers?.find(l => l.layerType === layerType)
    if (layer) {
      layer.generationProgress = progress
    }
  })

  connection.on('OnGenerationComplete', (packageId, status) => {
    const store = useOfflineMapsStore()
    const pkg = store.packages.find(p => p.id === packageId)
    if (pkg) {
      pkg.status = status
    }
    store.fetchMyPackages()
  })

  try {
    await connection.start()
  } catch (err) {
    console.error('OfflineMap SignalR connection failed:', err)
    connection = null
  }
}

export async function stopOfflineMapHub () {
  if (connection) {
    await connection.stop()
    connection = null
  }
}
