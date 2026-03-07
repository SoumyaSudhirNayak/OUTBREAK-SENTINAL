/**
 * API helpers for the FastAPI (OUTBREAK_SENTINAL) backend.
 * Base URL is configured via VITE_API_BASE_URL (.env).
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(method, path, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}

// ── Outbreaks ────────────────────────────────────────────────────────────────

/** Fetch all outbreaks from the backend (returns array) */
export const fetchOutbreaks = () => request('GET', '/outbreaks');

/** Create a new outbreak report (and auto-assign idle vehicle) */
export const createOutbreak = (payload) => request('POST', '/outbreaks', payload);

// ── Vehicle allocation ───────────────────────────────────────────────────────

/**
 * Allocate the nearest idle vehicle to an outbreak.
 * The backend POST /outbreaks already handles auto-allocation,
 * so this is a convenience wrapper for the admin "Allocate" button
 * that creates an outbreak-based assignment directly.
 */
export const allocateVehicle = async (outbreakId) => {
    return request('POST', '/vehicle/assignments', {
        outbreak_id: outbreakId,
    });
};

// ── Vehicles ─────────────────────────────────────────────────────────────────

export const fetchVehicles = () => request('GET', '/vehicles/');
export const fetchVehicle = (id) => request('GET', `/vehicles/${id}`);
export const updateVehicleLoc = (vehicleId, lat, lng, speed = null) =>
    request('PATCH', '/vehicles/update-location', { vehicle_id: vehicleId, latitude: lat, longitude: lng, speed });
