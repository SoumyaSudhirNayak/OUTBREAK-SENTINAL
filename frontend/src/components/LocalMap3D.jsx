import React from 'react';
import useOutbreakStore from '../store/outbreakStore';

// Pure CSS/HTML local region view — no @react-three/fiber dependency
const LocalMap3D = () => {
    const { selectedOutbreak } = useOutbreakStore();

    const getSeverityColor = (severity) => {
        if (severity >= 80) return '#ef4444';
        if (severity >= 60) return '#f97316';
        if (severity >= 40) return '#eab308';
        return '#3b82f6';
    };

    const col = selectedOutbreak ? getSeverityColor(selectedOutbreak.severity) : '#00f3ff';

    // Generate a pseudo-random but deterministic city grid
    const nodes = [];
    for (let i = 0; i < 30; i++) {
        const seed = i * 137.508; // golden angle
        nodes.push({
            x: 50 + 40 * Math.cos(seed) * (i / 30),
            y: 50 + 40 * Math.sin(seed) * (i / 30),
            size: Math.random() * 3 + 1,
        });
    }

    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#030810]">
            {/* Animated grid */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ opacity: 0.4 }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e3a5f" strokeWidth="0.5" />
                    </pattern>
                    <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={col} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={col} stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Grid */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Perspective lines (faux 3D tilt) */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <line
                        key={`h${i}`}
                        x1="0" y1={`${30 + i * 6}%`}
                        x2="100%" y2={`${30 + i * 6}%`}
                        stroke="#1e3a5f" strokeWidth="0.4"
                    />
                ))}
                {Array.from({ length: 20 }).map((_, i) => (
                    <line
                        key={`v${i}`}
                        x1={`${i * 5 + 2.5}%`} y1="30%"
                        x2={`${i * 5}%`} y2="100%"
                        stroke="#1e3a5f" strokeWidth="0.4"
                    />
                ))}

                {/* Heatmap blob */}
                <ellipse
                    cx="50%" cy="60%"
                    rx="22%" ry="15%"
                    fill="url(#heatGlow)"
                    style={{ animation: 'heatPulse 3s ease-in-out infinite' }}
                />

                {/* City nodes */}
                {nodes.map((n, i) => (
                    <g key={i}>
                        <circle
                            cx={`${n.x}%`} cy={`${40 + n.y * 0.4}%`}
                            r={n.size}
                            fill={i % 5 === 0 ? col : '#1d4ed8'}
                            opacity={0.8}
                        />
                        {i % 4 === 0 && (
                            <rect
                                x={`${n.x - 1}%`} y={`${40 + n.y * 0.4 - 5}%`}
                                width="2%" height={`${Math.random() * 6 + 2}%`}
                                fill={i % 8 === 0 ? col : '#1e40af'}
                                opacity={0.7}
                            />
                        )}
                    </g>
                ))}

                {/* Connection lines */}
                {nodes.slice(0, 15).map((n, i) =>
                    nodes.slice(i + 1, i + 3).map((m, j) => (
                        <line
                            key={`${i}-${j}`}
                            x1={`${n.x}%`} y1={`${40 + n.y * 0.4}%`}
                            x2={`${m.x}%`} y2={`${40 + m.y * 0.4}%`}
                            stroke="#f97316" strokeWidth="0.5" opacity="0.4"
                        />
                    ))
                )}
            </svg>

            {/* Pulse ring around epicenter */}
            <div className="absolute" style={{
                left: '50%', top: '60%',
                transform: 'translate(-50%, -50%)',
            }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: `${i * 80}px`,
                        height: `${i * 50}px`,
                        borderRadius: '50%',
                        border: `1px solid ${col}`,
                        opacity: 0.4 / i,
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: `localRing ${1.5 + i * 0.5}s ease-in-out infinite`,
                    }} />
                ))}
                <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: col,
                    boxShadow: `0 0 20px ${col}, 0 0 40px ${col}55`,
                    position: 'relative',
                }} />
            </div>

            <style>{`
        @keyframes heatPulse {
          0%, 100% { opacity: 0.7; r: 22%; }
          50% { opacity: 1; }
        }
        @keyframes localRing {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.2; }
        }
      `}</style>
        </div>
    );
};

export default LocalMap3D;
