import { useEffect, useMemo, useState } from 'react';
import { Activity, MapPin, Users } from 'lucide-react';
import { motion } from 'motion/react';
import GlassCard from './GlassCard';
import { getVehicle, listAssignmentsDetailed, listVehicleStock, resolveVehicleId, type MedicalVehicle, type VehicleAssignmentDetailed, type VehicleStockUsage } from '../utils/medicalVehicleApi';
import { getWebSocketBaseUrl } from '../utils/env';

export default function Dashboard() {
  const [vehicleId, setVehicleId] = useState<string>(() => window.localStorage.getItem('mobilevan.vehicleId') ?? '');
  const [vehicle, setVehicle] = useState<MedicalVehicle | null>(null);
  const [assignments, setAssignments] = useState<VehicleAssignmentDetailed[]>([]);
  const [stock, setStock] = useState<VehicleStockUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeOutbreakId = useMemo(() => window.localStorage.getItem('mobilevan.activeOutbreakId') ?? '', []);

  useEffect(() => {
    resolveVehicleId(vehicleId)
      .then((id) => {
        if (id && id !== vehicleId) setVehicleId(id);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const id = vehicleId.trim();
    if (!id) {
      setVehicle(null);
      setAssignments([]);
      setStock([]);
      return;
    }
    window.localStorage.setItem('mobilevan.vehicleId', id);
    setLoading(true);
    setError(null);
    Promise.all([getVehicle(id), listAssignmentsDetailed(id), listVehicleStock(id)])
      .then(([v, a, s]) => {
        setVehicle(v);
        setAssignments(a);
        setStock(s);
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const patientsTreated = useMemo(() => {
    const active = (window.localStorage.getItem('mobilevan.activeOutbreakId') ?? '').trim();
    const rows = active ? stock.filter((r) => String(r.outbreak_id ?? '') === active) : stock;
    return rows.reduce((sum, r) => sum + (r.patients_treated ?? 0), 0);
  }, [stock]);

  useEffect(() => {
    const id = vehicleId.trim();
    if (!id) return;
    const ws = new WebSocket(`${getWebSocketBaseUrl()}/ws/vehicle/${id}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'treatment.stock_updated' && msg?.vehicle_id === id && msg?.stock_usage) {
          setStock((prev) => [msg.stock_usage, ...prev]);
        }
      } catch {
        return;
      }
    };
    return () => {
      try {
        ws.close();
      } catch {
        return;
      }
    };
  }, [vehicleId]);

  const activeAssignment = useMemo(() => {
    if (activeOutbreakId) {
      const found = assignments.find((a) => a.outbreak_id === activeOutbreakId);
      if (found) return found;
    }
    return assignments.find((a) => a.outbreak != null) ?? null;
  }, [assignments, activeOutbreakId]);

  const outbreak = activeAssignment?.outbreak ?? null;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Medical Van Overview</h1>
        <p className="text-gray-400">Live data from backend (vehicles, assignments, stock usage)</p>
      </motion.div>

      <div className="mb-6">
        <GlassCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-300">Vehicle ID</div>
            <input
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full md:w-[420px] rounded-xl px-3 py-2 text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="Paste vehicle UUID"
            />
          </div>
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
          {loading && <div className="mt-3 text-sm text-gray-400">Loading…</div>}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard hover glow>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Patients Treated (Logs)</p>
              <h3 className="text-4xl font-bold text-white">{patientsTreated}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover glow>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Vehicle Status</p>
              <h3 className="text-xl font-bold text-white mb-1">{vehicle?.vehicle_status ?? '—'}</h3>
              <p className="text-gray-300 text-sm">{vehicle?.vehicle_name ?? ''}</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/20">
              <Activity className="w-6 h-6 text-indigo-300" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover glow>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Active Assignment</p>
              <h3 className="text-xl font-bold text-white mb-1">{outbreak?.disease_type ?? '—'}</h3>
              <p className="text-blue-300 text-sm flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {outbreak?.area_name ?? (outbreak ? `${outbreak.latitude.toFixed(4)}, ${outbreak.longitude.toFixed(4)}` : '—')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/20">
              <Activity className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover glow>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">GPS</p>
              <h3 className="text-xl font-bold text-white mb-1">
                {vehicle?.current_latitude != null && vehicle?.current_longitude != null ? 'Online' : 'No data'}
              </h3>
              <p className="text-gray-300 text-sm">
                {vehicle?.current_latitude != null && vehicle?.current_longitude != null
                  ? `${vehicle.current_latitude.toFixed(5)}, ${vehicle.current_longitude.toFixed(5)}`
                  : '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/20">
              <MapPin className="w-6 h-6 text-green-300" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
