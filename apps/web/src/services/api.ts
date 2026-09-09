/**
 * KOSHK SKATE ERP — API Client Base
 * Phase 02 — Authentication & Permissions (updated)
 *
 * Changes from Phase 01:
 *   - Injects Authorization: Bearer <token> header from token getter
 *   - Handles 401: attempts silent token refresh, then retries
 *   - credentials: 'include' on all requests (HttpOnly cookie for refresh — DEC-025)
 *
 * Usage:
 *   import api from '@/services/api'
 *   const data = await api.get<UserDTO[]>('/api/v1/users')
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiError {
  status: number
  message: string
  code?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

// ---------------------------------------------------------------------------
// Token provider — injected at app startup to avoid circular dependency
// ---------------------------------------------------------------------------

let getToken: (() => string | null) | null = null
let doRefresh: (() => Promise<string | null>) | null = null

/**
 * Call this from AuthProvider after login/refresh to wire up the token getter.
 * Avoids circular import between api.ts and AuthContext.tsx.
 */
export function setTokenProvider(
  tokenGetter: () => string | null,
  refresher: () => Promise<string | null>,
): void {
  getToken = tokenGetter
  doRefresh = refresher
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  isRetry = false,
): Promise<T> {
  const url = `${API_BASE}${path}`
  const token = getToken?.() ?? null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',  // sends HttpOnly refresh cookie (DEC-025)
  })

  // 401 — attempt silent refresh and retry once
  if (response.status === 401 && !isRetry && doRefresh) {
    const newToken = await doRefresh()
    if (newToken) {
      return request<T>(method, path, body, true /* isRetry */)
    }
    // Refresh failed — throw 401
  }

  if (!response.ok) {
    let errorData: { message?: string; code?: string; error?: { message?: string; code?: string } } = {}
    try {
      errorData = await response.json()
    } catch {
      // response body is not JSON
    }
    const message = errorData?.error?.message ?? errorData?.message ?? `HTTP ${response.status}`
    const code = errorData?.error?.code ?? errorData?.code
    const error: ApiError = { status: response.status, message, code }
    throw error
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// HTTP method helpers
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

export default api
