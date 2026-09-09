/**
 * KOSHK SKATE ERP — Auth Service
 * Phase 02 — Authentication & Permissions
 *
 * Responsibilities:
 *   - login: verify credentials, issue access token + refresh token (HttpOnly cookie)
 *   - refresh: validate refresh token, rotate (delete old, issue new)
 *   - logout: delete refresh token from DB
 *   - me: load authenticated user with roles + permissions
 *   - loadUserWithPermissions: shared helper
 *
 * Security decisions:
 *   - DEC-024: JWT + Refresh Token
 *   - DEC-025: Refresh token stored as HttpOnly cookie + in DB
 *   - DEC-026: Seed admin credentials via env
 *   - DEC-027: In-memory rate limiter (enforced at route level)
 *   - DEC-028: Separate JWT_SECRET / JWT_REFRESH_SECRET
 *   - SECURITY_ARCHITECTURE: bcrypt min 12 rounds; refresh token hash stored in DB
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { users, roles, permissions, userRoles, rolePermissions, refreshTokens } from '../../db/schema/index.js'
import env from '../../config/env.js'
import { UnauthorizedError, NotFoundError } from '../../utils/errors.js'
import type { AuthUser, TokenPayload, LoginRequest } from './auth.types.js'

// ---------------------------------------------------------------------------
// Token generation helpers
// ---------------------------------------------------------------------------

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

function signRefreshToken(payload: TokenPayload): string {
  // Include a random jti so the same user logging in twice within the same second
  // produces two different tokens (and therefore two different hashes in refresh_tokens)
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d` },
  )
}

/** Hash a refresh token before storing in DB (DEC-025) */
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

// ---------------------------------------------------------------------------
// Load user with roles + permissions (shared helper)
// ---------------------------------------------------------------------------

export async function loadUserWithPermissions(userId: number): Promise<AuthUser> {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!userRows.length) {
    throw new NotFoundError('المستخدم غير موجود')
  }

  const user = userRows[0]

  // Load roles for this user
  const userRoleRows = await db
    .select({ roleId: userRoles.roleId, roleName: roles.name, roleNameAr: roles.nameAr })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  const userRoleIds = userRoleRows.map(r => r.roleId)

  // Load permissions for all user roles
  let permissionKeys: string[] = []
  if (userRoleIds.length > 0) {
    const permRows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        userRoleIds.length === 1
          ? eq(rolePermissions.roleId, userRoleIds[0])
          : // For multiple roles, load all then deduplicate
            eq(rolePermissions.roleId, userRoleIds[0]) // will be replaced below
      )

    // For multiple roles: load all permissions and deduplicate
    if (userRoleIds.length > 1) {
      const allPermRows = await Promise.all(
        userRoleIds.map(roleId =>
          db
            .select({ key: permissions.key })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, roleId))
        )
      )
      permissionKeys = [...new Set(allPermRows.flat().map(p => p.key))]
    } else {
      permissionKeys = permRows.map(p => p.key)
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    roles: userRoleRows.map(r => ({ id: r.roleId, name: r.roleName, nameAr: r.roleNameAr })),
    permissions: permissionKeys,
  }
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

export async function login(body: LoginRequest): Promise<{
  accessToken: string
  rawRefreshToken: string
  user: AuthUser
}> {
  const { email, password } = body

  if (!email || !password) {
    throw new UnauthorizedError('البريد الإلكتروني وكلمة المرور مطلوبان')
  }

  // Find user by email
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1)

  if (!userRows.length) {
    throw new UnauthorizedError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  const user = userRows[0]

  if (!user.isActive) {
    throw new UnauthorizedError('الحساب معطّل. تواصل مع المدير')
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)
  if (!passwordValid) {
    throw new UnauthorizedError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  // Generate tokens
  const tokenPayload: TokenPayload = { sub: user.id, email: user.email }
  const accessToken = signAccessToken(tokenPayload)
  const rawRefreshToken = signRefreshToken(tokenPayload)
  const tokenHash = hashToken(rawRefreshToken)

  // Store refresh token hash in DB
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRES_DAYS)

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  })

  const authUser = await loadUserWithPermissions(user.id)

  return { accessToken, rawRefreshToken, user: authUser }
}

// ---------------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------------

export async function refresh(rawRefreshToken: string): Promise<{
  accessToken: string
  rawRefreshToken: string
}> {
  // Verify JWT signature first
  let payload: TokenPayload
  try {
    payload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as unknown as TokenPayload
  } catch {
    throw new UnauthorizedError('رمز التحديث غير صالح أو منتهي الصلاحية')
  }

  const tokenHash = hashToken(rawRefreshToken)
  const now = new Date()

  // Check DB: token must exist and not be expired
  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .limit(1)

  if (!tokenRows.length) {
    throw new UnauthorizedError('رمز التحديث غير صالح أو منتهي الصلاحية')
  }

  const storedToken = tokenRows[0]

  // Rotation: delete old token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id))

  // Verify user still active
  const userRows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, payload.sub), eq(users.isActive, true)))
    .limit(1)

  if (!userRows.length) {
    throw new UnauthorizedError('الحساب معطّل أو غير موجود')
  }

  const user = userRows[0]

  // Issue new token pair
  const newPayload: TokenPayload = { sub: user.id, email: user.email }
  const newAccessToken = signAccessToken(newPayload)
  const newRawRefreshToken = signRefreshToken(newPayload)
  const newTokenHash = hashToken(newRawRefreshToken)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRES_DAYS)

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt,
  })

  return { accessToken: newAccessToken, rawRefreshToken: newRawRefreshToken }
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return

  const tokenHash = hashToken(rawRefreshToken)
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
}

// ---------------------------------------------------------------------------
// verifyAccessToken (used by auth middleware)
// ---------------------------------------------------------------------------

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload
  } catch {
    throw new UnauthorizedError('رمز الوصول غير صالح أو منتهي الصلاحية')
  }
}
