/**
 * KOSHK SKATE ERP — Auth Module Types (Frontend)
 * Phase 02 — Authentication & Permissions
 */

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthRole {
  id: number
  name: string
  nameAr: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  isActive: boolean
  roles: AuthRole[]
  permissions: string[]
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface RefreshResponse {
  accessToken: string
}

export interface MeResponse {
  user: AuthUser
}
