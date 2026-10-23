import type { ReactNode, FormEvent } from 'react'
import { Alert, Badge, Button, DataTable, Input } from '../../components/ui'
import { dateText, statusNames } from './subtreasury.state'
import { formatCurrency } from '../../utils/currency'
import type { Handover, TreasuryMovement } from './treasury.api'

export function Money({ value }: { value: string | null | undefined }) {
  return <bdi dir="ltr">{value == null ? '—' : formatCurrency(value, { decimals: 2 })}</bdi>
}
export function MoneyInput({ id, label, value, onChange, required = true }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <Input id={id} label={label} value={value} onChange={event => onChange(event.target.value)} inputMode="decimal" type="text" dir="ltr" pattern="[0-9]+(\.[0-9]{1,2})?" maxLength={16} required={required} helperText="جنيه مصري · منزلتان عشريتان كحد أقصى" />
}
export function HandoverStatus({ status }: { status: Handover['status'] }) {
  return <Badge variant={status === 'pending' ? 'warning' : status === 'rejected' ? 'danger' : status === 'confirmed' ? 'success' : 'neutral'}>{statusNames[status]}</Badge>
}
export function ActionForm({ children, action, onSubmit }: { children: ReactNode; action: { busy: boolean; error: string }; onSubmit: () => void | Promise<void> }) {
  return <form className="st-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void onSubmit() }}>
    <fieldset disabled={action.busy}>{children}</fieldset>
    {action.error && <Alert variant="danger">{action.error}</Alert>}
  </form>
}
export function ResourceState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  return <>{loading && <p role="status">جارٍ تحميل البيانات…</p>}{error && <Alert variant="danger" title="تعذر تحميل البيانات">{error} <Button variant="secondary" onClick={retry}>إعادة المحاولة</Button></Alert>}</>
}
const movementNames: Record<string, string> = {
  rental_payment: 'تحصيل إيجار', late_fee_payment: 'تحصيل تأخير', damage_charge_payment: 'تحصيل تعويض', sale_payment: 'تحصيل بيع', sale_refund: 'مرتجع بيع', rental_refund: 'مرتجع إيجار', expense: 'مصروف', maintenance_payment: 'دفعة صيانة', treasury_transfer: 'تحويل بين حسابات', handover_transfer: 'تحويل تسليم', funding_transfer: 'تحويل تمويل', treasury_adjustment: 'تسوية فرق', treasury_variance: 'تسوية فرق', variance_adjustment: 'تسوية فرق', transfer: 'تحويل', adjustment: 'تسوية فرق', other: 'حركة أخرى',
}
export function Movements({ rows }: { rows: TreasuryMovement[] }) {
  return <DataTable<TreasuryMovement> data={rows} emptyMessage="لا توجد حركات مسجلة" columns={[
    { key: 'referenceType', header: 'الحركة', render: (_, row) => <>{movementNames[row.referenceType] || row.referenceType}<span className="st-movement-mobile"><strong>{row.type === 'in' ? 'وارد + ' : 'صادر − '}<Money value={row.amount} /></strong><span>المسؤول: {row.cashierName || '—'}</span></span><small className="st-secondary">مرجع #{row.referenceId ?? '—'} · وردية #{row.shiftId ?? '—'}</small></> },
    { key: 'createdAt', header: 'التاريخ', render: (_, row) => dateText(row.createdAt) },
    { key: 'amount', header: 'المبلغ', render: (_, row) => <><span>{row.type === 'in' ? 'وارد + ' : 'صادر − '}</span><Money value={row.amount} /></> },
    { key: 'cashierName', header: 'المسؤول', render: (_, row) => row.cashierName || '—' },
  ]} />
}
