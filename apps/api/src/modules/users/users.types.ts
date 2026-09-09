/**
 * KOSHK SKATE ERP — Users & Roles Module Types
 * Phase 02 — Authentication & Permissions
 */

// ---------------------------------------------------------------------------
// User types
// ---------------------------------------------------------------------------

export interface UserDTO {
  id: number
  name: string
  email: string
  isActive: boolean
  roles: Array<{ id: number; name: string; nameAr: string }>
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  roleIds: number[]
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  password?: string
  isActive?: boolean
  roleIds?: number[]
}

// ---------------------------------------------------------------------------
// Role types
// ---------------------------------------------------------------------------

export interface PermissionDTO {
  id: number
  key: string
  labelAr: string
  module: string
}

export interface RoleDTO {
  id: number
  name: string
  nameAr: string
  isSystem: boolean
  permissions: PermissionDTO[]
}

export interface CreateRoleRequest {
  name: string
  nameAr: string
}

export interface UpdateRoleRequest {
  name?: string
  nameAr?: string
}

export interface SetRolePermissionsRequest {
  permissionIds: number[]
}
