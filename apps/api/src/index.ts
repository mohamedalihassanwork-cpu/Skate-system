/**
 * KOSHK SKATE ERP — Express Application Entry Point
 * Phase 02 — Authentication & Permissions (updated)
 *
 * What this file does:
 *  1. Loads environment configuration
 *  2. Creates the Express app with global middleware
 *  3. Registers the health check route
 *  4. Registers Phase 02 routes: auth, users, roles
 *  5. Registers the global error handler (must be last)
 *  6. Tests the database connection
 *  7. Starts the HTTP server
 *
 * Phase 03+: module routes (skates, customers, rentals, ...)
 */

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler.js'
import { testConnection } from './db/connection.js'
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

// Request logging
app.use(morgan(env.isDevelopment ? 'dev' : 'combined'))

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

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  try {
    // Test DB connection before accepting requests
    await testConnection()

    app.listen(env.PORT, () => {
      console.log(`🚀 KOSHK SKATE API running on http://localhost:${env.PORT}`)
      console.log(`   Environment: ${env.NODE_ENV}`)
      console.log(`   Health check: http://localhost:${env.PORT}/api/v1/health`)
      console.log(`   Auth routes:  http://localhost:${env.PORT}/api/v1/auth/login`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()

export default app
