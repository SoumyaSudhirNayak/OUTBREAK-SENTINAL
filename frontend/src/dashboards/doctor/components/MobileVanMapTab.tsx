import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, CircleOff, MapPinned, RefreshCw, Radio, Wifi, WifiOff } from 'lucide-react'
import { MedicalVehicleMap } from './MedicalVehicleMap'
import { getActiveRoute, listMedicalVehicles, type MedicalVehicle, type NavigationRoute, type WsVehicleEvent } from '../utils/medicalVehicleApi'
import { getMapboxPublicToken, getWebSocketBaseUrl } from '../utils/env'

type WsState = 'disconnected' | 'connecting' | 'connected'

function formatAgo(ts: string): string {
  const deltaMs = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(deltaMs)) return '—'
  const s = Math.max(0, Math.floor(deltaMs / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export function MobileVanMapTab() {
  const [vehicles, setVehicles] = useState<MedicalVehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [activeRoute, setActiveRoute] = useState<NavigationRoute | null>(null)
  const [followSelected, setFollowSelected] = useState(true)
  const [wsState, setWsState] = useState<WsState>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now())
  const wsRef = useRef<WebSocket | null>(null)

  const mapboxToken = useMemo(() => {
    try {
      return getMapboxPublicToken()
    } catch {
      return null
    }
  }, [])

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  )

  const routeForMap = useMemo(() => {
    if (!activeRoute) return null
    return {
      geometry: activeRoute.route_geometry,
      origin: { lat: activeRoute.origin_lat, lng: activeRoute.origin_lng },
      destination: { lat: activeRoute.destination_lat, lng: activeRoute.destination_lng },
    }
  }, [activeRoute])

  useEffect(() => {
    let alive = true
    const abort = new AbortController()

    const load = async () => {
      try {
        const v = await listMedicalVehicles(abort.signal)
        if (!alive) return
        setVehicles(v)
        setLastRefreshedAt(Date.now())
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'Failed to load vehicles')
      }
    }

    load()
    const id = window.setInterval(load, 8000)
    return () => {
      alive = false
      abort.abort()
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (!selectedVehicleId) {
      setActiveRoute(null)
      return
    }
    const abort = new AbortController()
    getActiveRoute(selectedVehicleId, abort.signal)
      .then((r) => setActiveRoute(r))
      .catch(() => setActiveRoute(null))
    return () => abort.abort()
  }, [selectedVehicleId])

  useEffect(() => {
    wsRef.current?.close()
    wsRef.current = null
    setWsState('disconnected')

    if (!selectedVehicleId) return

    const url = `${getWebSocketBaseUrl()}/ws/vehicle/${selectedVehicleId}`
    setWsState('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setWsState('connected')
    ws.onclose = () => setWsState('disconnected')
    ws.onerror = () => setWsState('disconnected')
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsVehicleEvent
        if (msg.type === 'vehicle.location_updated') {
          setVehicles((prev) =>
            prev.map((v) => (v.id === msg.vehicle_id ? { ...v, current_latitude: msg.latitude, current_longitude: msg.longitude } : v)),
          )
        }
        if (msg.type === 'navigation.route_generated' || msg.type === 'navigation.route_updated' || msg.type === 'navigation.route_unchanged') {
          getActiveRoute(selectedVehicleId).then((r) => setActiveRoute(r)).catch(() => null)
        }
      } catch {
        return
      }
    }

    return () => {
      ws.close()
    }
  }, [selectedVehicleId])

  const wsBadge =
    wsState === 'connected'
      ? { icon: Wifi, label: 'Live', color: 'text-green-400', border: 'rgba(34,197,94,0.25)', bg: 'rgba(34,197,94,0.08)' }
      : wsState === 'connecting'
        ? { icon: Radio, label: 'Connecting', color: 'text-blue-300', border: 'rgba(59,130,246,0.25)', bg: 'rgba(59,130,246,0.08)' }
        : { icon: WifiOff, label: 'Offline', color: 'text-zinc-300', border: 'rgba(255,255,255,0.14)', bg: 'rgba(255,255,255,0.06)' }

  const WsIcon = wsBadge.icon

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]" style={{ minHeight: '72vh' }}>
      <div className="overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full" style={{ background: 'linear-gradient(90deg, #2563EB, #818cf8)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
              Fleet Map
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs" style={{ background: wsBadge.bg, border: `1px solid ${wsBadge.border}` }}>
              <WsIcon className={`h-3.5 w-3.5 ${wsBadge.color}`} />
              <span className={wsBadge.color}>{wsBadge.label}</span>
            </div>
            <button
              onClick={() => setFollowSelected((v) => !v)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={{ background: followSelected ? 'rgba(37,99,235,0.14)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)' }}
            >
              {followSelected ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        <div className="h-[560px]">
          <MedicalVehicleMap
            mapboxToken={mapboxToken}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId ?? undefined}
            route={routeForMap}
            followSelected={followSelected}
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Medical Vans
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Updated {new Date(lastRefreshedAt).toLocaleTimeString()}
              </span>
              <button
                onClick={() => listMedicalVehicles().then(setVehicles).catch(() => null)}
                className="rounded-xl p-2 transition hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                aria-label="Refresh"
              >
                <RefreshCw className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.65)' }} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: 'rgba(255,255,255,0.85)' }}>
              {error}
            </div>
          )}

          {!mapboxToken && (
            <div className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)', color: 'rgba(255,255,255,0.85)' }}>
              Set <span className="font-semibold">VITE_MAPBOX_PUBLIC_TOKEN</span> in <span className="font-semibold">DOCTORE_DASH/.env</span> to enable the map.
            </div>
          )}

          <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
            {vehicles.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <CircleOff className="h-4 w-4" />
                No vehicles registered yet.
              </div>
            )}
            {vehicles.map((v) => {
              const isSelected = v.id === selectedVehicleId
              const hasFix = v.current_latitude != null && v.current_longitude != null
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className="w-full rounded-2xl px-4 py-3 text-left transition"
                  style={{
                    background: isSelected ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(37,99,235,0.30)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {v.vehicle_name}
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Driver: {v.driver_name}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: `${v.vehicle_status === 'idle' ? 'rgba(34,197,94,0.10)' : 'rgba(59,130,246,0.10)'}`, border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.8)' }}>
                        {v.vehicle_status}
                      </div>
                      <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                        {formatAgo(v.updated_at)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <MapPinned className="h-3.5 w-3.5" />
                    {hasFix ? `${v.current_latitude?.toFixed(4)}, ${v.current_longitude?.toFixed(4)}` : 'No GPS fix'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-300" />
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Selected Van
            </h3>
          </div>

          {!selectedVehicle && (
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Select a van from the list to see its active route.
            </div>
          )}

          {selectedVehicle && (
            <div className="space-y-3">
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {selectedVehicle.vehicle_name}
                </div>
                <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Contact: {selectedVehicle.contact_number}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Route
                  </div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>
                    {activeRoute ? `${activeRoute.distance_km.toFixed(1)} km` : '—'}
                  </div>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    ETA
                  </div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>
                    {activeRoute ? `${Math.round(activeRoute.duration_minutes)} min` : '—'}
                  </div>
                </div>
              </div>

              {!activeRoute && (
                <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                  No active route for this vehicle.
                </div>
              )}

              {activeRoute?.traffic_level && (
                <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', color: 'rgba(255,255,255,0.72)' }}>
                  Traffic: {activeRoute.traffic_level}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
