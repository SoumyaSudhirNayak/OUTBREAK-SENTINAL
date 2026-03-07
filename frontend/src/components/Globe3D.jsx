import React, { useRef, useEffect, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import useOutbreakStore from '../store/outbreakStore';

const getSeverityColor = (severity, alpha = 1) => {
    if (severity >= 80) return `rgba(239, 68, 68, ${alpha})`;   // Red
    if (severity >= 60) return `rgba(249, 115, 22, ${alpha})`;  // Orange
    if (severity >= 40) return `rgba(234, 179, 8, ${alpha})`;   // Yellow
    return `rgba(59, 130, 246, ${alpha})`;                       // Blue
};

const getSeverityHex = (severity) => {
    if (severity >= 80) return '#ef4444';
    if (severity >= 60) return '#f97316';
    if (severity >= 40) return '#eab308';
    return '#3b82f6';
};

const Globe3D = ({ globeTheme = 'dark' }) => {
    const globeRef = useRef();
    const { outbreaks, selectedOutbreak, selectOutbreak, setViewMode } = useOutbreakStore();
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    const isUserInteracting = useRef(false);
    const interactionTimer = useRef(null);
    const flyTimer = useRef(null);
    const introTimers = useRef([]);

    // ─── Resize ───────────────────────────────────────────────
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ─── Cinematic intro — triggered by onGlobeReady ───────────
    // (onGlobeReady fires only once the Three.js scene is set up,
    //  so the globe is guaranteed to be visible on screen first)
    const handleGlobeReady = useCallback(() => {
        const g = globeRef.current;
        if (!g) return;

        const ctrl = g.controls();
        ctrl.autoRotate = true;
        ctrl.autoRotateSpeed = 3.0;   // fast spin while globe is small
        ctrl.enableDamping = true;
        ctrl.dampingFactor = 0.06;
        ctrl.enableZoom = true;
        ctrl.minDistance = 150;
        ctrl.maxDistance = 600;

        // One rendered frame first, then snap camera far out
        requestAnimationFrame(() => {
            g.pointOfView({ altitude: 10 });

            // ── Zoom animation via RAF ──────────────────────────────
            // Using RAF instead of pointOfView(duration) so autoRotate
            // can run simultaneously (pointOfView with duration locks camera)
            const HOLD_MS = 2000;  // sit at altitude 10 for 2 seconds
            const ZOOM_MS = 3000;  // then zoom over 3 seconds
            const START_ALT = 10;
            const END_ALT = 1.8;
            const easeInOut = t => t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const zoomBegin = Date.now() + HOLD_MS;

            const tick = () => {
                const elapsed = Date.now() - zoomBegin;
                if (elapsed < 0) { requestAnimationFrame(tick); return; }

                const progress = Math.min(elapsed / ZOOM_MS, 1);
                const alt = START_ALT + (END_ALT - START_ALT) * easeInOut(progress);
                g.pointOfView({ altitude: alt });

                // Decelerate spin from 3.0 → 0.25 as zoom progresses
                const spinSpeed = 3.0 + (0.25 - 3.0) * easeInOut(progress);
                if (g.controls) g.controls().autoRotateSpeed = spinSpeed;

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    // Zoom done — ramp rotation up to normal cruising speed
                    let speed = 0.25;
                    const iv = setInterval(() => {
                        speed = Math.min(speed + 0.01, 0.45);
                        if (g.controls) g.controls().autoRotateSpeed = speed;
                        if (speed >= 0.45) clearInterval(iv);
                    }, 80);
                    introTimers.current.push(iv);
                }
            };

            requestAnimationFrame(tick);
        });
    }, []);

    // ─── Pause rotation on interaction, resume after idle ────
    const pauseRotation = useCallback(() => {
        if (!globeRef.current) return;
        globeRef.current.controls().autoRotate = false;
        isUserInteracting.current = true;
        clearTimeout(interactionTimer.current);
        interactionTimer.current = setTimeout(() => {
            if (globeRef.current) {
                globeRef.current.controls().autoRotate = true;
            }
            isUserInteracting.current = false;
        }, 3000); // resume auto-rotate after 3s idle
    }, []);

    useEffect(() => {
        const globe = globeRef.current;
        if (!globe) return;
        const el = globe.renderer().domElement;
        el.addEventListener('mousedown', pauseRotation);
        el.addEventListener('wheel', pauseRotation);
        el.addEventListener('touchstart', pauseRotation);
        return () => {
            el.removeEventListener('mousedown', pauseRotation);
            el.removeEventListener('wheel', pauseRotation);
            el.removeEventListener('touchstart', pauseRotation);
        };
    }, [pauseRotation]);

    // ─── Fly-to on selection ──────────────────────────────────
    useEffect(() => {
        if (selectedOutbreak && globeRef.current) {
            globeRef.current.controls().autoRotate = false;
            globeRef.current.pointOfView({
                lat: selectedOutbreak.lat,
                lng: selectedOutbreak.lng,
                altitude: 1.0,
            }, 1800);
        }
    }, [selectedOutbreak]);

    // ─── Heatmap data ─────────────────────────────────────────
    const heatPoints = outbreaks.map(o => ({
        lat: o.lat,
        lng: o.lng,
        weight: o.severity / 100,
        severity: o.severity,
    }));

    // ─── Arc data: hub → pin connections ─────────────────────
    const HUB = { lat: 20.5937, lng: 78.9629 };
    const arcsData = outbreaks.map(o => ({
        startLat: HUB.lat,
        startLng: HUB.lng,
        endLat: o.lat,
        endLng: o.lng,
        color: [getSeverityHex(o.severity), 'rgba(0,0,0,0)'],
    }));

    // ─── HTML pin factory ─────────────────────────────────────
    const makePin = (d) => {
        const col = getSeverityHex(d.severity);
        const el = document.createElement('div');
        el.style.cssText = 'position:relative;width:32px;height:32px;cursor:pointer';
        el.innerHTML = `
      <div style="
        position:absolute;inset:0;border-radius:50%;background:${col};
        animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;opacity:0.5;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;width:12px;height:12px;
        transform:translate(-50%,-50%);border-radius:50%;background:${col};
        border:2px solid white;box-shadow:0 0 12px ${col},0 0 4px white;
      "></div>
      <div class="pin-tooltip" style="
        position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
        background:rgba(9,17,36,0.92);border:1px solid rgba(255,255,255,0.15);
        backdrop-filter:blur(8px);color:#fff;padding:10px 14px;border-radius:12px;
        min-width:180px;pointer-events:none;opacity:0;transition:opacity 0.2s;
        box-shadow:0 8px 32px rgba(0,100,200,0.3);z-index:999;
        font-family:system-ui,sans-serif;
      ">
        <div style="color:${col};font-size:10px;font-weight:700;letter-spacing:0.12em;margin-bottom:4px">${d.locationName?.toUpperCase()}</div>
        <div style="font-size:12px;margin-bottom:6px;color:#94a3b8">${d.disease}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b">
          <span>Affected</span><span style="color:#fff;font-weight:600">${d.affected}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-top:3px">
          <span>Severity</span><span style="color:${col};font-weight:600">${d.severity}%</span>
        </div>
        <div style="
          margin-top:8px;background:${col}22;border:1px solid ${col}55;
          color:${col};font-size:10px;font-weight:700;text-align:center;
          padding:4px 8px;border-radius:6px;letter-spacing:0.08em;cursor:pointer
        ">
          CLICK TO ZOOM IN →
        </div>
      </div>
    `;

        // hover show/hide tooltip
        const tooltip = el.querySelector('.pin-tooltip');
        el.addEventListener('mouseenter', () => { tooltip.style.opacity = '1'; });
        el.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

        // click → fly to location → then transition to Mapbox
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectOutbreak(d);
            if (globeRef.current) {
                globeRef.current.controls().autoRotate = false;
                globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.4 }, 1800);
                clearTimeout(flyTimer.current);
                flyTimer.current = setTimeout(() => {
                    setViewMode('mapbox');
                }, 2000);
            }
        });

        return el;
    };

    return (
        <>
            {/* Keyframe styles for pin pulse */}
            <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

            <div className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing">
                <Globe
                    ref={globeRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    onGlobeReady={handleGlobeReady}

                    // Textures — switch between night (dark) and Blue Marble (light)
                    globeImageUrl={
                        globeTheme === 'dark'
                            ? '//unpkg.com/three-globe/example/img/earth-night.jpg'
                            : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
                    }
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

                    // Atmosphere — vibrant blue for light, electric blue for dark
                    atmosphereColor={globeTheme === 'dark' ? '#1d4ed8' : '#38bdf8'}
                    atmosphereAltitude={globeTheme === 'dark' ? 0.2 : 0.25}

                    // ── Heatmap hex bins ──────────────────────
                    hexBinPointsData={heatPoints}
                    hexBinPointWeight="weight"
                    hexBinResolution={4}
                    hexAltitude={d => 0.01 + d.sumWeight * 0.15}
                    hexTopColor={d => getSeverityHex(Math.max(...d.points.map(p => p.severity)))}
                    hexSideColor={d => getSeverityColor(Math.max(...d.points.map(p => p.severity)), 0.5)}
                    hexBinMerge={false}
                    hexTransitionDuration={800}

                    // ── Animated arcs ─────────────────────────
                    arcsData={arcsData}
                    arcColor="color"
                    arcDashLength={0.5}
                    arcDashGap={3}
                    arcDashInitialGap={() => Math.random() * 5}
                    arcDashAnimateTime={2500}
                    arcAltitude={0.25}
                    arcStroke={0.5}

                    // ── HTML pins ─────────────────────────────
                    htmlElementsData={outbreaks}
                    htmlElement={makePin}
                    htmlAltitude={0.02}
                />
            </div>
        </>
    );
};

export default Globe3D;
