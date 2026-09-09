/**
 * KOSHK SKATE ERP — Users, Roles & Permissions Schema
 * Phase 02 — Authentication & Permissions
 *
 * Tables:
 *   users            — system user accounts (staff)
 *   roles            — configurable roles (Administrator, Cashier, etc.)
 *   permissions      — atomic permission keys (rentals.create, waivers.approve, etc.)
 *   user_roles       — many-to-many: users ↔ roles
 *   role_permissions — many-to-many: roles ↔ permissions
 *
 * Design decisions:
 *   - DEC-016: roles are data-driven, configurable by Administrator
 *   - DEC-024: JWT + Refresh Token auth
 *   - SECURITY_ARCHITECTURE: bcrypt passwords, server-side permission enforcement
 *   - No hard delete: is_active soft-disable for users
 *   - System roles (is_system=true) cannot be deleted
 */

import {
  mysqlTable,
  int,
  varchar,
  boolean,
  datetime,
  primaryKey,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
})

// ---------------------------------------------------------------------------
// roles
// ---------------------------------------------------------------------------
export const roles = mysqlTable('roles', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  nameAr: varchar('name_ar', { length: 100 }).notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ---------------------------------------------------------------------------
// permissions
// ---------------------------------------------------------------------------
export const permissions = mysqlTable('permissions', {
  id: int('id').primaryKey().autoincrement(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  labelAr: varchar('label_ar', { length: 255 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
})

// ---------------------------------------------------------------------------
// user_roles (junction)
// ---------------------------------------------------------------------------
export const userRoles = mysqlTable('user_roles', {
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: int('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}))

// ---------------------------------------------------------------------------
// role_permissions (junction)
// ---------------------------------------------------------------------------
export const rolePermissions = mysqlTable('role_permissions', {
  roleId: int('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: int('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}))
