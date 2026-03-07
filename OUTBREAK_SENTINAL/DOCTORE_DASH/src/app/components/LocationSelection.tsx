import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, Plus, Minus, RotateCcw, Search, Loader2, ChevronLeft, CheckCircle } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxPublicToken } from '../utils/env';

interface LocationSelectionProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
  submitting?: boolean;
}

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
};

export function LocationSelection({ onBack, onSubmit, submitting }: LocationSelectionProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(5);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedArea, setSelectedArea] = useState('');
  const [focusSearch, setFocusSearch] = useState(false);
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mapError, setMapError] = useState<string | null>(null);

  const mapboxToken = useMemo(() => {
    try {
      return getMapboxPublicToken();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!mapboxToken) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const container = mapContainerRef.current;

    setMapStatus('loading');
    setMapError(null);
    
    // Create the map object
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937],
      zoom: 5,
      trackResize: true,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    const handleLoad = () => {
      setMapStatus('ready');
      // Force multiple resizes to ensure tile loading
      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 500);
      setTimeout(() => map.resize(), 1000);
    };

    const handleIdle = () => {
      setMapStatus('ready');
    };

    const handleError = (e: any) => {
      setMapStatus('error');
      const message =
        (typeof e?.error?.message === 'string' && e.error.message) ||
        (typeof e?.error === 'string' && e.error) ||
        (typeof e?.message === 'string' && e.message) ||
        'Map failed to load';
      setMapError(message);
    };

    map.on('load', handleLoad);
    map.on('idle', handleIdle);
    map.on('error', handleError);

    // Watch for container resize
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        try {
          mapRef.current.resize();
        } catch {
          return;
        }
      }
    });
    ro.observe(container);

    map.on('click', async (e) => {
      const lng = Number(e.lngLat.lng.toFixed(6));
      const lat = Number(e.lngLat.lat.toFixed(6));
      setCoordinates({ lat, lng });
      await setMarkerAndArea(lat, lng);
    });

    map.on('zoom', () => {
      try {
        setZoom(Number(map.getZoom().toFixed(1)));
      } catch {
        return;
      }
    });

    return () => {
      ro.disconnect();
      map.off('load', handleLoad);
      map.off('idle', handleIdle);
      map.off('error', handleError);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  const setMarkerAndArea = async (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.style.width = '22px';
      el.style.height = '22px';
      el.style.borderRadius = '50%';
      el.style.background = '#DC2626';
      el.style.boxShadow = '0 0 16px rgba(220,38,38,0.7)';
      el.style.border = '2px solid rgba(255,255,255,0.85)';
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${lng},${lat}`)}.json?access_token=${encodeURIComponent(mapboxToken ?? '')}`,
      );
      if (resp.ok) {
        const data = await resp.json();
        const placeName = data?.features?.[0]?.place_name as string | undefined;
        if (placeName) setSelectedArea(placeName);
      }
    } catch {
      return;
    }
  };

  const handleUseCurrentLocation = () => {
    setLoadingGPS(true);
    if (!navigator.geolocation) {
      setLoadingGPS(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoordinates({ lat, lng });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: Math.max(13, zoom) });
        await setMarkerAndArea(lat, lng);
        setLoadingGPS(false);
      },
      () => {
        setLoadingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q || !mapboxToken) return;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(mapboxToken)}&country=IN&limit=1`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        const feature = data?.features?.[0];
        const center = feature?.center;
        if (!Array.isArray(center) || center.length < 2) return;
        const lng = Number(Number(center[0]).toFixed(6));
        const lat = Number(Number(center[1]).toFixed(6));
        setCoordinates({ lat, lng });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 13 });
        setSelectedArea(feature?.place_name ?? q);
        await setMarkerAndArea(lat, lng);
      })
      .catch(() => null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ coordinates, selectedArea });
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <div
            className="h-1 w-8 rounded-full"
            style={{ background: 'linear-gradient(90deg, #2563EB, #818cf8)' }}
          />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
            Step 2
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
          Select Outbreak Location
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Pin the exact location on the map for accurate tracking and clinic routing
        </p>
      </div>

      <div style={glassCard} className="p-8">
        {/* Search Bar */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => setFocusSearch(true)}
              onBlur={() => setFocusSearch(false)}
              placeholder="Search village or district..."
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: focusSearch
                  ? '1px solid rgba(37,99,235,0.7)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.9)',
                width: '100%',
                padding: '12px 16px 12px 44px',
                outline: 'none',
                fontSize: '14px',
                boxShadow: focusSearch ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                transition: 'all 0.2s',
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={loadingGPS}
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-medium text-white transition-all hover:scale-[1.02] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
              boxShadow: '0 0 15px rgba(37,99,235,0.35)',
              fontSize: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            {loadingGPS ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Use Current Location</span>
          </button>
        </div>

        {/* Map */}
        <div className="relative mb-6">
          <div
            className="relative cursor-crosshair overflow-hidden"
            style={{
              height: '380px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(6, 11, 26, 0.55)',
            }}
          >
            <div ref={mapContainerRef} className="h-full w-full" />

            {mapboxToken && mapStatus !== 'ready' && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-2.5 text-center"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(10px)',
                  pointerEvents: 'none',
                  color: 'rgba(255,255,255,0.70)',
                  maxWidth: '92%',
                }}
              >
                <p className="text-xs">
                  {mapStatus === 'error' ? (mapError ?? 'Map failed to load') : 'Loading map…'}
                </p>
              </div>
            )}

            {!mapboxToken && (
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-2.5 text-center"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  pointerEvents: 'none',
                }}
              >
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Set VITE_MAPBOX_PUBLIC_TOKEN to enable the map
                </p>
              </div>
            )}
          </div>

          {/* Map Controls */}
          <div
            className="absolute right-4 top-4 flex flex-col gap-1 rounded-xl p-1.5"
            style={{
              background: 'rgba(13,21,48,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {[
              { icon: Plus, action: () => mapRef.current?.zoomTo((mapRef.current?.getZoom() ?? zoom) + 1), title: 'Zoom In' },
              { icon: Minus, action: () => mapRef.current?.zoomTo((mapRef.current?.getZoom() ?? zoom) - 1), title: 'Zoom Out' },
              {
                icon: RotateCcw,
                action: () => {
                  mapRef.current?.flyTo({ center: [78.9629, 20.5937], zoom: 5 });
                  markerRef.current?.remove();
                  markerRef.current = null;
                  setCoordinates(null);
                  setSelectedArea('');
                },
                title: 'Reset',
              },
            ].map(({ icon: Icon, action, title }, idx) => (
              <button
                key={idx}
                type="button"
                onClick={action}
                title={title}
                className="rounded-lg p-2 transition-all hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Coordinates Display */}
        {coordinates && (
          <div
            className="mb-6 grid gap-4 rounded-xl p-5 sm:grid-cols-3"
            style={{
              background: 'rgba(37,99,235,0.06)',
              border: '1px solid rgba(37,99,235,0.2)',
            }}
          >
            {[
              { label: 'Latitude', value: coordinates.lat },
              { label: 'Longitude', value: coordinates.lng },
              { label: 'Selected Area', value: selectedArea },
            ].map(({ label, value }) => (
              <div key={label}>
                <div
                  className="mb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(96,165,250,0.7)' }}
                >
                  {label}
                </div>
                <div className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Note */}
        <div
          className="mb-6 flex items-start gap-3 rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: 'rgba(37,99,235,0.3)',
              color: '#60a5fa',
              border: '1px solid rgba(37,99,235,0.4)',
            }}
          >
            i
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Location will be used for mobile clinic routing and logistics coordination.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:bg-white/10"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!coordinates || submitting}
            className="flex items-center gap-2 rounded-xl px-8 py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
              boxShadow: coordinates ? '0 0 20px rgba(37,99,235,0.4)' : 'none',
              fontSize: '14px',
            }}
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
