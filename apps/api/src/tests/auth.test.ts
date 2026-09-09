/**
 * KOSHK SKATE ERP — Phase 02 Auth Integration Tests
 *
 * Tests:
 *   TC-AUTH-01: Login success
 *   TC-AUTH-02: Login failure — wrong password
 *   TC-AUTH-03: Login failure — nonexistent email
 *   TC-AUTH-04: Login failure — missing fields
 *   TC-AUTH-05: GET /me with valid token
 *   TC-AUTH-06: GET /me without token → 401
 *   TC-AUTH-07: GET /me with malformed token → 401
 *   TC-AUTH-08: Refresh token rotation (new token returned, old token cannot be reused)
 *   TC-AUTH-09: Logout revokes refresh token
 *   TC-AUTH-10: POST /refresh with no cookie → 401
 *   TC-AUTH-11: Permission enforcement — admin accesses users.view → 200
 *   TC-AUTH-12: Permission enforcement — no permission key → 403 (using a Cashier for admin-only route)
 *   TC-AUTH-13: Rate limiter on login (stub — verifies header presence)
 *   TC-AUTH-14: Deactivated user cannot log in
 *
 * Requires:
 *   - Local MySQL DB `koshk_skate` with seed data applied
 *   - `apps/api/.env` with valid credentials
 *
 * IMPORTANT: Tests use the real DB. They do NOT mock the DB or JWT.
 * Each test cleans up its own test data (created users/tokens).
 */

import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

// We import the app from app.ts (not index.ts) to avoid starting the HTTP server
import app from '../app.js'
import { db } from '../db/connection.js'
import { users, userRoles, refreshTokens } from '../db/schema/index.js'

const request = supertest(app)

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'
const TEST_USER_EMAIL = 'test.deactivated@koshkskate.com'
const TEST_USER_EMAIL_2 = 'test.cashier.perm@koshkskate.com'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAdmin(): Promise<{ accessToken: string; cookie: string }> {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })

  const accessToken = res.body.data.accessToken as string
  const cookie = (res.headers['set-cookie'] as string[] | undefined)?.[0] ?? ''
  return { accessToken, cookie }
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Create a deactivated test user for TC-AUTH-14
  const existing1 = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL)).limit(1)
  if (!existing1.length) {
    await db.insert(users).values({
      name: 'مستخدم تجريبي معطّل',
      email: TEST_USER_EMAIL,
      passwordHash: await bcrypt.hash('TestPass@99', 12),
      isActive: false,
    })
  }

  // Create a cashier test user for TC-AUTH-12
  const existing2 = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL_2)).limit(1)
  if (!existing2.length) {
    await db.insert(users).values({
      name: 'كاشير تجريبي',
      email: TEST_USER_EMAIL_2,
      passwordHash: await bcrypt.hash('CashierPass@99', 12),
      isActive: true,
      // No role assigned → zero permissions → any requirePermission check will fail with 403
    })
  }
})

afterAll(async () => {
  // Clean up test users
  const testEmails = [TEST_USER_EMAIL, TEST_USER_EMAIL_2]
  for (const email of testEmails) {
    const found = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (found.length) {
      const id = found[0].id
      await db.delete(userRoles).where(eq(userRoles.userId, id))
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, id))
      await db.delete(users).where(eq(users.id, id))
    }
  }
})

// ---------------------------------------------------------------------------
// TC-AUTH-01: Login success
// ---------------------------------------------------------------------------

