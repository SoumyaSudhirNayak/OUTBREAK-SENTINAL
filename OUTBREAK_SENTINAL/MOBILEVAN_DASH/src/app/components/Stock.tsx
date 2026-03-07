import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Package, Save } from 'lucide-react';
import { motion } from 'motion/react';
import GlassCard from './GlassCard';
import { createStockUsage, listVehicleStock, type VehicleStockUsage } from '../utils/medicalVehicleApi';

export default function Stock() {
  const [vehicleId, setVehicleId] = useState<string>(() => window.localStorage.getItem('mobilevan.vehicleId') ?? '');
  const [entries, setEntries] = useState<VehicleStockUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSyncAnimation, setShowSyncAnimation] = useState(false);

  const [medicineName, setMedicineName] = useState('');
  const [quantityUsed, setQuantityUsed] = useState('0');
  const [patientsTreated, setPatientsTreated] = useState('0');
  const [equipmentUsedJson, setEquipmentUsedJson] = useState('');

  useEffect(() => {
    const id = vehicleId.trim();
    if (!id) {
      setEntries([]);
      return;
    }
    window.localStorage.setItem('mobilevan.vehicleId', id);
    setLoading(true);
    setError(null);
    listVehicleStock(id)
      .then((rows) => setEntries(rows))
      .catch((e: any) => setError(e?.message ?? 'Failed to load stock usage'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const totals = useMemo(() => {
    const totalPatients = entries.reduce((s, e) => s + (e.patients_treated ?? 0), 0);
    const totalUnits = entries.reduce((s, e) => s + (e.quantity_used ?? 0), 0);
    return { totalPatients, totalUnits };
  }, [entries]);

  const handleSubmit = () => {
    const id = vehicleId.trim();
    if (!id) {
      setError('Vehicle ID required');
      return;
    }
    let equipmentUsed: any | undefined = undefined;
    const raw = equipmentUsedJson.trim();
    if (raw) {
      try {
        equipmentUsed = JSON.parse(raw);
      } catch {
        setError('Equipment JSON is invalid');
        return;
      }
    }

    setLoading(true);
    setError(null);
    createStockUsage({
      vehicle_id: id,
      medicine_name: medicineName.trim(),
      quantity_used: Number(quantityUsed),
      patients_treated: Number(patientsTreated),
      equipment_used: equipmentUsed,
    })
      .then(() => listVehicleStock(id).then((rows) => setEntries(rows)))
      .then(() => {
        setShowSyncAnimation(true);
        setTimeout(() => setShowSyncAnimation(false), 2500);
        setMedicineName('');
        setQuantityUsed('0');
        setPatientsTreated('0');
        setEquipmentUsedJson('');
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to submit usage'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Inventory & Treatment Log</h1>
        <p className="text-gray-400">Real-time stock management and usage tracking</p>
      </motion.div>

      {/* Sync Success Animation */}
      {showSyncAnimation && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="mb-6"
        >
          <GlassCard glow glowColor="rgba(34, 197, 94, 0.4)">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </motion.div>
              <div>
                <h3 className="text-white font-semibold text-lg">Successfully Synced!</h3>
                <p className="text-sm text-gray-400">Treatment update sent to Doctor Dashboard</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Sync Status Badge */}
      <div className="mb-6">
        <GlassCard className="inline-block">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">Synced with Doctor Dashboard</span>
          </div>
        </GlassCard>
      </div>

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
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Totals (from backend logs)</div>
            <div className="text-white font-semibold">Patients treated: {totals.totalPatients}</div>
            <div className="text-white font-semibold">Total medicine units used: {totals.totalUnits}</div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-blue-500/20">
            <Package className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Log Treatment Stock Usage</h3>
            <p className="text-sm text-gray-400">This writes to `vehicle_stock_usage` in Supabase.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
            className="rounded-xl px-3 py-2 text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            placeholder="Medicine name (e.g., ORS)"
          />
          <input
            value={quantityUsed}
            onChange={(e) => setQuantityUsed(e.target.value)}
            className="rounded-xl px-3 py-2 text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            placeholder="Quantity used"
          />
          <input
            value={patientsTreated}
            onChange={(e) => setPatientsTreated(e.target.value)}
            className="rounded-xl px-3 py-2 text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            placeholder="Patients treated"
          />
          <input
            value={equipmentUsedJson}
            onChange={(e) => setEquipmentUsedJson(e.target.value)}
            className="rounded-xl px-3 py-2 text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            placeholder='Equipment JSON (optional, e.g. {"oxygen_units":1})'
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !vehicleId.trim() || !medicineName.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white disabled:opacity-50"
          style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.35)' }}
        >
          <Save className="w-4 h-4" />
          Submit Usage
        </button>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent Usage</h3>
          <div className="text-xs text-gray-400">Latest first</div>
        </div>
        {entries.length === 0 ? (
          <div className="text-gray-400">No usage logged yet.</div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 20).map((e) => (
              <div key={e.id} className="flex flex-col gap-1 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-semibold">{e.medicine_name}</div>
                  <div className="text-xs text-gray-400">{new Date(e.updated_at).toLocaleString()}</div>
                </div>
                <div className="text-sm text-gray-300">Quantity used: {e.quantity_used} | Patients treated: {e.patients_treated}</div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
