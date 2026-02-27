import React from 'react';
import Globe3D from './components/Globe3D';
import LocalMap3D from './components/LocalMap3D';
import { useSocket } from './hooks/useSocket';
import {
  Activity, Bell, Compass, LayoutDashboard,
  Settings, Map, Search, Monitor, AlertTriangle, ArrowLeft, Wifi
} from 'lucide-react';
import useOutbreakStore from './store/outbreakStore';

function App() {
  useSocket();
  const {
    summary, realtimeUpdates, toggleRealtimeUpdates,
    outbreaks, viewMode, setViewMode, selectedOutbreak, selectOutbreak
  } = useOutbreakStore();

  const criticalCount = outbreaks.filter(o => o.severity >= 80).length;

  const getSeverityColor = (sev) => {
    if (sev >= 80) return '#ef4444';
    if (sev >= 60) return '#f97316';
    if (sev >= 40) return '#eab308';
    return '#3b82f6';
  };

  const getSeverityLabel = (sev) => {
    if (sev >= 80) return 'CRITICAL';
    if (sev >= 60) return 'HIGH';
    if (sev >= 40) return 'MEDIUM';
    return 'LOW';
  };

  return (
    /*
      ROOT: fills screen, nothing blocks pointer events by default.
      Globe is fullscreen z-0. All UI is z-10 with pointer-events-none
      except actual panels/buttons which get pointer-events-auto.
    */
    <div className="relative w-full h-screen overflow-hidden bg-[#050B14] text-gray-200">

      {/* ── 3D GLOBE / LOCAL MAP (fullscreen, z-0, receives all pointer events) ── */}
      <div className="absolute inset-0 z-0">
        {viewMode === 'global' ? <Globe3D /> : <LocalMap3D />}
      </div>

      {/* ── VIGNETTE OVERLAYS — pointer-events-none so globe stays interactive ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'linear-gradient(to right, rgba(5,11,20,0.92) 0%, rgba(5,11,20,0.1) 35%, rgba(5,11,20,0.1) 65%, rgba(5,11,20,0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'linear-gradient(to bottom, rgba(5,11,20,0.85) 0%, transparent 20%, transparent 80%, rgba(5,11,20,0.85) 100%)',
        }}
      />

      {/* ── UI SHELL — z-10, pointer-events-none by default ── */}
      <div className="absolute inset-0 z-10 flex pointer-events-none">

        {/* ───────────────── SLIM ICON SIDEBAR ───────────────── */}
        <div className="pointer-events-auto w-[60px] h-full flex flex-col items-center py-6 border-r border-white/10 bg-[#07101e]/80 backdrop-blur-xl shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f3ff] to-blue-700 mb-8 flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.4)]">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <div className="flex flex-col gap-5 items-center text-gray-500 flex-1">
            <button className="p-2 rounded-lg hover:bg-white/10 hover:text-[#00f3ff] transition-all"><Compass size={20} /></button>
            <button className="p-2 rounded-lg bg-blue-600/20 text-blue-400"><Map size={20} /></button>
            <button className="p-2 rounded-lg hover:bg-white/10 hover:text-[#00f3ff] transition-all"><Bell size={20} /></button>
            <button className="p-2 rounded-lg hover:bg-white/10 hover:text-[#00f3ff] transition-all"><Activity size={20} /></button>
          </div>
          <div className="flex flex-col gap-5 items-center text-gray-500">
            <button
              onClick={toggleRealtimeUpdates}
              title={realtimeUpdates ? 'Pause live sync' : 'Resume live sync'}
              className={`p-2 rounded-lg transition-all ${realtimeUpdates ? 'text-[#00f3ff] bg-[#00f3ff]/10' : 'hover:bg-white/10'}`}
            >
              <Wifi size={20} className={realtimeUpdates ? 'animate-pulse' : ''} />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 hover:text-[#00f3ff] transition-all"><Settings size={20} /></button>
          </div>
        </div>

        {/* ───────────────── MAIN CONTENT ───────────────── */}
        <div className="flex-1 flex flex-col h-full relative">

          {/* ── TOP NAV ── */}
          <div className="pointer-events-auto flex items-center justify-between px-8 h-16 border-b border-white/5 backdrop-blur-sm bg-[#07101e]/40">
            <div className="flex items-center gap-4">
              {viewMode === 'local' && (
                <button
                  onClick={() => setViewMode('global')}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Globe
                </button>
              )}
              <h1 className="text-lg font-semibold text-white tracking-wide">Health Logistics</h1>
              <div className="flex gap-1 text-xs text-gray-500 ml-2">
                <span
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => setViewMode('global')}
                >Map</span>
                <span>/</span>
                <span className="hover:text-white cursor-pointer">Regions</span>
                {viewMode === 'local' && (
                  <>
                    <span>/</span>
                    <span className="text-blue-400">{selectedOutbreak?.locationName || 'Local'}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                <Search size={14} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search region..."
                  className="bg-transparent outline-none text-sm w-36 text-gray-300 placeholder-gray-600"
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-400 font-semibold">{criticalCount} CRITICAL</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-emerald-400 font-semibold">LIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── FLOATING PANELS ROW ── */}
          <div className="flex-1 relative">

            {/* LEFT PANELS */}
            <div className="pointer-events-auto absolute left-6 top-6 flex flex-col gap-4 w-64">

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Zones', value: summary?.total ?? 0, color: '#00f3ff', icon: Monitor },
                  { label: 'Critical', value: summary?.critical ?? 0, color: '#ef4444', icon: AlertTriangle },
                  { label: 'High Risk', value: summary?.high ?? 0, color: '#f97316', icon: Activity },
                  { label: 'Units Active', value: '24/30', color: '#10b981', icon: Compass },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div
                    key={label}
                    className="bg-[#0b1628]/80 backdrop-blur-md border border-white/10 rounded-xl p-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <div className="text-xl font-bold text-white">{value}</div>
                  </div>
                ))}
              </div>

              {/* Outbreak List */}
              <div className="bg-[#0b1628]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Active Outbreaks</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#00f3ff22', color: '#00f3ff' }}
                  >
                    {summary?.total ?? 0}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {[...(outbreaks ?? [])].sort((a, b) => b.severity - a.severity).map(o => {
                    const col = getSeverityColor(o.severity);
                    const isSelected = selectedOutbreak?.id === o.id;
                    return (
                      <div
                        key={o.id}
                        onClick={() => { selectOutbreak(o); if (viewMode !== 'global') setViewMode('global'); }}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${isSelected ? 'bg-white/10' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: col,
                              boxShadow: `0 0 6px ${col}`,
                              animation: o.severity >= 80 ? 'ping 1s infinite' : 'none',
                            }}
                          />
                          <div>
                            <div className="text-xs font-medium text-gray-200">{o.locationName}</div>
                            <div className="text-[10px] text-gray-500">{o.disease}</div>
                          </div>
                        </div>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ background: col + '22', color: col }}
                        >
                          {getSeverityLabel(o.severity)}
                        </span>
                      </div>
                    );
                  })}
                  {(!outbreaks || outbreaks.length === 0) && (
                    <div className="px-4 py-6 text-center text-xs text-gray-600">
                      <div className="w-5 h-5 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                      Awaiting data...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT PANELS */}
            <div className="pointer-events-auto absolute right-6 top-6 flex flex-col gap-4 w-60">

              {/* Severity Distribution Bar Chart */}
              <div className="bg-[#0b1628]/80 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Severity Split</div>
                {[
                  { label: 'Critical', count: summary?.critical ?? 0, color: '#ef4444' },
                  { label: 'High', count: summary?.high ?? 0, color: '#f97316' },
                  { label: 'Medium', count: summary?.medium ?? 0, color: '#eab308' },
                  { label: 'Low', count: summary?.low ?? 0, color: '#3b82f6' },
                ].map(({ label, count, color }) => {
                  const pct = summary?.total ? Math.round((count / summary.total) * 100) : 0;
                  return (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-bold" style={{ color }}>{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: color,
                            boxShadow: `0 0 8px ${color}88`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deployment Stats */}
              <div className="bg-[#0b1628]/80 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Deployment</div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">24 <span className="text-base text-gray-500 font-normal">/ 30</span></div>
                    <div className="text-[11px] text-emerald-400 mt-1">↑ Units Active</div>
                  </div>
                  <svg viewBox="0 0 60 30" className="w-20 h-10 stroke-emerald-400 fill-none stroke-[1.5] drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">
                    <path d="M0,25 C10,22 15,8 25,12 C35,16 40,4 50,8 C55,10 58,5 60,3" />
                  </svg>
                </div>
              </div>

              {/* Selected outbreak detail */}
              {selectedOutbreak && (
                <div
                  className="bg-[#0b1628]/90 backdrop-blur-md border rounded-xl p-4"
                  style={{ borderColor: getSeverityColor(selectedOutbreak.severity) + '55' }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: getSeverityColor(selectedOutbreak.severity) }}
                  >
                    Selected Zone
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">{selectedOutbreak.locationName}</div>
                  <div className="text-xs text-gray-400 mb-3">{selectedOutbreak.disease}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-gray-500">Affected</div>
                      <div className="font-bold text-white">{selectedOutbreak.affected}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-gray-500">Severity</div>
                      <div className="font-bold" style={{ color: getSeverityColor(selectedOutbreak.severity) }}>
                        {selectedOutbreak.severity}%
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewMode('local')}
                    className="mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-90"
                    style={{ background: getSeverityColor(selectedOutbreak.severity) + '22', color: getSeverityColor(selectedOutbreak.severity), border: `1px solid ${getSeverityColor(selectedOutbreak.severity)}44` }}
                  >
                    View Local Map →
                  </button>
                </div>
              )}

            </div>

            {/* BOTTOM STATUS BAR */}
            <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-6 bg-[#0b1628]/80 backdrop-blur-md border border-white/10 rounded-full px-8 py-2.5 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${realtimeUpdates ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                  <span>{realtimeUpdates ? 'Live Sync Active' : 'Sync Paused'}</span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <span>Drag to rotate · Scroll to zoom · Click pin to focus</span>
                <div className="w-px h-3 bg-white/10" />
                <span className="text-[#00f3ff]">{outbreaks?.length ?? 0} active zones</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 50,
          backgroundImage: 'linear-gradient(rgba(0,243,255,0.015) 1px, transparent 1px)',
          backgroundSize: '100% 3px',
        }}
      />
    </div>
  );
}

export default App;
