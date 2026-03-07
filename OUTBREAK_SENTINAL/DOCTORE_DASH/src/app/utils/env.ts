export function getApiBaseUrl(): string {
  const raw = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
  return (raw && raw.trim()) ? raw.trim().replace(/\/$/, '') : 'http://localhost:8000'
}

export function getWebSocketBaseUrl(): string {
  const api = getApiBaseUrl()
  if (api.startsWith('https://')) return api.replace(/^https:\/\//, 'wss://')
  if (api.startsWith('http://')) return api.replace(/^http:\/\//, 'ws://')
  return api
}

export function getMapboxPublicToken(): string {
  const token = (import.meta as any).env?.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined
  if (!token || !token.trim()) {
    throw new Error('Missing VITE_MAPBOX_PUBLIC_TOKEN')
  }
  return token.trim()
}

