import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

type Props = {
  mapboxToken: string | null
  position: { lat: number; lng: number } | null
  route?: {
    geometry: GeoJSON.LineString
    origin: { lat: number; lng: number }
    destination: { lat: number; lng: number }
  } | null
}

export function VehicleNavigationMap({ mapboxToken, position, route }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const routeMarkersRef = useRef<{ start?: mapboxgl.Marker; end?: mapboxgl.Marker }>({})

  useEffect(() => {
    if (!mapboxToken) return
    if (mapRef.current || !containerRef.current) return

    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 20.5937],
      zoom: 5,
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
    if (!map || !position) return

    const el = document.createElement('div')
    el.style.width = '18px'
    el.style.height = '18px'
    el.style.borderRadius = '9999px'
    el.style.border = '3px solid rgba(255,255,255,0.95)'
    el.style.background = '#3b82f6'
    el.style.boxShadow = '0 0 0 6px rgba(59,130,246,0.20), 0 0 18px rgba(59,130,246,0.55)'

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([position.lng, position.lat])
        .addTo(map)
      map.easeTo({ center: [position.lng, position.lat], zoom: 11, duration: 650 })
      return
    }

    markerRef.current.setLngLat([position.lng, position.lat])
    map.easeTo({ center: [position.lng, position.lat], duration: 450 })
  }, [position?.lat, position?.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const sourceId = 'nav-route'
    const layerId = 'nav-route-line'

    const ensure = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.9 },
        })
      }
    }

    const apply = () => {
      ensure()
      const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource
      if (!route) {
        src.setData({ type: 'FeatureCollection', features: [] })
        routeMarkersRef.current.start?.remove()
        routeMarkersRef.current.end?.remove()
        routeMarkersRef.current = {}
        return
      }
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: route.geometry }] })

      const startEl = document.createElement('div')
      startEl.style.width = '10px'
      startEl.style.height = '10px'
      startEl.style.borderRadius = '9999px'
      startEl.style.background = '#22c55e'

      const endEl = document.createElement('div')
      endEl.style.width = '10px'
      endEl.style.height = '10px'
      endEl.style.borderRadius = '9999px'
      endEl.style.background = '#ef4444'

      routeMarkersRef.current.start?.remove()
      routeMarkersRef.current.end?.remove()
      routeMarkersRef.current.start = new mapboxgl.Marker({ element: startEl, anchor: 'center' })
        .setLngLat([route.origin.lng, route.origin.lat])
        .addTo(map)
      routeMarkersRef.current.end = new mapboxgl.Marker({ element: endEl, anchor: 'center' })
        .setLngLat([route.destination.lng, route.destination.lat])
        .addTo(map)
    }

    if (map.isStyleLoaded()) {
      apply()
      return
    }
    const onLoad = () => apply()
    map.on('load', onLoad)
    return () => {
      map.off('load', onLoad)
    }
  }, [route])

  return <div ref={containerRef} className="h-full w-full" />
}

