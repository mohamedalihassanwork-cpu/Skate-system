/**
 * KOSHK SKATE ERP — API Client Base
 * Phase 01 — Foundation stub
 *
 * This module provides a typed fetch wrapper for all API calls.
 * Authentication headers will be added in Phase 02 (JWT).
 * Feature-specific service files will import and use these utilities.
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
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Phase 02 will inject: Authorization: `Bearer ${getToken()}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let errorData: { message?: string; code?: string } = {}
    try {
      errorData = await response.json()
    } catch {
      // response body is not JSON
    }
    const error: ApiError = {
      status: response.status,
      message: errorData.message ?? `HTTP ${response.status}`,
      code: errorData.code,
    }
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
