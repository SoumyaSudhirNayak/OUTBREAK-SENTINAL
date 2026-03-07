import { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { MedicalVehicle } from '../utils/medicalVehicleApi'

type Props = {
  mapboxToken: string | null
  vehicles: MedicalVehicle[]
  selectedVehicleId?: string
  route?: {
    geometry: GeoJSON.LineString
    origin: { lat: number; lng: number }
    destination: { lat: number; lng: number }
  } | null
  followSelected: boolean
  onSelectVehicle: (vehicleId: string) => void
}

function statusColor(status: MedicalVehicle['vehicle_status']): string {
  if (status === 'idle') return '#22c55e'
  if (status === 'assigned') return '#60a5fa'
  if (status === 'on_route') return '#3b82f6'
  if (status === 'treating') return '#f59e0b'
  return '#a1a1aa'
}

export function MedicalVehicleMap({ vehicles, selectedVehicleId, route, followSelected, onSelectVehicle }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const routeMarkersRef = useRef<{ start?: mapboxgl.Marker; end?: mapboxgl.Marker }>({})

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  )

  useEffect(() => {
    if (!mapboxToken) return
    if (mapRef.current || !containerRef.current) return

    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 20.5937],
      zoom: 4,
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mapboxToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextIds = new Set(vehicles.map((v) => v.id))
    for (const [id, marker] of markersRef.current.entries()) {
      if (!nextIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }

    for (const v of vehicles) {
      if (v.current_latitude == null || v.current_longitude == null) continue
      const lngLat: mapboxgl.LngLatLike = [v.current_longitude, v.current_latitude]

      const existing = markersRef.current.get(v.id)
      if (!existing) {
        const el = document.createElement('button')
        el.type = 'button'
        el.style.width = '18px'
        el.style.height = '18px'
        el.style.borderRadius = '9999px'
        el.style.border = '3px solid rgba(255,255,255,0.95)'
        el.style.boxShadow = `0 0 0 5px ${statusColor(v.vehicle_status)}22, 0 0 18px ${statusColor(v.vehicle_status)}55`
        el.style.background = statusColor(v.vehicle_status)
        el.title = `${v.vehicle_name} (${v.vehicle_status})`
        el.onclick = () => onSelectVehicle(v.id)

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map)
        markersRef.current.set(v.id, marker)
      } else {
        const el = existing.getElement() as HTMLButtonElement
        el.style.background = statusColor(v.vehicle_status)
        el.style.boxShadow = `0 0 0 5px ${statusColor(v.vehicle_status)}22, 0 0 18px ${statusColor(v.vehicle_status)}55`
        el.title = `${v.vehicle_name} (${v.vehicle_status})`
        existing.setLngLat(lngLat)
      }
    }

    for (const [id, marker] of markersRef.current.entries()) {
      const el = marker.getElement() as HTMLButtonElement
      const isSelected = id === selectedVehicleId
      el.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)'
      el.style.transition = 'transform 120ms ease'
    }
  }, [vehicles, selectedVehicleId, onSelectVehicle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const sourceId = 'active-route'
    const layerId = 'active-route-line'

    const ensure = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 5,
            'line-opacity': 0.85,
          },
        })
      }
    }

    const applyRoute = () => {
      ensure()
      const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource
      if (!route) {
        src.setData({ type: 'FeatureCollection', features: [] })
        routeMarkersRef.current.start?.remove()
        routeMarkersRef.current.end?.remove()
        routeMarkersRef.current = {}
        return
      }

      src.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: route.geometry }],
      })

      const startEl = document.createElement('div')
      startEl.style.width = '10px'
      startEl.style.height = '10px'
      startEl.style.borderRadius = '9999px'
      startEl.style.background = '#22c55e'
      startEl.style.boxShadow = '0 0 12px rgba(34,197,94,0.8)'

      const endEl = document.createElement('div')
      endEl.style.width = '10px'
      endEl.style.height = '10px'
      endEl.style.borderRadius = '9999px'
      endEl.style.background = '#ef4444'
      endEl.style.boxShadow = '0 0 12px rgba(239,68,68,0.8)'

      routeMarkersRef.current.start?.remove()
      routeMarkersRef.current.end?.remove()

      routeMarkersRef.current.start = new mapboxgl.Marker({ element: startEl, anchor: 'center' })
        .setLngLat([route.origin.lng, route.origin.lat])
        .addTo(map)
      routeMarkersRef.current.end = new mapboxgl.Marker({ element: endEl, anchor: 'center' })
        .setLngLat([route.destination.lng, route.destination.lat])
        .addTo(map)

      const coords = route.geometry.coordinates
      if (coords.length >= 2) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
        )
        map.fitBounds(bounds, { padding: 60, duration: 600 })
      }
    }

    if (map.isStyleLoaded()) {
      applyRoute()
      return
    }

    const onLoad = () => applyRoute()
    map.on('load', onLoad)
    return () => {
      map.off('load', onLoad)
    }
  }, [route])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !followSelected || !selectedVehicle) return
    if (selectedVehicle.current_latitude == null || selectedVehicle.current_longitude == null) return
    map.easeTo({
      center: [selectedVehicle.current_longitude, selectedVehicle.current_latitude],
      duration: 450,
    })
  }, [followSelected, selectedVehicle?.current_latitude, selectedVehicle?.current_longitude])

  return <div ref={containerRef} className="h-full w-full" />
}
