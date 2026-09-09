/**
 * KOSHK SKATE ERP — Roles Service
 * Phase 02 — Authentication & Permissions
 *
 * Handles role and permission management.
 * DEC-016: Roles are configurable by Administrator. System roles cannot be deleted.
 */

import { eq } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { roles, permissions, rolePermissions } from '../../db/schema/index.js'
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../utils/errors.js'
import type { CreateRoleRequest, UpdateRoleRequest, RoleDTO, PermissionDTO } from './users.types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getRoleWithPermissions(roleId: number): Promise<RoleDTO> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  const role = roleRows[0]

  const permRows = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      labelAr: permissions.labelAr,
      module: permissions.module,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))

  return {
    id: role.id,
    name: role.name,
    nameAr: role.nameAr,
    isSystem: role.isSystem,
    permissions: permRows,
  }
}

// ---------------------------------------------------------------------------
// listRoles
// ---------------------------------------------------------------------------

export async function listRoles(): Promise<RoleDTO[]> {
  const roleRows = await db.select().from(roles)
  return Promise.all(roleRows.map(r => getRoleWithPermissions(r.id)))
}

// ---------------------------------------------------------------------------
// getRole
// ---------------------------------------------------------------------------

export async function getRole(id: number): Promise<RoleDTO> {
  return getRoleWithPermissions(id)
}

// ---------------------------------------------------------------------------
// createRole
// ---------------------------------------------------------------------------

export async function createRole(body: CreateRoleRequest): Promise<RoleDTO> {
  const { name, nameAr } = body

  if (!name?.trim()) throw new ValidationError('اسم الدور مطلوب')
  if (!nameAr?.trim()) throw new ValidationError('الاسم العربي للدور مطلوب')

  const existing = await db.select().from(roles).where(eq(roles.name, name.trim())).limit(1)
  if (existing.length) throw new ConflictError('اسم الدور مستخدم بالفعل')

  const [result] = await db.insert(roles).values({
    name: name.trim(),
    nameAr: nameAr.trim(),
    isSystem: false,
  })

  return getRoleWithPermissions(result.insertId)
}

// ---------------------------------------------------------------------------
// updateRole
// ---------------------------------------------------------------------------

export async function updateRole(id: number, body: UpdateRoleRequest): Promise<RoleDTO> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  const updates: Partial<typeof roles.$inferInsert> = {}

  if (body.name !== undefined) {
    if (!body.name.trim()) throw new ValidationError('اسم الدور لا يمكن أن يكون فارغاً')
    updates.name = body.name.trim()
  }
  if (body.nameAr !== undefined) {
    if (!body.nameAr.trim()) throw new ValidationError('الاسم العربي لا يمكن أن يكون فارغاً')
    updates.nameAr = body.nameAr.trim()
  }

  if (Object.keys(updates).length > 0) {
    await db.update(roles).set(updates).where(eq(roles.id, id))
  }

  return getRoleWithPermissions(id)
}

// ---------------------------------------------------------------------------
// deleteRole — system roles cannot be deleted (DEC-016)
// ---------------------------------------------------------------------------

export async function deleteRole(id: number): Promise<void> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  if (roleRows[0].isSystem) {
    throw new ForbiddenError('لا يمكن حذف الأدوار الأساسية للنظام')
  }

  await db.delete(roles).where(eq(roles.id, id))
}

// ---------------------------------------------------------------------------
// setRolePermissions — replace all permissions for a role (PUT semantics)
// ---------------------------------------------------------------------------

export async function setRolePermissions(roleId: number, permissionIds: number[]): Promise<RoleDTO> {
  const roleRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
  if (!roleRows.length) throw new NotFoundError('الدور غير موجود')

  // Delete existing permissions for this role
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))

  // Insert new set
  if (permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map(permId => ({ roleId, permissionId: permId }))
    )
  }

  return getRoleWithPermissions(roleId)
}

// ---------------------------------------------------------------------------
// listPermissions — all available permission keys
// ---------------------------------------------------------------------------

export async function listPermissions(): Promise<PermissionDTO[]> {
  return db.select().from(permissions)
}
