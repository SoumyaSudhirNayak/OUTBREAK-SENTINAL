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

export async function registerVehicle(payload: { vehicle_name: string; driver_name: string; contact_number: string }): Promise<MedicalVehicle> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicles/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`Failed to register vehicle: ${resp.status}`)
  return (await resp.json()) as MedicalVehicle
}

export async function listVehicles(): Promise<MedicalVehicle[]> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicles/`)
  if (!resp.ok) throw new Error(`Failed to list vehicles: ${resp.status}`)
  return (await resp.json()) as MedicalVehicle[]
}

export function isUuid(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export async function resolveVehicleId(candidate?: string): Promise<string> {
  const c = (candidate ?? '').trim()
  if (isUuid(c)) return c
  const stored = (window?.localStorage?.getItem('mobilevan.vehicleId') ?? '').trim()
  if (isUuid(stored)) return stored

  try {
    const vehicles = await listVehicles()
    const first = vehicles?.[0]?.id
    if (first && isUuid(first)) {
      window.localStorage.setItem('mobilevan.vehicleId', first)
      return first
    }
  } catch {
    return ''
  }

  return ''
}

export async function getVehicle(vehicleId: string): Promise<MedicalVehicle> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicles/${vehicleId}`)
  if (!resp.ok) throw new Error(`Failed to fetch vehicle: ${resp.status}`)
  return (await resp.json()) as MedicalVehicle
}

export async function updateVehicleLocation(vehicleId: string, latitude: number, longitude: number, speed?: number): Promise<MedicalVehicle> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicles/update-location`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ vehicle_id: vehicleId, latitude, longitude, speed }),
  })
  if (!resp.ok) throw new Error(`Failed to update location: ${resp.status}`)
  return (await resp.json()) as MedicalVehicle
}

export async function getActiveRoute(vehicleId: string): Promise<NavigationRoute | null> {
  const resp = await fetch(`${getApiBaseUrl()}/navigation/active-route/${vehicleId}`)
  if (resp.status === 404) return null
  if (!resp.ok) throw new Error(`Failed to fetch active route: ${resp.status}`)
  const data = (await resp.json()) as { active_route: NavigationRoute }
  return data.active_route
}

export async function generateRoute(vehicleId: string, destination: { lat: number; lng: number }, origin?: { lat: number; lng: number }): Promise<NavigationRoute> {
  const resp = await fetch(`${getApiBaseUrl()}/navigation/generate-route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ vehicle_id: vehicleId, destination, origin, alternatives: true }),
  })
  if (!resp.ok) throw new Error(`Failed to generate route: ${resp.status}`)
  const data = (await resp.json()) as { active_route: NavigationRoute }
  return data.active_route
}

export type OutbreakSeverity = 'mild' | 'moderate' | 'severe'

export type Outbreak = {
  id: string
  disease_type: string
  severity: OutbreakSeverity
  affected_people: number
  children: number
  adults: number
  elderly: number
  outbreak_date: string
  notes: string | null
  latitude: number
  longitude: number
  area_name: string | null
  reported_by: string | null
  created_at: string
  updated_at: string
}

export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export type VehicleAssignmentDetailed = {
  id: string
  vehicle_id: string
  outbreak_id: string
  assigned_by: string
  assignment_status: AssignmentStatus
  assigned_at: string
  accepted_at: string | null
  outbreak: Outbreak | null
}

export async function listAssignmentsDetailed(vehicleId: string): Promise<VehicleAssignmentDetailed[]> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicle/assignments/${vehicleId}/detailed`)
  if (!resp.ok) throw new Error(`Failed to load assignments: ${resp.status}`)
  return (await resp.json()) as VehicleAssignmentDetailed[]
}

export async function acceptAssignment(assignmentId: string): Promise<void> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicle/assignment/accept`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ assignment_id: assignmentId }),
  })
  if (!resp.ok) throw new Error(`Failed to accept assignment: ${resp.status}`)
}

export async function getOutbreak(outbreakId: string): Promise<Outbreak> {
  const resp = await fetch(`${getApiBaseUrl()}/outbreaks/${outbreakId}`)
  if (!resp.ok) throw new Error(`Failed to fetch outbreak: ${resp.status}`)
  return (await resp.json()) as Outbreak
}

export type VehicleStockUsage = {
  id: string
  vehicle_id: string
  outbreak_id?: string | null
  medicine_name: string
  quantity_used: number
  equipment_used: any | null
  patients_treated: number
  updated_at: string
}

export async function listVehicleStock(vehicleId: string): Promise<VehicleStockUsage[]> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicle/stock/${vehicleId}`)
  if (!resp.ok) throw new Error(`Failed to load stock usage: ${resp.status}`)
  return (await resp.json()) as VehicleStockUsage[]
}

export async function createStockUsage(payload: {
  vehicle_id: string
  outbreak_id?: string | null
  medicine_name: string
  quantity_used: number
  equipment_used?: any
  patients_treated: number
}): Promise<VehicleStockUsage> {
  const resp = await fetch(`${getApiBaseUrl()}/vehicle/stock/update`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`Failed to update stock: ${resp.status}`)
  return (await resp.json()) as VehicleStockUsage
}

export type WsVehicleEvent =
  | { type: 'ws.connected'; vehicle_id: string }
  | { type: 'vehicle.location_updated'; vehicle_id: string; latitude: number; longitude: number; speed?: number | null }
  | { type: 'vehicle.status_updated'; vehicle_id: string; vehicle_status: VehicleStatus }
  | { type: 'navigation.route_generated' | 'navigation.route_updated' | 'navigation.route_unchanged'; vehicle_id: string }
  | { type: string; [k: string]: any }
