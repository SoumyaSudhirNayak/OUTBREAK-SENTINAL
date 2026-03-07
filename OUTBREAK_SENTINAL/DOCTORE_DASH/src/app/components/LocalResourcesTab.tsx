import { useEffect, useMemo, useState } from 'react';
import { Pill, Activity, Users, X, Wifi, Send } from 'lucide-react';
import {
  createSupportRequest,
  listResourceEquipment,
  listResourceMedicines,
  listResourceStaff,
  type ResourceEquipment,
  type ResourceMedicine,
  type ResourceStaff,
} from '../utils/doctorDashboardApi';

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  borderRadius: '20px',
};


function ProgressBar({ value, color, glow }: { value: number; color: string; glow: string }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          boxShadow: `0 0 8px ${glow}`,
        }}
      />
    </div>
  );
}

export function LocalResourcesTab() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [focusDesc, setFocusDesc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [medicines, setMedicines] = useState<ResourceMedicine[]>([]);
  const [equipment, setEquipment] = useState<ResourceEquipment[]>([]);
  const [staff, setStaff] = useState<ResourceStaff[]>([]);

  const [requestType, setRequestType] = useState('Medicine');
  const [requestDesc, setRequestDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([listResourceMedicines(ac.signal), listResourceEquipment(ac.signal), listResourceStaff(ac.signal)])
      .then(([m, e, s]) => {
        setMedicines(m);
        setEquipment(e);
        setStaff(s);
      })
      .catch((err: any) => setError(err?.message ?? 'Failed to load resources'))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const medicineData = useMemo(
    () =>
      medicines.map((m) => ({
        name: m.medicine_name,
        stock: m.stock_count,
        lowStock: m.stock_count <= m.low_stock_threshold,
      })),
    [medicines],
  );

  const equipmentData = useMemo(
    () =>
      equipment.map((e) => ({
        name: e.equipment_name,
        available: e.available,
        total: e.total,
        icon: e.icon ?? '🧰',
      })),
    [equipment],
  );

  const staffData = useMemo(() => {
    const palette = [
      { color: '#60a5fa', glow: 'rgba(37,99,235,0.4)' },
      { color: '#818cf8', glow: 'rgba(99,102,241,0.4)' },
      { color: '#34d399', glow: 'rgba(34,197,94,0.4)' },
    ];
    return staff.map((s, idx) => ({
      role: s.role,
      available: s.available,
      total: s.total,
      ...palette[idx % palette.length],
    }));
  }, [staff]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div
              className="h-1 w-8 rounded-full"
              style={{ background: 'linear-gradient(90deg, #2563EB, #818cf8)' }}
            />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
              Resources
            </span>
          </div>
          <h2
            className="text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Local Hospital Resources
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Track and manage available medical resources in real-time
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition-all hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
            boxShadow: '0 0 20px rgba(37,99,235,0.4)',
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          <Send className="h-4 w-4" />
          Request Support from Admin
        </button>
      </div>

      {/* Medicine Availability */}
      <div style={glassCard} className="overflow-hidden">
        <div
          className="flex items-center gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(37,99,235,0.15)',
              border: '1px solid rgba(37,99,235,0.25)',
            }}
          >
            <Pill className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Medicine Availability
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Medicine Name', 'Stock Count', 'Status'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && medicineData.length === 0 && (
                <tr>
                  <td className="px-6 py-6" colSpan={3} style={{ color: 'rgba(255,255,255,0.5)' }}>
                    No medicine inventory data yet.
                  </td>
                </tr>
              )}
              {medicineData.map((medicine, index) => (
                <tr
                  key={index}
                  className="transition-all"
                  style={{
                    borderBottom:
                      index < medicineData.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(37,99,235,0.05)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td
                    className="whitespace-nowrap px-6 py-4 font-semibold"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    {medicine.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {medicine.stock} units
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {medicine.lowStock ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: '#ef4444',
                            boxShadow: '0 0 6px rgba(220,38,38,0.8)',
                          }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{
                            background: 'rgba(220,38,38,0.12)',
                            border: '1px solid rgba(220,38,38,0.25)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            color: '#f87171',
                          }}
                        >
                          Low Stock
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: '#22c55e',
                            boxShadow: '0 0 6px rgba(34,197,94,0.8)',
                          }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            color: '#34d399',
                          }}
                        >
                          Available
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Availability */}
      <div style={glassCard} className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
          <h3 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Equipment Availability
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!loading && equipmentData.length === 0 && (
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
              No equipment inventory data yet.
            </div>
          )}
          {equipmentData.map((equipment, index) => {
            const pct = (equipment.available / equipment.total) * 100;
            const color = pct > 70 ? '#34d399' : pct > 40 ? '#fbbf24' : '#f87171';
            const glow =
              pct > 70 ? 'rgba(34,197,94,0.4)' : pct > 40 ? 'rgba(245,158,11,0.4)' : 'rgba(220,38,38,0.4)';
            return (
              <div
                key={index}
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="mb-3 text-2xl">{equipment.icon}</div>
                <div className="mb-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {equipment.name}
                </div>
                <div className="mb-3 font-bold" style={{ color, textShadow: `0 0 15px ${glow}` }}>
                  <span style={{ fontSize: '24px' }}>{equipment.available}</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    /{equipment.total}
                  </span>
                </div>
                <ProgressBar value={pct} color={color} glow={glow} />
                <div className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {Math.round(pct)}% Available
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff Availability */}
      <div style={glassCard} className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(129,140,248,0.15)',
              border: '1px solid rgba(129,140,248,0.25)',
            }}
          >
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <h3 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Staff Availability
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {!loading && staffData.length === 0 && (
            <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
              No staff availability data yet.
            </div>
          )}
          {staffData.map((staff, index) => {
            const pct = (staff.available / staff.total) * 100;
            return (
              <div
                key={index}
                className="rounded-xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${staff.color}25`,
                }}
              >
                <div
                  className="mb-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: staff.color }}
                >
                  {staff.role}
                </div>
                <div
                  className="mb-4 font-bold"
                  style={{ color: staff.color, textShadow: `0 0 20px ${staff.glow}` }}
                >
                  <span style={{ fontSize: '36px' }}>{staff.available}</span>
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                    /{staff.total}
                  </span>
                </div>
                <ProgressBar value={pct} color={staff.color} glow={staff.glow} />
                <div className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {Math.round(pct)}% On Duty
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Info */}
      <div
        className="flex items-center gap-3 rounded-xl p-4"
        style={{
          background: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.15)',
        }}
      >
        <Wifi className="h-4 w-4 flex-shrink-0 text-blue-400" />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Note:</span>{' '}
          {loading ? 'Loading live resource data…' : 'Showing live resource data from the backend.'}
        </p>
        <div
          className="ml-auto h-1.5 w-1.5 rounded-full"
          style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }}
        />
      </div>

      {error && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Request Support Modal */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8"
            style={{
              background: 'rgba(13,21,48,0.98)',
              border: '1px solid rgba(37,99,235,0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(37,99,235,0.1)',
            }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                Request Support from Admin
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="rounded-lg p-1.5 transition-all hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  Resource Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.85)',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                >
                  <option style={{ background: '#0d1530' }}>Medicine</option>
                  <option style={{ background: '#0d1530' }}>Equipment</option>
                  <option style={{ background: '#0d1530' }}>Staff</option>
                  <option style={{ background: '#0d1530' }}>Other</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  Description
                </label>
                <textarea
                  rows={4}
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  onFocus={() => setFocusDesc(true)}
                  onBlur={() => setFocusDesc(false)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: focusDesc
                      ? '1px solid rgba(37,99,235,0.6)'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.85)',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxShadow: focusDesc ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  placeholder="Describe the resources you need..."
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 rounded-xl py-3 font-medium transition-all hover:bg-white/10"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                disabled={submitting || !requestDesc.trim()}
                onClick={() => {
                  setSubmitting(true);
                  createSupportRequest({ resource_type: requestType, description: requestDesc.trim(), requested_by: undefined })
                    .then(() => {
                      setRequestDesc('');
                      setShowRequestModal(false);
                    })
                    .catch((e: any) => setError(e?.message ?? 'Failed to send support request'))
                    .finally(() => setSubmitting(false));
                }}
                className="flex-1 rounded-xl py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
                  boxShadow: '0 0 15px rgba(37,99,235,0.4)',
                  fontSize: '14px',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
