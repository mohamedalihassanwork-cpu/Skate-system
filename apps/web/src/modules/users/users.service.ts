/**
 * KOSHK SKATE ERP — Users Service (Frontend)
 * Phase 02 — Authentication & Permissions
 */

import api from '../../services/api'

export interface UserDTO {
  id: number
  name: string
  email: string
  isActive: boolean
  roles: Array<{ id: number; name: string; nameAr: string }>
}

export interface RoleDTO {
  id: number
  name: string
  nameAr: string
  isSystem: boolean
  permissions: Array<{ id: number; key: string; labelAr: string; module: string }>
}

export interface PermissionDTO {
  id: number
  key: string
  labelAr: string
  module: string
}

// Users API
export const usersService = {
  list: () => api.get<{ success: boolean; data: UserDTO[] }>('/api/v1/users').then(r => r.data),
  get: (id: number) => api.get<{ success: boolean; data: UserDTO }>(`/api/v1/users/${id}`).then(r => r.data),
  create: (body: { name: string; email: string; password: string; roleIds: number[] }) =>
    api.post<{ success: boolean; data: UserDTO }>('/api/v1/users', body).then(r => r.data),
  update: (id: number, body: Partial<{ name: string; email: string; password: string; isActive: boolean; roleIds: number[] }>) =>
    api.patch<{ success: boolean; data: UserDTO }>(`/api/v1/users/${id}`, body).then(r => r.data),
  deactivate: (id: number) => api.delete<{ success: boolean }>(`/api/v1/users/${id}`),
}

// Roles API
export const rolesService = {
  list: () => api.get<{ success: boolean; data: RoleDTO[] }>('/api/v1/roles').then(r => r.data),
  create: (body: { name: string; nameAr: string }) =>
    api.post<{ success: boolean; data: RoleDTO }>('/api/v1/roles', body).then(r => r.data),
  setPermissions: (id: number, permissionIds: number[]) =>
    api.put<{ success: boolean; data: RoleDTO }>(`/api/v1/roles/${id}/permissions`, { permissionIds }).then(r => r.data),
  delete: (id: number) => api.delete<{ success: boolean }>(`/api/v1/roles/${id}`),
}
