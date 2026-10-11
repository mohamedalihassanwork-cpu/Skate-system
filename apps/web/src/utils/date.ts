/**
 * KOSHK SKATE ERP — Date/Time Formatting Utilities
 *
 * TIMESTAMP CONTRACT (Phase 06 UTC Architecture):
 *   - All API timestamps are UTC ISO 8601 strings with Z suffix (e.g. "2026-10-06T12:27:08.000Z")
 *   - new Date(isoStr) correctly parses them as UTC
 *   - toLocaleString() / toLocaleTimeString() then formats in the USER's local timezone
 *   - No manual offset arithmetic is needed or allowed here
 *
 * DO NOT:
 *   - Add/subtract hardcoded hour offsets
 *   - Use getTimezoneOffset() for display (only valid for datetime-local inputs)
 *   - Append 'Z' to strings that don't have it
 */

/**
 * Formats a UTC ISO timestamp for display in the user's local timezone.
 * Locale: en-US with 12h clock.
 * Example: "2026-10-06T12:27:08.000Z" → "Oct 6, 2026, 3:27 PM" (Cairo)
 */
export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/**
 * Formats a UTC ISO timestamp as time only (Arabic locale, 12h).
 * Example: "2026-10-06T12:27:08.000Z" → "٣:٢٧ م" (Cairo)
 */
export function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Formats a UTC ISO timestamp as date+time (Arabic locale).
 * Example: "2026-10-06T12:27:08.000Z" → "٦ أكتوبر ٢٠٢٦، ٣:٢٧ م" (Cairo)
 */
export function formatDateTimeAr(isoStr: string | null | undefined): string {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Converts a UTC ISO timestamp to a datetime-local input value (browser local time).
 * Used ONLY for populating <input type="datetime-local"> which expects local time strings.
 * This correctly uses the browser's actual timezone — no hardcoded offset.
 *
 * Example: "2026-10-06T12:27:08.000Z" (UTC) → "2026-10-06T15:27" (Cairo local)
 */
export function toDatetimeLocal(isoStr: string | undefined | null): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return ''
  const tzoffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16)
}
