import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { listLiveRecoveryTrend, listLiveTreatmentCategoryStats, type RecoveryTrendPoint, type TreatmentCategoryStat } from '../utils/doctorDashboardApi';
import { getWebSocketBaseUrl } from '../utils/env';

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  borderRadius: '20px',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(13,21,48,0.95)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: '12px',
          padding: '10px 16px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color, fontSize: '13px', fontWeight: '600' }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TreatmentStatusTab() {
  const [treatmentData, setTreatmentData] = useState<TreatmentCategoryStat[]>([]);
  const [recoveryTrend, setRecoveryTrend] = useState<RecoveryTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'ongoing' | 'shortage'>('ongoing');

  const reload = (signal?: AbortSignal) =>
    Promise.all([listLiveTreatmentCategoryStats(signal), listLiveRecoveryTrend(14, signal)]).then(([cats, trend]) => {
      setTreatmentData(cats);
      setRecoveryTrend(trend);
    });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    reload(ac.signal)
      .catch((e: any) => setError(e?.message ?? 'Failed to load treatment data'))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const wsUrl = `${getWebSocketBaseUrl()}/ws/global`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'resources.updated') {
          reload().catch(() => null);
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
  }, []);

  const rows = useMemo(
    () =>
      treatmentData.map((r) => ({
        category: r.disease_type,
        total: r.total_cases,
        treated: r.treated,
        underTreatment: r.under_treatment,
        recovered: r.recovered,
        critical: r.critical,
      })),
    [treatmentData],
  );

  const totalCases = rows.reduce((s, r) => s + r.total, 0);
  const totalRecovered = rows.reduce((s, r) => s + r.recovered, 0);
  const totalCritical = rows.reduce((s, r) => s + r.critical, 0);
  const totalUnder = rows.reduce((s, r) => s + r.underTreatment, 0);

  const chartData = useMemo(
    () =>
      recoveryTrend.map((p) => {
        const d = new Date(p.snapshot_date);
        const day = d.toLocaleDateString('en-US', { weekday: 'short' });
        return { day, recovered: p.recovered, active: p.active };
      }),
    [recoveryTrend],
  );

  const statCards = [
    { label: 'Total Cases', value: totalCases, color: '#60a5fa', glow: 'rgba(37,99,235,0.4)' },
    { label: 'Recovered', value: totalRecovered, color: '#34d399', glow: 'rgba(34,197,94,0.4)' },
    { label: 'Under Treatment', value: totalUnder, color: '#fbbf24', glow: 'rgba(245,158,11,0.4)' },
    { label: 'Critical', value: totalCritical, color: '#f87171', glow: 'rgba(220,38,38,0.4)' },
  ];

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
              Live Data
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
            Treatment Progress
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Monitor patient recovery and treatment status across all categories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStatus(status === 'ongoing' ? 'shortage' : 'ongoing')}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            style={
              status === 'ongoing'
                ? {
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    color: '#34d399',
                  }
                : {
                    background: 'rgba(220,38,38,0.1)',
                    border: '1px solid rgba(220,38,38,0.25)',
                    color: '#f87171',
                  }
            }
          >
            {status === 'ongoing' ? (
              <>
                <Activity className="h-4 w-4" />
                Treatment Ongoing
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Critical Shortage
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, color, glow }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {label}
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color, textShadow: `0 0 20px ${glow}` }}
            >
              {value}
            </div>
            <div
              className="mt-3 h-0.5 rounded-full"
              style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }}
            />
          </div>
        ))}
      </div>

      {/* Treatment Table */}
      <div style={glassCard} className="overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Patient Categories
          </h3>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              reload()
                .catch((e: any) => setError(e?.message ?? 'Failed to refresh'))
                .finally(() => setLoading(false));
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10"
            style={{
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.2)',
              color: '#60a5fa',
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Patient Category', 'Total Cases', 'Treated', 'Under Treatment', 'Recovered', 'Critical', 'Action'].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-6 py-6" colSpan={7} style={{ color: 'rgba(255,255,255,0.5)' }}>
                    No treatment data available yet.
                  </td>
                </tr>
              )}
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="transition-all"
                  style={{
                    borderBottom:
                      index < treatmentData.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(37,99,235,0.05)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="whitespace-nowrap px-6 py-4 font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {row.category}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {row.total}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {row.treated}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: 'rgba(37,99,235,0.15)',
                        border: '1px solid rgba(37,99,235,0.3)',
                        color: '#60a5fa',
                      }}
                    >
                      {row.underTreatment}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        color: '#34d399',
                      }}
                    >
                      {row.recovered}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.critical > 0 ? (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: 'rgba(220,38,38,0.12)',
                          border: '1px solid rgba(220,38,38,0.3)',
                          color: '#f87171',
                        }}
                      >
                        {row.critical}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <select
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.7)',
                        padding: '6px 10px',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option style={{ background: '#0d1530' }}>Update Status</option>
                      <option style={{ background: '#0d1530' }}>Add Treatment</option>
                      <option style={{ background: '#0d1530' }}>Mark Recovered</option>
                      <option style={{ background: '#0d1530' }}>Mark Critical</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery Trend Chart */}
      <div style={glassCard} className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'rgba(37,99,235,0.15)',
                border: '1px solid rgba(37,99,235,0.25)',
              }}
            >
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Daily Recovery Trend
              </h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Weekly overview of recovery vs active cases
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Recovered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Active
            </span>
          </div>
        </div>
        <div style={{ height: '260px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="day"
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="recovered"
                stroke="#60a5fa"
                strokeWidth={2.5}
                fill="url(#recoveredGrad)"
                dot={{ fill: '#60a5fa', r: 4, strokeWidth: 2, stroke: 'rgba(13,21,48,0.8)' }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'rgba(13,21,48,0.8)' }}
                name="Recovered"
              />
              <Area
                type="monotone"
                dataKey="active"
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#activeGrad)"
                dot={{ fill: '#fbbf24', r: 3, strokeWidth: 2, stroke: 'rgba(13,21,48,0.8)' }}
                name="Active"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Update Button */}
      <div className="flex justify-end">
        {error && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
