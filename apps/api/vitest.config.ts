/**
 * KOSHK SKATE ERP — Vitest Configuration
 * Phase 02 — Authentication & Permissions
 *
 * Note: .env is loaded by dotenv-cli in the npm test script:
 *   "test": "dotenv -e .env -- cross-env NODE_ENV=test vitest run"
 * No dotenv config needed here.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: ['src/tests/**/*.test.ts'],
    // Run test files serially to avoid DB state conflicts
    sequence: {
      concurrent: false,
    },
  },
})
