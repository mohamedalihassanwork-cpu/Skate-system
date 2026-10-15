import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Alert, Badge, Button, Card } from '../../components/ui'
import { formatCurrency } from '../../utils/currency'
import { treasuryApi, type TreasurySummary } from './treasury.api'
import './treasury-balance.css'

export function TreasuryBalance({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<TreasurySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    setError(false)
    try {
      const response = await treasuryApi.getSummary()
      if (current === requestId.current) setSummary(response.data)
    } catch {
      if (current === requestId.current) {
        // A failed read is never presented as zero or as a current old balance.
        setSummary(null)
        setError(true)
      }
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => { if (!document.hidden) void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      ++requestId.current
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh, refreshKey])

  const money = (value: string) => formatCurrency(value, { decimals: 2 })

  return (
    <Card as="section" className="treasury-balance">
      <div className="treasury-balance-header">
        <div>
          <h2>الرصيد المتاح المسجل</h2>
          <p className="treasury-balance-caption">إجمالي التحصيلات المسجلة ناقص المدفوعات والمصروفات والمرتجعات</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" /> تحديث الرصيد
        </Button>
      </div>
      <div aria-busy={loading}>
        {loading && <p role="status" className="treasury-balance-caption">جارٍ تحديث الرصيد…</p>}
        {error && (
          <Alert variant="danger" title="تعذر تحميل الرصيد">
            الرصيد الحالي غير متاح. أعد المحاولة باستخدام «تحديث الرصيد».
          </Alert>
        )}
        {summary && (
          <>
            <p className="treasury-balance-total"><bdi dir="ltr">{money(summary.totalBalance)}</bdi></p>
            <p className="treasury-balance-caption">
              آخر تحديث: <time dateTime={summary.asOf}>{new Date(summary.asOf).toLocaleString('ar-EG')}</time>
            </p>
            <dl className="treasury-balance-breakdown">
              <div><dt>الحسابات النقدية</dt><dd><bdi dir="ltr">{money(summary.cashBalance)}</bdi></dd></div>
              <div><dt>الحسابات غير النقدية</dt><dd><bdi dir="ltr">{money(summary.nonCashBalance)}</bdi></dd></div>
            </dl>
            <p className="treasury-balance-note">
              رصيد حسب الحركات المسجلة؛ لا يشمل الفواتير غير المحصلة أو أرصدة افتتاح الورديات.
              لا يمثل جردًا نقديًا أو تأكيدًا لتسوية الحسابات الإلكترونية.
            </p>
            {summary.hasDiscrepancies && (
              <Alert variant="warning" title="توجد فروق تحتاج إلى مراجعة">
                بعض أرصدة الحسابات المحفوظة تختلف عن سجل الحركات. الأرقام المعروضة محسوبة من الحركات المسجلة.
                يجب مراجعة الفروق قبل الاعتماد عليها لاتخاذ قرار مالي.
              </Alert>
            )}
            <h3 className="treasury-balance-accounts-title">الرصيد حسب الحساب</h3>
            {summary.accounts.length === 0 ? (
              <p className="treasury-balance-caption">لا توجد حسابات خزينة مسجلة.</p>
            ) : (
              <ul className="treasury-balance-accounts">
                {summary.accounts.map(account => (
                  <li key={account.id}>
                    <div>
                      <div className="treasury-balance-account-name">
                        <h4>{account.nameAr}</h4>
                        {!account.isActive && <Badge status="inactive">غير نشط</Badge>}
                      </div>
                      <p className="treasury-balance-caption">
                        {account.isCashDrawer ? 'حساب نقدي' : 'حساب غير نقدي'} · {account.movementCount} حركة مسجلة
                      </p>
                      {account.difference !== '0.00' && (
                        <p className="treasury-balance-discrepancy">
                          الرصيد المحفوظ: <bdi dir="ltr">{money(account.storedBalance)}</bdi>
                          {' · '}الفرق عن الحركات: <bdi dir="ltr">{money(account.difference)}</bdi>
                        </p>
                      )}
                    </div>
                    <strong className="treasury-balance-account-amount"><bdi dir="ltr">{money(account.balance)}</bdi></strong>
                  </li>
                ))}
              </ul>
            )}
            {summary.accounts.some(account => !account.isActive) && (
              <p className="treasury-balance-note">يشمل الإجمالي أرصدة الحسابات غير النشطة؛ حالة الحساب لا تؤكد إمكانية السحب منه.</p>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
