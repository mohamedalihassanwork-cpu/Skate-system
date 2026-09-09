/**
 * KOSHK SKATE ERP — Auth Service (Frontend)
 * Phase 02 — Authentication & Permissions
 *
 * Handles: login, logout, refresh API calls
 * DEC-025: Refresh token is in HttpOnly cookie — never accessed by this code
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  isActive: boolean
  roles: Array<{ id: number; name: string; nameAr: string }>
  permissions: string[]
}

export interface LoginApiResponse {
  success: boolean
  data: {
    accessToken: string
    user: AuthUser
  }
}

export interface RefreshApiResponse {
  success: boolean
  data: { accessToken: string }
}

export interface MeApiResponse {
  success: boolean
  data: { user: AuthUser }
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

export async function loginApi(credentials: LoginRequest): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // required for HttpOnly cookie (DEC-025)
    body: JSON.stringify(credentials),
  })

  const body = await res.json()

  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'فشل تسجيل الدخول')
  }

  return (body as LoginApiResponse).data
}

// ---------------------------------------------------------------------------
// refresh — silent token renewal
// ---------------------------------------------------------------------------

export async function refreshApi(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',   // sends the HttpOnly refresh cookie automatically
  })

  if (!res.ok) {
    throw new Error('انتهت الجلسة — يرجى تسجيل الدخول مجدداً')
  }

  const body: RefreshApiResponse = await res.json()
  return body.data.accessToken
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

export async function logoutApi(accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

// ---------------------------------------------------------------------------
// me — fetch current user
// ---------------------------------------------------------------------------

export async function meApi(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('تعذر تحميل بيانات المستخدم')
  }

  const body: MeApiResponse = await res.json()
  return body.data.user
}