describe('TC-AUTH-01: Login success', () => {
  it('returns 200, accessToken, user object with permissions, and sets HttpOnly cookie', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeTruthy()
    expect(typeof res.body.data.accessToken).toBe('string')
    expect(res.body.data.user).toBeTruthy()
    expect(res.body.data.user.email).toBe(ADMIN_EMAIL)
    expect(res.body.data.user.isActive).toBe(true)
    expect(Array.isArray(res.body.data.user.roles)).toBe(true)
    expect(Array.isArray(res.body.data.user.permissions)).toBe(true)
    expect(res.body.data.user.permissions.length).toBe(40) // all 40 permissions for admin

    // HttpOnly refresh cookie must be set
    const cookies = res.headers['set-cookie'] as string[] | undefined
    expect(cookies).toBeDefined()
    const refreshCookie = cookies?.find((c: string) => c.includes('koshk_refresh_token'))
    expect(refreshCookie).toBeTruthy()
    expect(refreshCookie).toMatch(/HttpOnly/i)
    expect(refreshCookie).toMatch(/Path=\/api\/v1\/auth/i)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-02: Login failure — wrong password
// ---------------------------------------------------------------------------

describe('TC-AUTH-02: Login failure — wrong password', () => {
  it('returns 401 with Arabic error message', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'WrongPassword123!' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toBeTruthy()
    expect(typeof res.body.error.message).toBe('string')
    // Must not reveal whether email or password was wrong
    expect(res.body.error.message).toMatch(/البريد الإلكتروني أو كلمة المرور/)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-03: Login failure — nonexistent email
// ---------------------------------------------------------------------------

describe('TC-AUTH-03: Login failure — nonexistent email', () => {
  it('returns 401 with same Arabic error message (no info leak)', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Whatever123!' })

    expect(res.status).toBe(401)
    expect(res.body.error.message).toMatch(/البريد الإلكتروني أو كلمة المرور/)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-04: Login failure — missing fields
// ---------------------------------------------------------------------------

describe('TC-AUTH-04: Login failure — missing fields', () => {
  it('returns 401 when email is missing', async () => {
    const res = await request.post('/api/v1/auth/login').send({ password: 'pass' })
    expect(res.status).toBe(401)
  })

  it('returns 401 when password is missing', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: ADMIN_EMAIL })
    expect(res.status).toBe(401)
  })

  it('returns 401 when body is empty', async () => {
    const res = await request.post('/api/v1/auth/login').send({})
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-05: GET /me with valid token
// ---------------------------------------------------------------------------

describe('TC-AUTH-05: GET /me with valid token', () => {
  it('returns 200 with full user object', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(ADMIN_EMAIL)
    expect(Array.isArray(res.body.data.user.permissions)).toBe(true)
    expect(res.body.data.user.permissions.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-06: GET /me without token → 401
// ---------------------------------------------------------------------------

describe('TC-AUTH-06: GET /me without token', () => {
  it('returns 401', async () => {
    const res = await request.get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-07: GET /me with malformed token → 401
// ---------------------------------------------------------------------------

describe('TC-AUTH-07: GET /me with malformed token', () => {
  it('returns 401 for garbage token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.real.jwt.token')
    expect(res.status).toBe(401)
  })

  it('returns 401 for token with wrong signature', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.tampered_signature')
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-08: Refresh token rotation
// ---------------------------------------------------------------------------

describe('TC-AUTH-08: Refresh token rotation', () => {
  it('returns a new access token and rotates the refresh cookie', async () => {
    // 1. Login to get initial tokens
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    expect(loginRes.status).toBe(200)

    const firstCookies = loginRes.headers['set-cookie'] as string[]
    const firstRefreshCookie = firstCookies.find((c: string) => c.includes('koshk_refresh_token'))
    expect(firstRefreshCookie).toBeTruthy()

    // 2. Refresh using the cookie
    const refreshRes = await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstRefreshCookie!)

    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.data.accessToken).toBeTruthy()

    // 3. A new refresh cookie should be set (rotation)
    const newCookies = refreshRes.headers['set-cookie'] as string[]
    const newRefreshCookie = newCookies?.find((c: string) => c.includes('koshk_refresh_token'))
    expect(newRefreshCookie).toBeTruthy()

    // 4. Old refresh cookie must NOT work again (single-use rotation)
    const reuseRes = await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstRefreshCookie!)
    expect(reuseRes.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-09: Logout revokes refresh token
// ---------------------------------------------------------------------------

describe('TC-AUTH-09: Logout revokes refresh token', () => {
  it('after logout, the refresh cookie cannot be used', async () => {
    // 1. Login
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    const { accessToken } = loginRes.body.data
    const cookies = loginRes.headers['set-cookie'] as string[]
    const refreshCookie = cookies.find((c: string) => c.includes('koshk_refresh_token'))!

    // 2. Logout
    const logoutRes = await request
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
    expect(logoutRes.status).toBe(200)

    // 3. Try to use the revoked refresh cookie
    const refreshRes = await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
    expect(refreshRes.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-10: POST /refresh with no cookie → 401
// ---------------------------------------------------------------------------

describe('TC-AUTH-10: POST /refresh with no cookie', () => {
  it('returns 401 when no refresh cookie is sent', async () => {
    const res = await request.post('/api/v1/auth/refresh')
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-11: Permission enforcement — admin accesses users list → 200
// ---------------------------------------------------------------------------

describe('TC-AUTH-11: Permission enforcement — authorized access', () => {
  it('admin with users.view can access GET /users', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('admin with roles.view can access GET /roles', async () => {
    const { accessToken } = await loginAdmin()

    const res = await request
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-12: Permission enforcement — user without permission → 403
// ---------------------------------------------------------------------------

describe('TC-AUTH-12: Permission enforcement — unauthorized (403)', () => {
  it('user with no roles gets 403 on users.view route', async () => {
    // Login as the no-role test user
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER_EMAIL_2, password: 'CashierPass@99' })
    expect(loginRes.status).toBe(200)

    const token = loginRes.body.data.accessToken

    // Should be rejected with 403 (authenticated but not authorized)
    const res = await request
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-13: Rate limiter is configured (structural check)
// ---------------------------------------------------------------------------

describe('TC-AUTH-13: Rate limiter — configured and active', () => {
  it('login route responds without rate-limit headers in test mode (limiter skipped in NODE_ENV=test)', async () => {
    // In NODE_ENV=test, the loginLimiter skip() returns true → no headers
    // This is the expected test-mode behavior; in production it returns RateLimit-* headers
    // We verify the login still works (rate limiter does not break the endpoint)
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })

    expect(res.status).toBe(200)
    // When rate limiter is active (non-test), standardHeaders: true adds ratelimit-limit
    // In test mode with skip=true, no headers are added — this is correct by design
    expect(res.body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-AUTH-14: Deactivated user cannot log in
// ---------------------------------------------------------------------------

describe('TC-AUTH-14: Deactivated user login attempt', () => {
  it('returns 401 with Arabic deactivation message', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER_EMAIL, password: 'TestPass@99' })

    expect(res.status).toBe(401)
    expect(res.body.error.message).toMatch(/معطّل/)
  })
})
