/**
 * KOSHK SKATE ERP — Financial Utilities
 * Phase 01 — Foundation (stubs)
 *
 * This module will contain all financial calculation helpers.
 * Implementation will be fleshed out in Phase 05 (Rental POS) and Phase 06 (Payments).
 *
 * RULE: All monetary values are stored and computed in integer Egyptian Pounds
 * (or smallest currency unit) to avoid floating-point precision errors.
 *
 * See: DEC-004 (late fee calculation), DEC-006 (damage vs maintenance),
 *      DEC-008 (split payments), SOURCE_OF_TRUTH.md (inviolable rules 6–9)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Monetary amount in the smallest currency unit (e.g., piastres / cents).
 *  Use integers throughout — never float for money. */
export type MonetaryAmount = number

/** A rental duration in minutes. */
export type DurationMinutes = number

// ---------------------------------------------------------------------------
// Currency helpers
// ---------------------------------------------------------------------------

/**
 * Round a monetary value to 2 decimal places (for display only).
 * All internal calculations should use integers.
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Format a monetary amount for Arabic display.
 * Example: 1500 → "15.00 ج.م"
 * TODO Phase 05: confirm currency symbol and formatting convention with project owner.
 */
export function formatCurrency(amount: MonetaryAmount, currency = 'ج.م'): string {
  const value = (amount / 100).toFixed(2)
  return `${value} ${currency}`
}

// ---------------------------------------------------------------------------
// Late fee calculation (DEC-004)
// ---------------------------------------------------------------------------

/**
 * Calculate the late fee for a rental.
 *
 * Business rule (DEC-004):
 *   lateFee = feePerMinute × lateMinutes
 *   Late time starts ONLY after expectedEndTime.
 *   Returns 0 if returnTime <= expectedEndTime (no late time).
 *
 * @param expectedEndTime  - When the rental was supposed to end (Date)
 * @param actualReturnTime - When the customer actually returned the skate (Date)
 * @param feePerMinute     - Configured late fee per minute (MonetaryAmount)
 * @returns                - Late fee amount (MonetaryAmount), never negative
 *
 * TODO Phase 05: implement fully with database-sourced feePerMinute config.
 */
export function calculateLateFee(
  expectedEndTime: Date,
  actualReturnTime: Date,
  feePerMinute: MonetaryAmount,
): MonetaryAmount {
  const lateMs = actualReturnTime.getTime() - expectedEndTime.getTime()

  if (lateMs <= 0) {
    return 0 // Returned on time or early — no late fee
  }

  const lateMinutes = Math.ceil(lateMs / 60_000) // round up to full minutes
  return lateMinutes * feePerMinute
}

/**
 * Calculate the expected end time for a rental.
 *
 * Business rule (DEC-004):
 *   expectedEndTime = startTime + duration
 */
export function calculateExpectedEndTime(
  startTime: Date,
  durationMinutes: DurationMinutes,
): Date {
  return new Date(startTime.getTime() + durationMinutes * 60_000)
}

/**
 * Calculate how many minutes late a return was.
 * Returns 0 if not late.
 */
export function calculateLateMinutes(
  expectedEndTime: Date,
  actualReturnTime: Date,
): number {
  const lateMs = actualReturnTime.getTime() - expectedEndTime.getTime()
  return lateMs <= 0 ? 0 : Math.ceil(lateMs / 60_000)
}
