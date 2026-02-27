import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import useOutbreakStore from '../store/outbreakStore';
import { ChevronLeft, X, AlertTriangle, Users, Activity } from 'lucide-react';



const getSeverityInfo = (sev) => {
    if (sev >= 80) return { color: '#ef4444', border: '#fca5a5', label: 'CRITICAL' };
    if (sev >= 60) return { color: '#f97316', border: '#fdba74', label: 'HIGH' };
    if (sev >= 40) return { color: '#eab308', border: '#fde047', label: 'MEDIUM' };
    return { color: '#3b82f6', border: '#93c5fd', label: 'LOW' };
};

const DISEASE_ICON = { Dengue: '🦟', Malaria: '🦠', Cholera: '💧', Typhoid: '🔬' };

const buildLandmarkEl = (o, onClick) => {
    const info = getSeverityInfo(o.severity);
    const icon = DISEASE_ICON[o.disease] ?? '⛑️';
    const size = o.severity >= 80 ? 58 : o.severity >= 60 ? 52 : 44;

    const el = document.createElement('div');
    el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;';
    el.innerHTML = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:radial-gradient(circle at 35% 35%,${info.color}dd,${info.color}88);
      border:2.5px solid ${info.border};
      box-shadow:0 0 20px ${info.color}66,0 4px 15px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.2);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      transition:transform 0.2s ease;position:relative;
    ">
      <span style="font-size:${o.severity >= 80 ? 18 : 15}px;line-height:1;">${icon}</span>
      <div style="
        position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;
        background:${info.color};border:2px solid rgba(10,15,25,0.9);
        animation:landmarkPulse 2s ease-in-out infinite;
      "></div>
    </div>
    <div style="
      color:#fff;font-size:11px;font-weight:600;text-align:center;max-width:90px;
      text-shadow:0 1px 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.8);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    ">${o.locationName}</div>
  `;

    const circle = el.querySelector('div');
    el.addEventListener('mouseenter', () => { if (circle) circle.style.transform = 'scale(1.12)'; });
    el.addEventListener('mouseleave', () => { if (circle) circle.style.transform = 'scale(1)'; });
    el.addEventListener('click', (e) => { e.stopPropagation(); onClick(o); });
    return el;
};

export default function MapboxView({ mapTheme = 'dark' }) {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const { outbreaks, selectedOutbreak, selectOutbreak, setViewMode } = useOutbreakStore();
    const [selectedPin, setSelectedPin] = useState(selectedOutbreak || null);

    const isDark = mapTheme === 'dark';

    // ── React to theme prop changes ─────────────────────────────
    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.setConfigProperty('basemap', 'lightPreset', isDark ? 'dusk' : 'day');
    }, [mapTheme]);

    const center = selectedOutbreak
        ? [selectedOutbreak.lng, selectedOutbreak.lat]
        : [78.963, 20.593];

    // ── React to sidebar selection changes ───────────────────
    useEffect(() => {
        if (!selectedOutbreak) return;
        setSelectedPin(selectedOutbreak);
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [selectedOutbreak.lng, selectedOutbreak.lat],
                zoom: 16,
                pitch: 68,
                bearing: -15,
                duration: 1800,
                essential: true,
            });
        }
    }, [selectedOutbreak]);

    // ── Place markers ─────────────────────────────────────────
    const placeMarkers = (map) => {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        outbreaks.forEach(o => {
            const el = buildLandmarkEl(o, (outbreak) => {
                setSelectedPin(outbreak);
                selectOutbreak(outbreak);
                map.flyTo({
                    center: [outbreak.lng, outbreak.lat],
                    zoom: 16,
                    pitch: 68,
                    bearing: -15 + Math.random() * 30,
                    duration: 1800,
                    essential: true,
                });
            });
            markersRef.current.push(
                new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat([o.lng, o.lat])
                    .addTo(map)
            );
        });
    };

    // ── Lightweight glow circles (replaces heavy heatmap, much faster) ──
    const addHeatmap = (map) => {
        map.addSource('heat-src', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: outbreaks.map(o => ({
                    type: 'Feature',
                    properties: { sev: o.severity },
                    geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
                })),
            },
        });
        map.addLayer({
            id: 'outbreak-glow',
            type: 'circle',
            source: 'heat-src',
            maxzoom: 13,
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 12, 36],
                'circle-color': ['interpolate', ['linear'], ['get', 'sev'],
                    0, '#3b82f6', 60, '#f97316', 80, '#ef4444'],
                'circle-opacity': 0.3,
                'circle-blur': 1.8,
            },
        });
    };

    // ── Init map ──────────────────────────────────────────────
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/standard',
            center,
            zoom: 3,
            pitch: 50,
            bearing: -20,
            antialias: true,
        });

        mapRef.current.on('style.load', () => {
            mapRef.current.setConfigProperty('basemap', 'lightPreset', 'dusk');
            mapRef.current.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
            mapRef.current.setConfigProperty('basemap', 'showTransitLabels', false);

            addHeatmap(mapRef.current);
            placeMarkers(mapRef.current);

            // Phase 1: city overview
            mapRef.current.flyTo({ center, zoom: 10, pitch: 55, bearing: -20, duration: 2000, essential: true });
            // Phase 2: street level
            setTimeout(() => {
                mapRef.current?.flyTo({
                    center, zoom: 16, pitch: 68, bearing: -18, duration: 3500, essential: true,
                    easing: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
                });
            }, 2100);
        });

        return () => {
            markersRef.current.forEach(m => m.remove());
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []); // eslint-disable-line

    // ── Live-update heatmap ───────────────────────────────────
    useEffect(() => {
        const src = mapRef.current?.getSource('heat-src');
        if (!src) return;
        src.setData({
            type: 'FeatureCollection',
            features: outbreaks.map(o => ({
                type: 'Feature',
                properties: { w: o.severity / 100 },
                geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
            })),
        });
    }, [outbreaks]);

    const pinInfo = selectedPin ? getSeverityInfo(selectedPin.severity) : null;

    return (
        <div className="absolute inset-0 z-0">
            <style>{`
        @keyframes landmarkPulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.6); opacity:0; }
        }
        .mapboxgl-ctrl-bottom-right,
        .mapboxgl-ctrl-bottom-left { display:none !important; }
      `}</style>

            {/* Map canvas */}
            <div ref={mapContainer} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

            {/* Vignette — left + top only, NOT bottom-right where the card lives */}
            <div className="absolute inset-0 pointer-events-none" style={{
                zIndex: 2,
                background: 'linear-gradient(to right, rgba(4,8,18,0.65) 0%, transparent 32%), linear-gradient(to bottom, rgba(4,8,18,0.55) 0%, transparent 22%)',
            }} />

            {/* Status pill only — Back+Toggle buttons are in App.jsx header */}
            {selectedPin && pinInfo && (
                <div
                    className="absolute top-20 left-[76px] z-30 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border pointer-events-none"
                    style={{ color: pinInfo.color, background: pinInfo.color + '18', borderColor: pinInfo.color + '50' }}
                >
                    <span className="animate-pulse">◉</span>
                    {selectedPin.locationName} — {selectedPin.disease}
                </div>
            )}


            {/* ── Info card — bottom-right, z-50 so it's always above vignette ── */}
            {selectedPin && pinInfo && (
                <div
                    className="absolute bottom-6 right-6 z-50 w-[300px]"
                    style={{ pointerEvents: 'auto', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}
                >
                    <div
                        className="backdrop-blur-2xl rounded-2xl border p-4"
                        style={{
                            background: isDark ? 'rgba(5,14,28,0.97)' : 'rgba(248,250,252,0.97)',
                            borderColor: isDark ? pinInfo.color + '44' : pinInfo.color + '66',
                            boxShadow: isDark
                                ? `0 20px 50px rgba(0,0,0,0.9), 0 0 24px ${pinInfo.color}20`
                                : `0 10px 40px rgba(0,0,0,0.18), 0 0 16px ${pinInfo.color}22`,
                        }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                                <span
                                    className="inline-block text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded mb-1.5"
                                    style={{ background: pinInfo.color + '20', color: pinInfo.color, border: `1px solid ${pinInfo.color}40` }}
                                >{pinInfo.label}</span>
                                <h2 className="text-lg font-bold leading-tight truncate"
                                    style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{selectedPin.locationName}</h2>
                                <p className="text-xs mt-0.5"
                                    style={{ color: isDark ? '#94a3b8' : '#475569' }}>{DISEASE_ICON[selectedPin.disease] ?? '⛑️'} {selectedPin.disease}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPin(null)}
                                className="p-1 ml-2 flex-shrink-0 rounded-lg transition-all hover:scale-105"
                                style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                            ><X size={14} /></button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { icon: Users, label: 'Affected', value: selectedPin.affected },
                                { icon: AlertTriangle, label: 'Severity', value: `${selectedPin.severity}%` },
                                { icon: Activity, label: 'Status', value: selectedPin.severity >= 80 ? 'Critical' : selectedPin.severity >= 60 ? 'Active' : 'OK' },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="text-center rounded-xl py-2 px-1" style={{
                                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                }}>
                                    <Icon size={11} className="mx-auto mb-1" style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                                    <div className="text-[9px] uppercase tracking-wider" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{label}</div>
                                    <div className="font-bold text-xs mt-0.5 truncate" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Severity bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-[10px] mb-1">
                                <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Severity Index</span>
                                <span style={{ color: pinInfo.color }}>{selectedPin.severity}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                <div className="h-full rounded-full" style={{
                                    width: `${selectedPin.severity}%`,
                                    background: `linear-gradient(90deg,${pinInfo.color}66,${pinInfo.color})`,
                                    boxShadow: `0 0 8px ${pinInfo.color}88`,
                                    transition: 'width 1s ease',
                                }} />
                            </div>
                        </div>

                        {/* Nearby centers */}
                        <div className="mb-3 rounded-xl border p-2.5" style={{
                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        }}>
                            <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Nearby Centers</div>
                            <div className="flex gap-1.5 flex-wrap">
                                {['CHC Block A', 'PHC Sector 4', 'Dist. Hospital'].map(c => (
                                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded"
                                        style={{
                                            background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(59,130,246,0.25)',
                                        }}>{c}</span>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className="py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:scale-[1.02] transition-all"
                                style={{ background: pinInfo.color + '20', color: pinInfo.color, border: `1px solid ${pinInfo.color}40` }}
                            >Allocate</button>
                            <button className="py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:scale-[1.02] transition-all"
                                style={{
                                    background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.1)',
                                    color: isDark ? '#34d399' : '#065f46',
                                    border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : 'rgba(5,150,105,0.3)'}`,
                                }}>
                                Resolved
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hint bar */}
            {!selectedPin && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-6 py-2.5 text-xs text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Click any marker to view details · Drag to rotate · Scroll to zoom
                    </div>
                </div>
            )}
        </div>
    );
}
