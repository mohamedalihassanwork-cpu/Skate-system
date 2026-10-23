import { operationToken } from '../../utils/financialOperation'
export { operationToken } from '../../utils/financialOperation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { Handover } from './treasury.api'

export const treasuryPermissions = ['treasury.view', 'treasury.view_own', 'shifts.manage', 'treasury.assign', 'treasury.fund', 'treasury.handovers.view', 'treasury.handovers.confirm', 'treasury.reconcile']
export const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'تعذر إتمام الطلب. أعد المحاولة.'
export function dateText(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }) : '—'
}
export function cents(value: string) {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return null
  const negative = value.startsWith('-')
  const [whole, part = ''] = value.replace('-', '').split('.')
  return (BigInt(whole) * 100n + BigInt(part.padEnd(2, '0'))) * (negative ? -1n : 1n)
}
export function delta(a: string, b: string) {
  const first = cents(a), second = cents(b)
  if (first == null || second == null) return null
  const result = first - second, absolute = result < 0n ? -result : result
  return (result < 0n ? '-' : '') + String(absolute / 100n) + '.' + String(absolute % 100n).padStart(2, '0')
}
export const statusNames: Record<Handover['status'], string> = {
  pending: 'بانتظار تأكيد الاستلام', confirmed: 'تم تأكيد الاستلام', rejected: 'مرفوض · يحتاج تصريحًا جديدًا', zero_acknowledged: 'إقرار بدون أموال',
}
export function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const id = ++request.current
    setLoading(true); setError('')
    try { const result = await loader(); if (request.current === id) setData(result) }
    catch (err) { if (request.current === id) { setData(null); setError(errorMessage(err)) } }
    finally { if (request.current === id) setLoading(false) }
  }, [loader])
  const invalidate = useCallback(() => { request.current++ }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void refresh() }); return () => { active = false; invalidate() } }, [refresh, invalidate])
  return { data, loading, error, refresh }
}
export function useTreasuryAction(onSuccess: () => void) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const inFlight = useRef(false)
  const run = async (action: string, payload: unknown, execute: (key: string) => Promise<unknown>) => {
    if (inFlight.current) return false
    inFlight.current = true; setBusy(true); setError('')
    const token = operationToken(user!.id, action, payload)
    try { await execute(token.key); token.clear(); onSuccess(); return true }
    catch (err) { setError(errorMessage(err)); return false }
    finally { inFlight.current = false; setBusy(false) }
  }
  return { busy, error, run }
}
