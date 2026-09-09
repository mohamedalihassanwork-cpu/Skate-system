/**
 * KOSHK SKATE ERP — Auth Module Types
 * Phase 02 — Authentication & Permissions
 */

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenPayload {
  sub: number       // user ID
  email: string
  iat?: number
  exp?: number
}

export interface AuthUser {
  id: number
  name: string
  email: string
  isActive: boolean
  roles: Array<{ id: number; name: string; nameAr: string }>
  permissions: string[]  // flat list of permission keys
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
  // refreshToken is NOT returned in body — it is sent as HttpOnly cookie (DEC-025)
}

export interface RefreshResponse {
  accessToken: string
}

export interface MeResponse {
  user: AuthUser
}
