import { useEffect, useState } from 'react'
import type { ApiResponse } from '../../services/api'

/** Ignore obsolete responses when the report, filters or page changes. */
export function useReportData<T>(load: () => Promise<ApiResponse<T>>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ load: typeof load | null; attempt: number; data: T | null; error: string | null; loading: boolean }>({ load: null, attempt: 0, data: null, error: null, loading: true })
  useEffect(() => {
    let current = true
    load().then(response => {
      if (current) setResult({ load, attempt, data: response.data, error: null, loading: false })
    }).catch((err: unknown) => {
      if (current) setResult({ load, attempt, data: null, error: err && typeof err === 'object' && 'message' in err ? String(err.message) : 'تعذر تحميل التقرير. حاول مرة أخرى.', loading: false })
    })
    return () => { current = false }
  }, [load, attempt])
  const matches = result.load === load && result.attempt === attempt
  return { data: matches ? result.data : null, loading: !matches || result.loading, error: matches ? result.error : null, retry: () => setAttempt(value => value + 1) }
}
