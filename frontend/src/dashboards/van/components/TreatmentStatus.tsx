import { useEffect, useMemo, useState } from 'react';
import { Activity, MapPin, Pill, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import GlassCard from './GlassCard';
import { listAssignmentsDetailed, listVehicleStock, resolveVehicleId, type VehicleAssignmentDetailed, type VehicleStockUsage } from '../utils/medicalVehicleApi';
import { getWebSocketBaseUrl } from '../utils/env';

export default function TreatmentStatus() {
  const [vehicleId, setVehicleId] = useState<string>(() => window.localStorage.getItem('mobilevan.vehicleId') ?? '');
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
      setAssignments([]);
      setStock([]);
      return;
    }
    window.localStorage.setItem('mobilevan.vehicleId', id);
    setLoading(true);
    setError(null);
    Promise.all([listAssignmentsDetailed(id), listVehicleStock(id)])
      .then(([a, s]) => {
        setAssignments(a);
        setStock(s);
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load treatment data'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const activeAssignment = useMemo(() => {
    if (activeOutbreakId) {
      const found = assignments.find((a) => a.outbreak_id === activeOutbreakId);
      if (found) return found;
    }
    return assignments.find((a) => a.outbreak != null) ?? null;
  }, [assignments, activeOutbreakId]);

  const outbreak = activeAssignment?.outbreak ?? null;

  const patientsTreated = useMemo(() => {
    const active = (window.localStorage.getItem('mobilevan.activeOutbreakId') ?? '').trim();
    const rows = active ? stock.filter((r) => String(r.outbreak_id ?? '') === active) : stock;
    return rows.reduce((s, e) => s + (e.patients_treated ?? 0), 0);
  }, [stock]);
  const totalPatients = outbreak?.affected_people ?? 0;
  const progressPct = totalPatients > 0 ? Math.min(100, (patientsTreated / totalPatients) * 100) : 0;

  const medicineAgg = useMemo(() => {
    const byName = new Map<string, { name: string; quantity: number; patients: number }>();
    for (const e of stock) {
      const k = e.medicine_name;
      const prev = byName.get(k) ?? { name: k, quantity: 0, patients: 0 };
      prev.quantity += e.quantity_used ?? 0;
      prev.patients += e.patients_treated ?? 0;
      byName.set(k, prev);
    }
    return Array.from(byName.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 6);
  }, [stock]);

  const treatedOverTime = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of stock) {
      const dt = new Date(e.updated_at);
      const key = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      buckets.set(key, (buckets.get(key) ?? 0) + (e.patients_treated ?? 0));
    }
    return Array.from(buckets.entries())
      .map(([time, treated]) => ({ time, treated }))
      .sort((a, b) => a.time.localeCompare(b.time));
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

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Treatment Status</h1>
        <p className="text-gray-400">Shows real treatment logs from backend stock usage.</p>
      </motion.div>

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
            {loading && <div className="text-sm text-gray-400">Loading…</div>}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Active outbreak</div>
              <div className="text-white font-semibold">
                {outbreak ? outbreak.disease_type : 'No linked outbreak yet'}
              </div>
              <div className="text-sm text-gray-300">
                {outbreak?.area_name ?? (outbreak ? `${outbreak.latitude.toFixed(4)}, ${outbreak.longitude.toFixed(4)}` : '')}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <GlassCard>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-sm text-gray-400">Patients treated</div>
              <div className="text-2xl font-bold text-white">{patientsTreated}</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-sm text-gray-400">Total patients (from outbreak)</div>
              <div className="text-2xl font-bold text-white">{totalPatients || '—'}</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-sm text-gray-400">Progress</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }} />
          </div>
          <div className="mt-2 text-sm text-gray-300">{totalPatients ? `${Math.round(progressPct)}%` : '—'}</div>
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20">
              <Activity className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Patients Treated Over Time</h3>
              <p className="text-sm text-gray-400">Derived from `vehicle_stock_usage.updated_at`.</p>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={treatedOverTime}>
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="treated" stroke="#60a5fa" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Pill className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Top Medicines Used</h3>
              <p className="text-sm text-gray-400">Aggregated from stock usage logs.</p>
            </div>
          </div>

          {medicineAgg.length === 0 ? (
            <div className="text-gray-400">No usage logged yet.</div>
          ) : (
            <div className="space-y-2">
              {medicineAgg.map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div className="text-white font-semibold">{m.name}</div>
                    <div className="text-xs text-gray-400">Patients treated: {m.patients}</div>
                  </div>
                  <div className="text-white font-bold">{m.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
