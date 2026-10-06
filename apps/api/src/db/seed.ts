/**
 * KOSHK SKATE ERP — Database Seed Script
 * Phase 05 — Rental POS Core (updated)
 *
 * Seeds:
 *   - Default roles: Administrator, Cashier, Maintenance Staff
 *   - All permission keys (42 keys — see ALL_PERMISSIONS below)
 *   - Administrator role gets ALL permissions
 *   - Default admin user (credentials from env — DEC-026)
 *   - Settings: rental_hourly_rate = 120 EGP/hr (DEC-068)
 *   - Settings: rental_duration_options = [15,30,45,60,90] (DEC-069)
 *
 * IDEMPOTENT: Safe to run multiple times. Checks before inserting.
 *
 * Usage: npm run db:seed
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './connection.js'
import { users, roles, permissions, userRoles, rolePermissions } from './schema/index'
import { settings } from './schema/settings'
import { treasuryAccounts, paymentMethods } from './schema/payments'

const BCRYPT_ROUNDS = 12

// ---------------------------------------------------------------------------
// All permission keys (from SECURITY_ARCHITECTURE.md)
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS: Array<{ key: string; labelAr: string; module: string }> = [
  // Rentals
  { key: 'rentals.view', labelAr: 'عرض الإيجارات', module: 'rentals' },
  { key: 'rentals.create', labelAr: 'إنشاء إيجار', module: 'rentals' },
  { key: 'rentals.return', labelAr: 'تسجيل إعادة الاسكيت', module: 'rentals' },
  // Waivers
  { key: 'waivers.approve', labelAr: 'الموافقة على التنازل عن رسوم التأخير', module: 'rentals' },
  // Damage
  { key: 'damage.view', labelAr: 'عرض تقارير الأضرار', module: 'damage' },
  { key: 'damage.create', labelAr: 'إضافة تقرير ضرر', module: 'damage' },
  { key: 'damage.waive', labelAr: 'التنازل عن رسوم الضرر', module: 'damage' },
  { key: 'damage.collect_charge', labelAr: 'تحصيل رسوم الضرر', module: 'damage' },
  // Maintenance
  { key: 'maintenance.view', labelAr: 'عرض سجلات الصيانة', module: 'maintenance' },
  { key: 'maintenance.create', labelAr: 'إضافة طلب صيانة', module: 'maintenance' },
  { key: 'maintenance.edit', labelAr: 'تعديل سجل الصيانة', module: 'maintenance' },
  { key: 'maintenance.complete', labelAr: 'إغلاق طلب الصيانة', module: 'maintenance' },
  { key: 'maintenance.pay', labelAr: 'دفع تكلفة الصيانة', module: 'maintenance' },
  // Customers
  { key: 'customers.view', labelAr: 'عرض العملاء', module: 'customers' },
  { key: 'customers.create', labelAr: 'إضافة عميل', module: 'customers' },
  { key: 'customers.edit', labelAr: 'تعديل بيانات العميل', module: 'customers' },
  { key: 'customers.deactivate', labelAr: 'تعطيل / تفعيل العميل', module: 'customers' },
  // Skates
  { key: 'skates.view', labelAr: 'عرض الاسكيتات', module: 'skates' },
  { key: 'skates.create', labelAr: 'إضافة اسكيت', module: 'skates' },
  { key: 'skates.edit', labelAr: 'تعديل بيانات الاسكيت', module: 'skates' },
  // Expenses
  { key: 'expenses.view', labelAr: 'عرض المصروفات', module: 'expenses' },
  { key: 'expenses.create', labelAr: 'إضافة مصروف', module: 'expenses' },
  // Payments
  { key: 'payments.view', labelAr: 'عرض المدفوعات', module: 'payments' },
  { key: 'payments.create', labelAr: 'إنشاء دفعة', module: 'payments' },
  // Treasury
  { key: 'treasury.view', labelAr: 'عرض الخزينة', module: 'treasury' },
  { key: 'treasury.manage', labelAr: 'إدارة الخزينة', module: 'treasury' },
  // Reports
  { key: 'reports.view', labelAr: 'عرض التقارير', module: 'reports' },
  // Users
  { key: 'users.view', labelAr: 'عرض المستخدمين', module: 'users' },
  { key: 'users.create', labelAr: 'إضافة مستخدم', module: 'users' },
  { key: 'users.edit', labelAr: 'تعديل مستخدم', module: 'users' },
  { key: 'users.delete', labelAr: 'تعطيل مستخدم', module: 'users' },
  { key: 'users.change_password', labelAr: 'تغيير كلمة مرور المستخدم', module: 'users' },
  // Roles
  { key: 'roles.view', labelAr: 'عرض الأدوار', module: 'roles' },
  { key: 'roles.create', labelAr: 'إنشاء دور', module: 'roles' },
  { key: 'roles.edit', labelAr: 'تعديل دور', module: 'roles' },
  // Shifts
  { key: 'shifts.view', labelAr: 'عرض الشفتات', module: 'shifts' },
  { key: 'shifts.manage', labelAr: 'إدارة الشفتات', module: 'shifts' },
  // Audit
  { key: 'audit.view', labelAr: 'عرض سجل المراجعة', module: 'audit' },
  // Settings
  { key: 'settings.view', labelAr: 'عرض الإعدادات', module: 'settings' },
  { key: 'settings.manage', labelAr: 'إدارة الإعدادات', module: 'settings' },
  // Reservations
  { key: 'reservations.view', labelAr: 'عرض الحجوزات', module: 'reservations' },
  { key: 'reservations.create', labelAr: 'إضافة حجز', module: 'reservations' },
  { key: 'reservations.edit', labelAr: 'تعديل حجز', module: 'reservations' },
  { key: 'reservations.cancel', labelAr: 'إلغاء حجز', module: 'reservations' },
  // Sales
  { key: 'sales.view', labelAr: 'عرض المبيعات', module: 'sales' },
  { key: 'sales.create', labelAr: 'إنشاء فاتورة بيع', module: 'sales' },
  { key: 'sales.cancel', labelAr: 'إلغاء فاتورة بيع', module: 'sales' },
  // Products
  { key: 'products.view', labelAr: 'عرض المنتجات', module: 'products' },
  { key: 'products.manage', labelAr: 'إدارة المنتجات', module: 'products' },
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
      'payments.view', 'payments.create',
      'sales.view', 'sales.create',
      'products.view',
      'expenses.view', 'expenses.create',
      'shifts.view', 'shifts.manage',
      'reservations.view', 'reservations.create', 'reservations.edit', 'reservations.cancel',
      'damage.view', 'damage.create', 'damage.collect_charge',
    ],
  },
  {
    name: 'MaintenanceStaff',
    nameAr: 'موظف الصيانة',
    isSystem: true,
    allPermissions: false,
    permissionKeys: [
      'maintenance.view', 'maintenance.create', 'maintenance.edit', 'maintenance.complete', 'maintenance.pay',
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

    // Assign permissions to role (idempotent: add only missing permissions)
    //
    // Previous logic skipped ALL assignment if any permissions existed.
    // This prevents newly added permissions from being assigned on re-seed.
    // Updated: for each expected permission, add it only if not already assigned.

    let expectedKeys: string[]
    if (roleDef.allPermissions) {
      expectedKeys = ALL_PERMISSIONS.map(p => p.key)
    } else {
      expectedKeys = (roleDef as { permissionKeys: string[] }).permissionKeys
    }

    const existingPerms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, existingRole.id))

    const alreadyAssignedIds = new Set(existingPerms.map(p => p.permissionId))

    const missingPerms = expectedKeys
      .map(k => permByKey.get(k))
      .filter(Boolean)
      .filter(p => !alreadyAssignedIds.has(p!.id)) as typeof allPermsFromDb

    if (missingPerms.length > 0) {
      await db.insert(rolePermissions).values(
        missingPerms.map(p => ({ roleId: existingRole.id, permissionId: p.id }))
      )
      console.log(`     Assigned ${missingPerms.length} new permissions to ${roleDef.name}`)
    } else {
      console.log(`     Permissions up-to-date for ${roleDef.name} (skipped)`)
    }
  }

  // 3. Seed System Actor (for background tasks, lazy updates, crons)
  const systemEmail = 'system@koshkskate.internal'
  console.log(`  → Seeding system actor (${systemEmail})...`)

  const existingSystemActor = await db
    .select()
    .from(users)
    .where(eq(users.email, systemEmail))
    .limit(1)

  if (!existingSystemActor.length) {
    const sysPasswordHash = await bcrypt.hash('NO_LOGIN_ALLOWED', BCRYPT_ROUNDS)
    await db.insert(users).values({
      name: 'System Actor',
      email: systemEmail,
      passwordHash: sysPasswordHash,
      isActive: true,
      isSystemAccount: true,
    })
    console.log(`     Created System Actor (${systemEmail})`)
  } else {
    // Ensure the system actor has isSystemAccount set to true if it already exists
    if (!existingSystemActor[0].isSystemAccount) {
      await db.update(users).set({ isSystemAccount: true }).where(eq(users.id, existingSystemActor[0].id))
      console.log(`     Updated existing System Actor to isSystemAccount=true`)
    } else {
      console.log(`     System Actor exists (${systemEmail}) (skipped)`)
    }
  }

  // 4. Seed admin user (idempotent: skip if email already exists)
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
      isSystemAccount: false,
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

  // 4. Seed Phase 05 settings (DEC-061, DEC-068, DEC-069)
  // IDEMPOTENT: Only inserts if key does not already exist.
  console.log('  → Seeding Phase 05 rental settings...')

  const RENTAL_SETTINGS: Array<{ key: string; value: string; labelAr: string }> = [
    {
      key: 'rental_hourly_rate',
      // DEC-068: Initial configured hourly rate = 120 EGP/hr
      // Read from settings at runtime — NEVER hardcoded in application source.
      value: '120',
      labelAr: 'سعر الإيجار بالساعة',
    },
    {
      key: 'rental_duration_options',
      // DEC-069: Standard durations in minutes — JSON-encoded array
      value: '[15, 30, 45, 60, 90]',
      labelAr: 'خيارات مدة الإيجار بالدقائق',
    },
    {
      key: 'late_fee_per_minute',
      // Phase 07: Late fee per minute
      value: '2',
      labelAr: 'رسوم التأخير لكل دقيقة',
    },
    {
      key: 'print_invoices_enabled',
      // Phase 14: Printing Invoices
      value: 'true',
      labelAr: 'طباعة الفواتير تلقائيا',
    },
    {
      key: 'notification_sound_enabled',
      // Phase 15: Notifications
      value: 'true',
      labelAr: 'صوت التنبيهات',
    },
  ]

  for (const setting of RENTAL_SETTINGS) {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, setting.key))
      .limit(1)

    if (!existing.length) {
      await db.insert(settings).values({
        key: setting.key,
        value: setting.value,
        labelAr: setting.labelAr,
      })
      console.log(`     Setting seeded: ${setting.key} = ${setting.value}`)
    } else {
      console.log(`     Setting exists: ${setting.key} (skipped)`)
    }
  }

  // 5. Seed Phase 06 Treasury Accounts and Payment Methods
  console.log('  → Seeding Phase 06 Treasury Accounts & Payment Methods...')

  const TREASURY_ACCOUNTS = [
    { name: 'Main Cash', nameAr: 'الخزينة الرئيسية' },
    { name: 'Bank', nameAr: 'البنك' },
    { name: 'Card', nameAr: 'بطاقة ائتمان' },
    { name: 'InstaPay', nameAr: 'انستا باي' },
    { name: 'Other', nameAr: 'أخرى' }
  ]

  for (const acc of TREASURY_ACCOUNTS) {
    let existingAcc = (await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.name, acc.name)).limit(1))[0]
    if (!existingAcc) {
      const [result] = await db.insert(treasuryAccounts).values({
        name: acc.name,
        nameAr: acc.nameAr
      })
      console.log(`     Treasury Account seeded: ${acc.name}`)

      // Automatically create a 1:1 mapped Payment Method with the same name
      await db.insert(paymentMethods).values({
        name: acc.name,
        nameAr: acc.nameAr,
        treasuryAccountId: result.insertId
      })
      console.log(`     Payment Method seeded: ${acc.name}`)
    } else {
      console.log(`     Treasury Account exists: ${acc.name} (skipped)`)
    }
  }

  console.log('✅ Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
