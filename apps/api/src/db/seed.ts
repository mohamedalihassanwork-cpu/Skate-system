/**
 * KOSHK SKATE ERP — Database Seed Script
 * Phase 02 — Authentication & Permissions
 *
 * Seeds:
 *   - Default roles: Administrator, Cashier, Maintenance Staff
 *   - All permission keys (39 keys from SECURITY_ARCHITECTURE.md)
 *   - Administrator role gets ALL permissions
 *   - Default admin user (credentials from env — DEC-026)
 *
 * IDEMPOTENT: Safe to run multiple times. Checks before inserting.
 *
 * Usage: npm run db:seed
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './connection.js'
import { users, roles, permissions, userRoles, rolePermissions } from './schema/index.js'

const BCRYPT_ROUNDS = 12

// ---------------------------------------------------------------------------
// All permission keys (from SECURITY_ARCHITECTURE.md)
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS: Array<{ key: string; labelAr: string; module: string }> = [
  // Rentals
  { key: 'rentals.view',     labelAr: 'عرض الإيجارات',           module: 'rentals' },
  { key: 'rentals.create',   labelAr: 'إنشاء إيجار',             module: 'rentals' },
  { key: 'rentals.return',   labelAr: 'تسجيل إعادة الزلاجة',    module: 'rentals' },
  // Waivers
  { key: 'waivers.approve',  labelAr: 'الموافقة على التنازل عن رسوم التأخير', module: 'rentals' },
  // Damage
  { key: 'damage.view',      labelAr: 'عرض تقارير الأضرار',       module: 'damage' },
  { key: 'damage.create',    labelAr: 'إضافة تقرير ضرر',          module: 'damage' },
  { key: 'damage.waive',     labelAr: 'التنازل عن رسوم الضرر',   module: 'damage' },
  // Maintenance
  { key: 'maintenance.view',     labelAr: 'عرض سجلات الصيانة',    module: 'maintenance' },
  { key: 'maintenance.create',   labelAr: 'إضافة طلب صيانة',      module: 'maintenance' },
  { key: 'maintenance.edit',     labelAr: 'تعديل سجل الصيانة',    module: 'maintenance' },
  { key: 'maintenance.complete', labelAr: 'إغلاق طلب الصيانة',    module: 'maintenance' },
  // Customers
  { key: 'customers.view',   labelAr: 'عرض العملاء',              module: 'customers' },
  { key: 'customers.create', labelAr: 'إضافة عميل',               module: 'customers' },
  { key: 'customers.edit',   labelAr: 'تعديل بيانات العميل',      module: 'customers' },
  // Skates
  { key: 'skates.view',      labelAr: 'عرض الزلاجات',             module: 'skates' },
  { key: 'skates.create',    labelAr: 'إضافة زلاجة',              module: 'skates' },
  { key: 'skates.edit',      labelAr: 'تعديل بيانات الزلاجة',     module: 'skates' },
  // Expenses
  { key: 'expenses.view',    labelAr: 'عرض المصروفات',            module: 'expenses' },
  { key: 'expenses.create',  labelAr: 'إضافة مصروف',              module: 'expenses' },
  // Treasury
  { key: 'treasury.view',    labelAr: 'عرض الخزينة',              module: 'treasury' },
  { key: 'treasury.manage',  labelAr: 'إدارة الخزينة',            module: 'treasury' },
  // Reports
  { key: 'reports.view',     labelAr: 'عرض التقارير',             module: 'reports' },
  // Users
  { key: 'users.view',       labelAr: 'عرض المستخدمين',           module: 'users' },
  { key: 'users.create',     labelAr: 'إضافة مستخدم',             module: 'users' },
  { key: 'users.edit',       labelAr: 'تعديل مستخدم',             module: 'users' },
  { key: 'users.delete',     labelAr: 'تعطيل مستخدم',             module: 'users' },
  // Roles
  { key: 'roles.view',       labelAr: 'عرض الأدوار',              module: 'roles' },
  { key: 'roles.create',     labelAr: 'إنشاء دور',                module: 'roles' },
  { key: 'roles.edit',       labelAr: 'تعديل دور',                module: 'roles' },
  // Shifts
  { key: 'shifts.view',      labelAr: 'عرض الشفتات',              module: 'shifts' },
  { key: 'shifts.manage',    labelAr: 'إدارة الشفتات',            module: 'shifts' },
  // Audit
  { key: 'audit.view',       labelAr: 'عرض سجل المراجعة',        module: 'audit' },
  // Settings
  { key: 'settings.view',    labelAr: 'عرض الإعدادات',            module: 'settings' },
  { key: 'settings.manage',  labelAr: 'إدارة الإعدادات',          module: 'settings' },
  // Reservations
  { key: 'reservations.view',   labelAr: 'عرض الحجوزات',          module: 'reservations' },
  { key: 'reservations.create', labelAr: 'إضافة حجز',             module: 'reservations' },
  { key: 'reservations.edit',   labelAr: 'تعديل حجز',             module: 'reservations' },
  { key: 'reservations.cancel', labelAr: 'إلغاء حجز',             module: 'reservations' },
  // Sales
  { key: 'sales.view',       labelAr: 'عرض المبيعات',             module: 'sales' },
  { key: 'sales.create',     labelAr: 'إنشاء فاتورة بيع',         module: 'sales' },
]

// ---------------------------------------------------------------------------
// Default roles
// ---------------------------------------------------------------------------

const DEFAULT_ROLES = [
  {
    name: 'Administrator',
    nameAr: 'مدير النظام',
    isSystem: true,
    allPermissions: true,  // gets every permission
  },
  {
    name: 'Cashier',
    nameAr: 'كاشير',
    isSystem: true,
    allPermissions: false,
    permissionKeys: [
      'rentals.view', 'rentals.create', 'rentals.return',
      'customers.view', 'customers.create', 'customers.edit',
      'skates.view',
      'payments.view',
      'sales.view', 'sales.create',
      'expenses.view', 'expenses.create',
      'shifts.view', 'shifts.manage',
      'reservations.view', 'reservations.create', 'reservations.edit', 'reservations.cancel',
      'damage.view', 'damage.create',
    ],
  },
  {
    name: 'MaintenanceStaff',
    nameAr: 'موظف الصيانة',
    isSystem: true,
    allPermissions: false,
    permissionKeys: [
      'maintenance.view', 'maintenance.create', 'maintenance.edit', 'maintenance.complete',
      'damage.view', 'damage.create',
      'skates.view',
    ],
  },
]

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱 Starting database seed...')

  // 1. Seed permissions (idempotent: skip existing by key)
  console.log('  → Seeding permissions...')
  for (const perm of ALL_PERMISSIONS) {
    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, perm.key))
      .limit(1)

    if (!existing.length) {
      await db.insert(permissions).values(perm)
    }
  }
  console.log(`     ${ALL_PERMISSIONS.length} permissions seeded (skipped existing)`)

  // Load all permissions from DB for ID lookup
  const allPermsFromDb = await db.select().from(permissions)
  const permByKey = new Map(allPermsFromDb.map(p => [p.key, p]))

  // 2. Seed roles (idempotent: skip existing by name)
  console.log('  → Seeding roles...')
  for (const roleDef of DEFAULT_ROLES) {
    let existingRole = (
      await db.select().from(roles).where(eq(roles.name, roleDef.name)).limit(1)
    )[0]

    if (!existingRole) {
      const [result] = await db.insert(roles).values({
        name: roleDef.name,
        nameAr: roleDef.nameAr,
        isSystem: roleDef.isSystem,
      })
      existingRole = (await db.select().from(roles).where(eq(roles.id, result.insertId)).limit(1))[0]
      console.log(`     Created role: ${roleDef.name}`)
    } else {
      console.log(`     Role exists: ${roleDef.name} (skipped)`)
    }

    // Assign permissions to role (only if none assigned yet)
    const existingPerms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, existingRole.id))

    if (!existingPerms.length) {
      let keys: string[]
      if (roleDef.allPermissions) {
        keys = ALL_PERMISSIONS.map(p => p.key)
      } else {
        keys = (roleDef as { permissionKeys: string[] }).permissionKeys
      }

      const validPerms = keys
        .map(k => permByKey.get(k))
        .filter(Boolean) as typeof allPermsFromDb

      if (validPerms.length > 0) {
        await db.insert(rolePermissions).values(
          validPerms.map(p => ({ roleId: existingRole.id, permissionId: p.id }))
        )
        console.log(`     Assigned ${validPerms.length} permissions to ${roleDef.name}`)
      }
    } else {
      console.log(`     Permissions already set for ${roleDef.name} (skipped)`)
    }
  }

  // 3. Seed admin user (idempotent: skip if email already exists)
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@koshkskate.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

  console.log(`  → Seeding admin user (${adminEmail})...`)

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1)

  if (!existingAdmin.length) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS)

    const [result] = await db.insert(users).values({
      name: 'مدير النظام',
      email: adminEmail,
      passwordHash,
      isActive: true,
    })

    const adminUserId = result.insertId

    // Get Administrator role
    const adminRole = (
      await db.select().from(roles).where(eq(roles.name, 'Administrator')).limit(1)
    )[0]

    if (adminRole) {
      await db.insert(userRoles).values({ userId: adminUserId, roleId: adminRole.id })
      console.log(`     Admin user created and assigned Administrator role`)
    }
  } else {
    console.log(`     Admin user already exists (skipped)`)
  }

  console.log('✅ Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
