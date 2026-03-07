import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Clock, Fuel, Navigation2, Radio, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import GlassCard from './GlassCard';
import { VehicleNavigationMap } from './VehicleNavigationMap';
import { getMapboxPublicToken, getWebSocketBaseUrl } from '../utils/env';
import {
  generateRoute,
  getActiveRoute,
  getVehicle,
  updateVehicleLocation,
  listAssignmentsDetailed,
  resolveVehicleId,
  type MedicalVehicle,
  type NavigationRoute,
  type WsVehicleEvent,
  type VehicleAssignmentDetailed,
} from '../utils/medicalVehicleApi';

export default function Navigation() {
  const [vehicleId, setVehicleId] = useState<string>(() => window.localStorage.getItem('mobilevan.vehicleId') ?? '');
  const [vehicle, setVehicle] = useState<MedicalVehicle | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [assignments, setAssignments] = useState<VehicleAssignmentDetailed[]>([]);
  const [selectedOutbreakId, setSelectedOutbreakId] = useState<string>(() => window.localStorage.getItem('mobilevan.activeOutbreakId') ?? '');
  const [wsState, setWsState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    resolveVehicleId(vehicleId)
      .then((id) => {
        if (id && id !== vehicleId) setVehicleId(id);
      })
      .catch(() => null);
  }, []);

  const mapboxToken = useMemo(() => {
    try {
      return getMapboxPublicToken();
    } catch {
      return null;
    }
  }, []);

  const routeForMap = useMemo(() => {
    if (!route) return null;
    return {
      geometry: route.route_geometry,
      origin: { lat: route.origin_lat, lng: route.origin_lng },
      destination: { lat: route.destination_lat, lng: route.destination_lng },
    };
  }, [route]);

  const etaMinutes = route ? Math.round(route.duration_minutes) : null;
  const distanceKm = route ? route.distance_km : null;

  useEffect(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setWsState('disconnected');
    setError(null);
    setVehicle(null);
    setRoute(null);

    const id = vehicleId.trim();
    if (!id) return;

    window.localStorage.setItem('mobilevan.vehicleId', id);

    getVehicle(id)
      .then((v) => setVehicle(v))
      .catch((e: any) => {
        setError(e?.message ?? 'Vehicle not found');
      });

    getActiveRoute(id)
      .then((r) => setRoute(r))
      .catch(() => null);

    listAssignmentsDetailed(id)
      .then((rows) => setAssignments(rows))
      .catch(() => null);

    const wsUrl = `${getWebSocketBaseUrl()}/ws/vehicle/${id}`;
    setWsState('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setWsState('connected');
    ws.onclose = () => setWsState('disconnected');
    ws.onerror = () => setWsState('disconnected');
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsVehicleEvent;
        if (msg.type === 'vehicle.location_updated' && msg.vehicle_id === id) {
          setVehicle((prev) =>
            prev ? { ...prev, current_latitude: msg.latitude, current_longitude: msg.longitude } : prev,
          );
        }
        if (msg.type === 'navigation.route_generated' || msg.type === 'navigation.route_updated' || msg.type === 'navigation.route_unchanged') {
          getActiveRoute(id).then((r) => setRoute(r)).catch(() => null);
        }
      } catch {
        return;
      }
    };

    return () => {
      ws.close();
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!selectedOutbreakId.trim()) return;
    window.localStorage.setItem('mobilevan.activeOutbreakId', selectedOutbreakId.trim());
  }, [selectedOutbreakId]);

  const wsBadge =
    wsState === 'connected'
      ? { icon: Wifi, label: 'Live', color: 'text-green-400', border: 'rgba(34,197,94,0.3)', bg: 'rgba(34,197,94,0.10)' }
      : wsState === 'connecting'
        ? { icon: Radio, label: 'Connecting', color: 'text-blue-300', border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.10)' }
        : { icon: WifiOff, label: 'Offline', color: 'text-gray-300', border: 'rgba(255,255,255,0.14)', bg: 'rgba(255,255,255,0.06)' };
  const WsIcon = wsBadge.icon;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Top Floating Panel */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto mb-4"
      >
        <GlassCard glow glowColor="rgba(239, 68, 68, 0.3)">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Navigation</h3>
                <p className="text-sm text-gray-400">Live vehicle tracking + route rendering</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-full border" style={{ background: wsBadge.bg, borderColor: wsBadge.border }}>
                <span className={`${wsBadge.color} font-bold flex items-center gap-2`}>
                  <WsIcon className="w-4 h-4" />
                  {wsBadge.label}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Map Container */}
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <GlassCard>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Vehicle ID</p>
                <input
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2 text-white"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  placeholder="Paste vehicle UUID"
                />
              </div>
              {error && <div className="text-sm text-red-300">{error}</div>}
              {!mapboxToken && (
                <div className="text-sm text-amber-200">
                  Set <span className="font-semibold">VITE_MAPBOX_PUBLIC_TOKEN</span> in <span className="font-semibold">MOBILEVAN_DASH/.env</span>.
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Current position</p>
                <div className="mt-2 text-sm text-gray-200">
                  {vehicle && vehicle.current_latitude != null && vehicle.current_longitude != null
                    ? `${vehicle.current_latitude.toFixed(6)}, ${vehicle.current_longitude.toFixed(6)}`
                    : 'No location reported yet.'}
                </div>
                <button
                  disabled={!vehicleId.trim()}
                  onClick={() => {
                    if (!navigator.geolocation) {
                      setError('Geolocation not supported');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        updateVehicleLocation(vehicleId.trim(), pos.coords.latitude, pos.coords.longitude)
                          .then((v) => {
                            setVehicle(v);
                            setError(null);
                          })
                          .catch((e: any) => setError(e?.message ?? 'Failed to update location'));
                      },
                      () => setError('Failed to read GPS position'),
                      { enableHighAccuracy: true, timeout: 10000 },
                    );
                  }}
                  className="mt-3 w-full rounded-xl px-3 py-2 font-semibold text-white disabled:opacity-50"
                  style={{ background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  Send Current GPS
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <GlassCard>
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Navigate to outbreak</p>
              <select
                value={selectedOutbreakId}
                onChange={(e) => setSelectedOutbreakId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <option value="">Select assigned outbreak…</option>
                {assignments
                  .filter((a) => a.outbreak)
                  .map((a) => (
                    <option key={a.id} value={a.outbreak_id}>
                      {a.outbreak?.area_name ?? a.outbreak_id} ({a.outbreak?.severity ?? 'mild'})
                    </option>
                  ))}
              </select>
              <button
                disabled={!vehicleId.trim() || !selectedOutbreakId.trim()}
                onClick={() =>
                  (() => {
                    const ob = assignments.find((a) => a.outbreak_id === selectedOutbreakId)?.outbreak;
                    if (!ob) {
                      setError('Selected outbreak not found');
                      return;
                    }
                    generateRoute(vehicleId.trim(), { lat: ob.latitude, lng: ob.longitude })
                      .then((r) => setRoute(r))
                      .catch((e: any) => setError(e?.message ?? 'Failed to generate route'));
                  })()
                }
                className="rounded-xl px-3 py-2 font-semibold text-white disabled:opacity-50"
                style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.35)' }}
              >
                Generate Route
              </button>
            </div>
          </GlassCard>
          <div />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative h-[500px] rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="absolute inset-0">
            <VehicleNavigationMap
              mapboxToken={mapboxToken}
              position={
                vehicle && vehicle.current_latitude != null && vehicle.current_longitude != null
                  ? { lat: vehicle.current_latitude, lng: vehicle.current_longitude }
                  : null
              }
              route={routeForMap}
            />
          </div>

          <motion.div
            className="absolute top-4 right-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="px-6 py-4 rounded-2xl backdrop-blur-xl border"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-white font-semibold">ETA</span>
              </div>
              <p className="text-3xl font-bold text-white">{etaMinutes ?? '—'}{etaMinutes != null ? ' min' : ''}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <GlassCard>
            <div className="flex items-center gap-3">
              <Navigation2 className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Distance Remaining</p>
                <p className="text-2xl font-bold text-white">{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Arrival Time</p>
                <p className="text-2xl font-bold text-white">
                  {etaMinutes != null
                    ? new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <Fuel className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Est. Fuel Usage</p>
                <p className="text-2xl font-bold text-white">
                  {distanceKm != null ? `${Math.max(0.2, distanceKm * 0.15).toFixed(1)} L` : '—'}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
