/**
 * KOSHK SKATE ERP — Currency Formatting Utility
 *
 * D-009: Approved ERP-wide currency standard (Owner decision 2026-09-14)
 *   Currency   : EGP — Egyptian Pound
 *   Symbol     : ج.م  (Arabic abbreviation for جنيه مصري)
 *   Numerals   : Western Arabic (0–9)  — uses 'en-US' locale internally
 *   Separators : comma thousands, period decimal
 *   Format     : "1,250 ج.م"  |  "1,250.50 ج.م"
 *
 * Usage:
 *   import { formatCurrency } from '../../utils/currency'
 *   formatCurrency(1250)       // "1,250 ج.م"
 *   formatCurrency('1250.5')   // "1,250.50 ج.م"
 *   formatCurrency(0)          // "0 ج.م"
 *   formatCurrency(null)       // "— ج.م"
 */

/** ERP-wide currency suffix — Arabic abbreviation for Egyptian Pound */
const EGP_SYMBOL = '\u062c.\u0645'

/**
 * Format a numeric amount as EGP currency.
 *
 * @param amount   - number or numeric string (e.g. from API decimal columns)
 * @param options.decimals - explicit decimal places; auto-detects fractional
 *                           part when omitted (0 for whole, 2 for fractional)
 * @returns Formatted string — e.g. "1,250 ج.م"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: { decimals?: number },
): string {
  if (amount === null || amount === undefined || amount === '') {
    return `\u2014 ${EGP_SYMBOL}`
  }

  // Exact server monetary strings can exceed Number's safe cent precision.
  // Keep their two decimals intact when the caller explicitly requests two.
  if (typeof amount === 'string' && options?.decimals === 2) {
    const exact = /^(-?)(\d+)\.(\d{2})$/.exec(amount)
    if (exact) {
      const integer = exact[2].replace(/^0+(?=\d)/, '')
      const sign = exact[1] && (integer !== '0' || exact[3] !== '00') ? '-' : ''
      return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${exact[3]} ${EGP_SYMBOL}`
    }
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  if (!isFinite(num)) {
    return `\u2014 ${EGP_SYMBOL}`
  }

  const decimals = options?.decimals ?? (num % 1 !== 0 ? 2 : 0)

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return `${formatted} ${EGP_SYMBOL}`
}


