import { useAuthStore } from '../store/authStore'

export const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/v1`

export class ApiError extends Error {
  readonly status: number
  readonly data: Record<string, unknown>

  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function tryRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) { logout(); return null }
    const data = await res.json()
    setTokens(data.accessToken, data.refreshToken)
    return data.accessToken as string
  } catch {
    logout()
    return null
  }
}

export async function apiFetch<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const makeReq = (token: string | null) => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  let res = await makeReq(useAuthStore.getState().token)

  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) res = await makeReq(newToken)
  }

  if (!res.ok) {
    let message = res.statusText
    let responseData: Record<string, unknown> = {}
    try {
      responseData = await res.json()
      message = (responseData.error as string) ?? (responseData.message as string) ?? message
    } catch {}
    throw new ApiError(res.status, message, responseData)
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}
