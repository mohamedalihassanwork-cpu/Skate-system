import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, CheckboxField, EmptyState, Input, Pagination, Select } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { subTreasuryApi, type HandoverDetail } from './treasury.api'
import { ActionForm, HandoverStatus, Money, MoneyInput, Movements, ResourceState } from './subtreasury.ui'
import { dateText, delta, statusNames, useResource, useTreasuryAction } from './subtreasury.state'

function ReceiptReview({ detail, refresh }: { detail: HandoverDetail; refresh: () => void }) {
  const { user, hasPermission } = useAuth()
  const handover = detail.handover
  const [received, setReceived] = useState(''), [reason, setReason] = useState(''), [approveVariance, setApproveVariance] = useState(false), [validation, setValidation] = useState('')
  const action = useTreasuryAction(refresh)
  const variance = delta(received, handover.expectedLedgerBalance)
  const differs = variance !== null && variance !== '0.00'
  const match = delta(received, handover.declaredAmount) === '0.00'
  const sameActor = handover.cashierId === user?.id
  const latest = detail.attempts.every(attempt => attempt.id <= handover.id)
  const ownReplacement = hasPermission('shifts.manage') && sameActor && handover.status === 'rejected' && latest
  const canConfirm = !sameActor && handover.status === 'pending' && hasPermission('treasury.handovers.confirm')
  const submit = async () => {
    setValidation('')
    if (ownReplacement) {
      if (await action.run('replace-' + handover.id, { declaredAmount: received, reason }, key => subTreasuryApi.replace(handover.id, { declaredAmount: received, reason, operationKey: key }))) { setReceived(''); setReason('') }
      return
    }
    if (!match) { setValidation('المستلم يختلف عن التصريح. ارفض التصريح مع توضيح السبب ليقدم الكاشير تصريحًا جديدًا.'); return }
    if (differs && (!approveVariance || !hasPermission('treasury.reconcile') || !reason.trim())) { setValidation('تسوية الفرق تتطلب صلاحية التسوية وإقرارًا صريحًا وسببًا.'); return }
    const payload = { receivedAmount: received, approveVariance: differs && approveVariance, reason }
    await action.run('confirm-' + handover.id, payload, key => subTreasuryApi.confirm(handover.id, { ...payload, operationKey: key }))
  }
  return <>
    <dl className="st-metrics">
      <div><dt>النقدية المتوقعة حسب العدّ</dt><dd><Money value={handover.expectedBalance} /></dd></div>
      <div><dt>المستحق حسب سجل الحساب</dt><dd><Money value={handover.expectedLedgerBalance} /></dd></div>
      <div><dt>العدّ الأصلي عند الإغلاق</dt><dd><Money value={handover.actualBalance} /></dd></div>
      <div><dt>فرق العدّ الأصلي</dt><dd><Money value={handover.difference} /></dd></div>
      <div><dt>المبلغ المصرح به حاليًا</dt><dd><Money value={handover.declaredAmount} /></dd></div>
      <div><dt>فرق التصريح عن السجل</dt><dd><Money value={handover.settlementDifference} /></dd></div>
    </dl>
    {handover.reason && <p>توضيح الكاشير: {handover.reason}</p>}
    {handover.confirmedAt && <Alert variant="info">سجّل المسؤول #{handover.confirmedBy} {handover.status === 'zero_acknowledged' ? 'إقرار عدم وجود أموال' : 'تأكيد استلام'} بتاريخ {dateText(handover.confirmedAt)}. المبلغ: <Money value={handover.receivedAmount} /></Alert>}
    {handover.reviewReason && <Alert variant={handover.status === 'rejected' ? 'warning' : 'info'}>مراجعة المسؤول #{handover.reviewedBy}: {handover.reviewReason} · {dateText(handover.reviewedAt)}</Alert>}
    <p className="st-secondary">العدّ عند الافتتاح: <Money value={detail.closing.openingBalance} /> · سجل الحساب عند الافتتاح: <Money value={detail.closing.openingLedgerBalance} /> · يوم العمل {detail.closing.businessDate}</p>
    {detail.settlement && <Alert variant="info">التسوية المسجلة: <Money value={detail.settlement.adjustmentAmount} /> · المبلغ المستلم: <Money value={detail.settlement.receivedAmount} /> · مرجع التسوية #{detail.settlement.id}</Alert>}
    {sameActor && handover.status === 'pending' && <Alert variant="info">بانتظار مراجعة مسؤول آخر؛ لا يمكنك تأكيد استلام تسليمك بنفسك.</Alert>}
    {(ownReplacement || canConfirm) && <ActionForm action={action} onSubmit={submit}>
      <h3>{ownReplacement ? 'تصريح جديد مرتبط بالتسليم المرفوض' : 'تسجيل مراجعة الاستلام'}</h3>
      <MoneyInput id="st-received" label={ownReplacement ? 'المبلغ المصرح به بعد المراجعة' : 'المبلغ المستلم فعليًا'} value={received} onChange={value => { setReceived(value); setApproveVariance(false) }} />
      {!ownReplacement && received && <p>التسوية المطلوبة مقابل السجل: <Money value={variance} /></p>}
      {!ownReplacement && received && !match && <Alert variant="warning">المبلغ يختلف عن تصريح الكاشير. يلزم رفض مسبب وتصريح جديد قبل التأكيد.</Alert>}
      {!ownReplacement && differs && <CheckboxField id="st-approve-variance" label="أوافق صراحة على تسجيل تسوية الفرق الموضح" checked={approveVariance} onChange={setApproveVariance} disabled={!hasPermission('treasury.reconcile')} helperText="تُسجل التسوية كحركة مستقلة عن التحويل، وليست إيرادًا أو مصروفًا تشغيليًا." />}
      <Input id="st-review-reason" label={ownReplacement ? 'سبب التصريح الجديد' : 'سبب التسوية أو الرفض / ملاحظة الاستلام'} value={reason} onChange={event => setReason(event.target.value)} required={ownReplacement || differs} maxLength={1000} />
      {!ownReplacement && <p className="st-secondary">التأكيد إقرار منك بالاستلام؛ النظام لا يتحقق ماديًا من الأموال. لا تُضاف أموال لحساب الاستلام قبل التأكيد.</p>}
      {validation && <Alert variant="danger">{validation}</Alert>}
      <div className="st-actions"><Button type="submit" loading={action.busy} disabled={!ownReplacement && (!match || (differs && (!approveVariance || !hasPermission('treasury.reconcile'))))}>{ownReplacement ? 'إرسال التصريح الجديد' : received && delta(received, '0.00') === '0.00' ? 'تسجيل إقرار بدون أموال' : 'تأكيد الاستلام وتسجيل التحويل'}</Button>
        {!ownReplacement && <Button variant="danger" disabled={action.busy} onClick={async () => {
          if (!reason.trim()) { setValidation('أدخل سبب رفض التسليم.'); return }
          await action.run('reject-' + handover.id, { reason }, key => subTreasuryApi.reject(handover.id, { reason, operationKey: key }))
        }}>رفض التصريح</Button>}
      </div>
    </ActionForm>}
    <h3>سجل التصريحات</h3><ol className="st-history">{detail.attempts.map(attempt => <li key={attempt.id}><div className="st-row"><strong>تصريح #{attempt.id} · <Money value={attempt.declaredAmount} /></strong><HandoverStatus status={attempt.status} /></div><p>{attempt.reason || 'بدون ملاحظة'}</p><small>{dateText(attempt.createdAt)}</small></li>)}</ol>
    <h3>حركات الوردية للمراجعة</h3><Movements rows={detail.movements} />
  </>
}
function HandoverSelection({ id, close, refreshList }: { id: number; close: () => void; refreshList: () => void }) {
  const loader = useCallback(() => subTreasuryApi.handover(id), [id])
  const state = useResource(loader), heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [id])
  return <Card as="section" className="st-review"><div className="st-row"><h2 ref={heading} tabIndex={-1}>مراجعة التسليم #{id}</h2><Button variant="secondary" onClick={close}>العودة للسجل</Button></div><ResourceState {...state} retry={() => void state.refresh()} />
    {state.data && <><div className="st-row"><h3>{state.data.handover.cashierName} · وردية #{state.data.handover.shiftId}</h3><HandoverStatus status={state.data.handover.status} /></div>
      <ReceiptReview key={id + ':' + state.data.handover.status} detail={state.data} refresh={() => { void state.refresh(); refreshList() }} /></>}
  </Card>
}
export function HandoverWorkspace() {
  const { hasPermission } = useAuth()
  const manager = hasPermission('treasury.handovers.view')
  const [status, setStatus] = useState(manager ? 'pending' : ''), [page, setPage] = useState(1), [selected, setSelected] = useState<number | null>(null)
  const loader = useCallback(() => subTreasuryApi.handovers(status, page), [status, page])
  const state = useResource(loader), summary = useResource(subTreasuryApi.summary)
  const refresh = () => { void state.refresh(); void summary.refresh() }
  return <div className="st-stack"><div className="st-row"><h2>{manager ? 'تسليمات الكاشير' : 'سجل تسليماتي'}</h2><Button variant="secondary" disabled={state.loading || summary.loading} onClick={refresh}>تحديث التسليمات</Button></div>
    <Card as="section" className="st-handover-summary"><h3>{manager ? 'ملخص تسليمات الكاشير' : 'ملخص تسليماتي'}</h3><p className="st-secondary">أحدث تصريح لكل إغلاق · كامل السجل المتاح لك</p><ResourceState {...summary} retry={() => void summary.refresh()} />
      {summary.data && <><dl className="st-metrics">
        <div><dt>مصرح به بانتظار التأكيد</dt><dd><Money value={summary.data.pendingDeclaredAmount} /></dd><small>{summary.data.pendingCount} تصريح</small></div>
        <div><dt>مصرح به مرفوض حاليًا</dt><dd><Money value={summary.data.rejectedDeclaredAmount} /></dd><small>{summary.data.rejectedCount} تصريح</small></div>
        <div><dt>استلام مسجل بتأكيد المسؤول</dt><dd><Money value={summary.data.receivedAmount} /></dd><small>{summary.data.completedCount} تسليم مكتمل</small></div>
        <div><dt>صافي تسويات الفروق المسجلة</dt><dd><Money value={summary.data.adjustmentAmount} /></dd><small>{summary.data.zeroAcknowledgedCount} إقرار بدون أموال</small></div>
      </dl><p className="st-secondary">المعلق والمرفوض ليسا أموالًا مستلمة. التحويلات وتسويات الفروق منفصلة عن الإيرادات والمصروفات التشغيلية.</p></>}
    </Card>
    <Select id="st-handover-filter" label="حالة التسليم" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} options={[{ value: '', label: 'كل الحالات' }, ...Object.entries(statusNames).map(([value, label]) => ({ value, label }))]} />
    <ResourceState {...state} retry={() => void state.refresh()} />
    {selected !== null && <HandoverSelection id={selected} close={() => setSelected(null)} refreshList={refresh} />}
    {state.data && <Card as="section"><h3>السجل · {state.data.meta.total} تصريح</h3>{state.data.data.length ? <ul className="st-records">{state.data.data.map(handover => <li key={handover.id}><div className="st-row"><div><strong>{handover.cashierName} · وردية #{handover.shiftId}</strong><small className="st-secondary">{dateText(handover.createdAt)}</small></div><HandoverStatus status={handover.status} /></div><dl className="st-metrics st-compact"><div><dt>المصرح للتسليم</dt><dd><Money value={handover.declaredAmount} /></dd></div><div><dt>المستحق بالسجل</dt><dd><Money value={handover.expectedLedgerBalance} /></dd></div><div><dt>فرق العدّ</dt><dd><Money value={handover.difference} /></dd></div></dl><Button variant="secondary" onClick={() => setSelected(handover.id)}>مراجعة تصريح #{handover.id}</Button></li>)}</ul> : <EmptyState title="لا توجد تسليمات بهذه الحالة." />}
      <Pagination currentPage={page} totalPages={state.data.meta.totalPages} onPageChange={setPage} />
    </Card>}
  </div>
}
