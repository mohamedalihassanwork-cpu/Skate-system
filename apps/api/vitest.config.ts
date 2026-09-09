/**
 * KOSHK SKATE ERP — Vitest Configuration
 * Phase 02 — Authentication & Permissions
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: ['src/tests/**/*.test.ts'],
    // Load .env using vitest's built-in dotenv support (loaded before any module)
    dotenv: true,
    // Run test files serially to avoid DB state conflicts
    sequence: {
      concurrent: false,
    },
  },
})
