import { getApiBaseUrl } from './env'

export type VehicleStatus = 'idle' | 'assigned' | 'on_route' | 'treating' | 'completed'

export type MedicalVehicle = {
  id: string
  vehicle_name: string
  driver_name: string
  contact_number: string
  current_latitude: number | null
  current_longitude: number | null
  fuel_level_percentage: number | null
  vehicle_status: VehicleStatus
  created_at: string
  updated_at: string
}

export type NavigationRoute = {
  id: string
  vehicle_id: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  route_geometry: GeoJSON.LineString
  distance_km: number
  duration_minutes: number
  alternative_routes_json: any | null
  selected_route_index: number
  traffic_level: string | null
  eta_timestamp: string | null
  route_status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

export async function listMedicalVehicles(signal?: AbortSignal): Promise<MedicalVehicle[]> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicles/`, { signal })
  if (!resp.ok) throw new Error(`Failed to list vehicles: ${resp.status}`)
  return (await resp.json()) as MedicalVehicle[]
}

export async function getActiveRoute(vehicleId: string, signal?: AbortSignal): Promise<NavigationRoute | null> {
  const resp = await fetch(`${getApiBaseUrl()}/navigation/active-route/${vehicleId}`, { signal })
  if (resp.status === 404) return null
  if (!resp.ok) throw new Error(`Failed to fetch active route: ${resp.status}`)
  const data = (await resp.json()) as { active_route: NavigationRoute }
  return data.active_route
}

export type WsVehicleEvent =
  | { type: 'ws.connected'; vehicle_id: string }
  | { type: 'vehicle.location_updated'; vehicle_id: string; latitude: number; longitude: number; speed?: number | null }
  | { type: 'vehicle.status_updated'; vehicle_id: string; vehicle_status: VehicleStatus }
  | { type: 'navigation.route_generated' | 'navigation.route_updated' | 'navigation.route_unchanged'; vehicle_id: string; route_geometry?: any; distance_km?: number; duration_minutes?: number; eta_timestamp?: string | null; alternative_routes?: any }
  | { type: string; [k: string]: any }

