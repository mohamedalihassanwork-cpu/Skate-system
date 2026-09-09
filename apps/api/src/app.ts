/**
 * KOSHK SKATE ERP — Express App Factory
 * Phase 02 — Authentication & Permissions
 *
 * Separated from server startup (index.ts) so tests can import the
 * configured app without starting the HTTP listener or failing on
 * DB connection issues.
 *
 * This module is the single source of truth for:
 *   - Global middleware registration
 *   - Route mounting
 *   - Error handler registration
 */

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler.js'
import env from './config/env.js'

// Phase 02 routes
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import rolesRoutes from './modules/users/roles.routes.js'

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// CORS — allow frontend dev server and production origin
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,  // required for HttpOnly cookie on refresh (DEC-025)
  }),
)

// Cookie parser — required for reading the HttpOnly refresh token cookie (DEC-025)
app.use(cookieParser())

// JSON body parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging (suppress in test environment)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.isDevelopment ? 'dev' : 'combined'))
}

// ---------------------------------------------------------------------------
// Health check — GET /api/v1/health
// ---------------------------------------------------------------------------

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'koshk-skate-api',
    version: '2.0.0',
    phase: 'Phase 02 — Authentication & Permissions',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
})

// ---------------------------------------------------------------------------
// API Router index
// ---------------------------------------------------------------------------

app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    message: 'KOSHK SKATE ERP API — Phase 02',
    routes: {
      health: 'GET /api/v1/health',
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
      },
      users: '/api/v1/users',
      roles: '/api/v1/roles',
    },
  })
})

// ---------------------------------------------------------------------------
// Phase 02 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/roles', rolesRoutes)

// ---------------------------------------------------------------------------
// 404 handler — must come before error handler, after all routes
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'المسار غير موجود',
    },
  })
})

// Global error handler — MUST be last middleware registered
app.use(errorHandler)

export default app
