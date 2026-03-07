import { getApiBaseUrl } from './env'

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

export async function createOutbreak(payload: {
  disease_type: string
  severity: OutbreakSeverity
  affected_people: number
  children: number
  adults: number
  elderly: number
  outbreak_date: string
  notes?: string
  latitude: number
  longitude: number
  area_name?: string
  reported_by?: string
}): Promise<Outbreak> {
  const resp = await fetch(`${getApiBaseUrl()}/outbreaks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`Failed to create outbreak: ${resp.status}`)
  return (await resp.json()) as Outbreak
}

export type ResourceMedicine = {
  id: string
  medicine_name: string
  stock_count: number
  low_stock_threshold: number
  updated_at: string
}

export type ResourceEquipment = {
  id: string
  equipment_name: string
  available: number
  total: number
  icon: string | null
  updated_at: string
}

export type ResourceStaff = {
  id: string
  role: string
  available: number
  total: number
  updated_at: string
}

export async function listResourceMedicines(signal?: AbortSignal): Promise<ResourceMedicine[]> {
  const resp = await fetch(`${getApiBaseUrl()}/resources/medicines`, { signal })
  if (!resp.ok) throw new Error(`Failed to load medicines: ${resp.status}`)
  return (await resp.json()) as ResourceMedicine[]
}

export async function listResourceEquipment(signal?: AbortSignal): Promise<ResourceEquipment[]> {
  const resp = await fetch(`${getApiBaseUrl()}/resources/equipment`, { signal })
  if (!resp.ok) throw new Error(`Failed to load equipment: ${resp.status}`)
  return (await resp.json()) as ResourceEquipment[]
}

export async function listResourceStaff(signal?: AbortSignal): Promise<ResourceStaff[]> {
  const resp = await fetch(`${getApiBaseUrl()}/resources/staff`, { signal })
  if (!resp.ok) throw new Error(`Failed to load staff: ${resp.status}`)
  return (await resp.json()) as ResourceStaff[]
}

export async function createSupportRequest(payload: {
  resource_type: string
  description: string
  requested_by?: string
}): Promise<{ id: string }>
{
  const resp = await fetch(`${getApiBaseUrl()}/support-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`Failed to create support request: ${resp.status}`)
  return (await resp.json()) as { id: string }
}

export type TreatmentCategoryStat = {
  id: string
  disease_type: string
  total_cases: number
  treated: number
  under_treatment: number
  recovered: number
  critical: number
  snapshot_date: string
  updated_at: string
}

export async function listTreatmentCategoryStats(signal?: AbortSignal): Promise<TreatmentCategoryStat[]> {
  const resp = await fetch(`${getApiBaseUrl()}/treatment/category-stats`, { signal })
  if (!resp.ok) throw new Error(`Failed to load treatment stats: ${resp.status}`)
  return (await resp.json()) as TreatmentCategoryStat[]
}

export type RecoveryTrendPoint = {
  id: string
  snapshot_date: string
  recovered: number
  active: number
  updated_at: string
}

export async function listRecoveryTrend(days = 14, signal?: AbortSignal): Promise<RecoveryTrendPoint[]> {
  const resp = await fetch(`${getApiBaseUrl()}/treatment/recovery-trend?days=${encodeURIComponent(String(days))}`, { signal })
  if (!resp.ok) throw new Error(`Failed to load recovery trend: ${resp.status}`)
  return (await resp.json()) as RecoveryTrendPoint[]
}
