import { useCallback, useState } from 'react'
import { Landmark, RefreshCw } from 'lucide-react'
import { Alert, Badge, Button, Card, CheckboxField, EmptyState, Input, Pagination } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { subTreasuryApi, treasuryApi, type Funding, type OwnTreasury, type TreasuryConfig } from './treasury.api'
import { ActionForm, HandoverStatus, Money, MoneyInput, Movements, ResourceState } from './subtreasury.ui'
import { dateText, delta, useResource, useTreasuryAction } from './subtreasury.state'
import { HandoverWorkspace } from './TreasuryHandovers'
import { TreasuryAdministration } from './TreasuryAdministration'
import './subtreasury.css'

function AccountLedger({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const load = useCallback(() => subTreasuryApi.movements(id, page), [id, page])
  const state = useResource(load)
  return <Card as="section"><h2>حركات الحساب</h2><ResourceState {...state} retry={() => void state.refresh()} />
    {state.data && <><Movements rows={state.data.data} /><Pagination currentPage={page} totalPages={state.data.meta.totalPages} onPageChange={setPage} /></>}
  </Card>
}
function FundingReceipt({ funding, refresh }: { funding: Funding; refresh: () => void }) {
  const { user } = useAuth(), action = useTreasuryAction(refresh)
  const [acknowledged, setAcknowledged] = useState(false)
  return <article className="st-list-item"><div className="st-row"><strong>تمويل #{funding.id}</strong><Badge variant="warning">بانتظار إقرارك</Badge></div>
    <p><Money value={funding.amount} /> · {funding.reason}</p><small>طلب {dateText(funding.createdAt)} · المسؤول #{funding.createdBy}</small>
    {funding.createdBy === user?.id ? <Alert variant="warning">لا يمكنك اعتماد التمويل الذي أنشأته بنفسك.</Alert> : <ActionForm action={action} onSubmit={async () => {
      if (!acknowledged) return
      await action.run('funding-accept-' + funding.id, { id: funding.id }, key => subTreasuryApi.fundingAction(funding.id, 'accept', { operationKey: key }))
    }}>
      <CheckboxField id={"st-funding-ack-" + funding.id} label="أقر باستلام مبلغ التمويل الموضح" checked={acknowledged} onChange={setAcknowledged} />
      <Button type="submit" loading={action.busy} disabled={!acknowledged}>تأكيد استلام التمويل</Button>
    </ActionForm>}
  </article>
}
function ShiftControls({ own, refresh }: { own: OwnTreasury; refresh: () => void }) {
  const { hasPermission } = useAuth(), action = useTreasuryAction(refresh)
  const [count, setCount] = useState(''), [declared, setDeclared] = useState(''), [reason, setReason] = useState('')
  const latestAttempts = new Map<number, typeof own.handovers[number]>()
  for (const handover of own.handovers) { if (!latestAttempts.has(handover.shiftId) || latestAttempts.get(handover.shiftId)!.id < handover.id) latestAttempts.set(handover.shiftId, handover) }
  const held = [...latestAttempts.values()].some(handover => handover.status === 'pending' || handover.status === 'rejected')
  const shift = own.shift
  const variance = delta(count, own.expectedBalance ?? '0.00')
  const ledgerVariance = delta(count, own.expectedLedgerBalance ?? '0.00')
  if (!hasPermission('shifts.manage')) return null
  return <Card as="section"><div className="st-row"><h2>الوردية اليومية</h2><Badge variant={shift ? 'success' : 'neutral'}>{shift ? 'نشطة' : 'لا توجد وردية نشطة'}</Badge></div>
    {!own.assignment ? <Alert variant="info">يلزم إسناد حساب نقدي لك قبل فتح وردية. تواصل مع المسؤول.</Alert> : !shift && (!own.assignment.isActive || !own.account?.isActive) ? <Alert variant="warning">الحساب أو الإسناد غير نشط. تواصل مع المسؤول قبل فتح وردية.</Alert> : held && !shift ? <Alert variant="warning" title="الحساب مغلق بانتظار التسوية">راجع التسليم المعلّق أو أرسل تصريحًا جديدًا للتسليم المرفوض. لا يمكن فتح وردية جديدة قبل تسويته.</Alert> : shift ? <>
      <dl className="st-metrics">
        <div><dt>العدّ عند الافتتاح</dt><dd><Money value={shift.openingBalance} /></dd></div>
        <div><dt>الرصيد المسجل عند الافتتاح</dt><dd><Money value={shift.openingLedgerBalance} /></dd></div>
        <div><dt>النقدية المتوقعة حسب العدّ</dt><dd><Money value={own.expectedBalance} /></dd></div>
        <div><dt>المبلغ المستحق حسب السجل</dt><dd><Money value={own.expectedLedgerBalance} /></dd></div>
      </dl>
      <p className="st-secondary">وردية #{shift.id} · يوم العمل {shift.businessDate} · فتحت {dateText(shift.openedAt)}</p>
      {shift.openingDifference !== '0.00' && <Alert variant="warning">فرق العدّ عند الافتتاح: <Money value={shift.openingDifference} />. العدّ لا يغيّر رصيد الحساب.</Alert>}
      <ActionForm action={action} onSubmit={async () => {
        if (delta(count, declared) !== '0.00') return
        const payload = { actualBalance: count, declaredAmount: declared, reason }
        if (await action.run('close-' + shift.id, payload, key => subTreasuryApi.close(shift.id, { ...payload, operationKey: key }))) { setCount(''); setDeclared(''); setReason('') }
      }}>
        <h3>إغلاق الوردية والتصريح بالتسليم</h3><div className="st-form-grid">
          <MoneyInput id="st-close-count" label="النقدية المعدودة عند الإغلاق" value={count} onChange={setCount} />
          <MoneyInput id="st-close-declared" label="كامل المبلغ المصرح بتسليمه" value={declared} onChange={setDeclared} />
        </div>
        {count && <p>فرق العدّ عن المتوقع: <Money value={variance} /></p>}
        {count && ledgerVariance !== null && ledgerVariance !== '0.00' && <p>فرق العدّ عن المستحق بالسجل: <Money value={ledgerVariance} />. يلزم توضيح الفرق لمراجعة المسؤول.</p>}
        {count && declared && delta(count, declared) !== '0.00' && <Alert variant="warning">يجب تسليم كامل النقدية المعدودة؛ المبلغان يجب أن يتساويا.</Alert>}
        <Input id="st-close-reason" label="توضيح فرق العدّ أو السجل / ملاحظات الإغلاق" value={reason} onChange={event => setReason(event.target.value)} required={(variance !== null && variance !== '0.00') || (ledgerVariance !== null && ledgerVariance !== '0.00')} maxLength={1000} />
        <p className="st-secondary">الإغلاق يسجل التصريح فقط. يظل التسليم معلقًا حتى تأكيد المسؤول الاستلام.</p>
        <Button type="submit" loading={action.busy} disabled={delta(count, declared) !== '0.00'}>إغلاق وتسجيل تسليم معلق</Button>
      </ActionForm>
    </> : <ActionForm action={action} onSubmit={async () => {
      const payload = { openingBalance: count }
      if (await action.run('open', payload, key => subTreasuryApi.open({ ...payload, operationKey: key }))) setCount('')
    }}>
      <MoneyInput id="st-opening-count" label="عدّ النقدية عند الافتتاح" value={count} onChange={setCount} />
      <p className="st-secondary">سجّل ما عددته فعليًا. هذا العدّ لا يضيف أموالًا إلى الحساب؛ التمويل يتم بتحويل مسجل مستقل.</p>
      <Button type="submit" loading={action.busy}>فتح الوردية وتسجيل العدّ</Button>
    </ActionForm>}
  </Card>
}
function ExpenseEntry({ refresh }: { refresh: () => void }) {
  const [amount, setAmount] = useState(''), [description, setDescription] = useState('')
  const action = useTreasuryAction(refresh)
  return <Card as="section"><h2>تسجيل مصروف من حسابي</h2><ActionForm action={action} onSubmit={async () => {
    const payload = { amount: Number(amount), description }
    if (await action.run('expense', payload, key => treasuryApi.recordExpense({ ...payload, operationKey: key }))) { setAmount(''); setDescription('') }
  }}>
    <MoneyInput id="st-expense-amount" label="قيمة المصروف" value={amount} onChange={setAmount} />
    <Input id="st-expense-description" label="بيان المصروف" value={description} onChange={event => setDescription(event.target.value)} maxLength={500} required />
    <Button type="submit" loading={action.busy}>تسجيل المصروف</Button>
  </ActionForm></Card>
}
function OwnWorkspace() {
  const { hasPermission } = useAuth()
  const state = useResource(subTreasuryApi.own)
  const [revision, setRevision] = useState(0)
  const refresh = () => { void state.refresh(); setRevision(value => value + 1) }
  return <><div className="st-row"><h2>حسابي وورديتي</h2><Button variant="secondary" onClick={refresh} disabled={state.loading}><RefreshCw size={16} aria-hidden="true" /> تحديث حسابي</Button></div>
    <ResourceState {...state} retry={refresh} />
    {state.data && <><Card as="section" className="st-account-summary"><div className="st-row"><div><h3>{state.data.account?.nameAr || 'لم يسند حساب بعد'}</h3><p>رصيد الحساب حسب الحركات المسجلة</p></div><strong className="st-large-money"><Money value={state.data.currentBalance} /></strong></div><p className="st-secondary">العدّ النقدي وإقرارات الاستلام محفوظة للمراجعة؛ الرصيد المعروض لا يثبت جردًا فعليًا.</p></Card>
      <div className="st-columns"><ShiftControls own={state.data} refresh={refresh} /><div className="st-stack">
        {state.data.funding.filter(fund => fund.status === 'pending').length > 0 && <Card as="section"><h2>تمويل بانتظار إقراري</h2>{state.data.funding.filter(fund => fund.status === 'pending').map(fund => <FundingReceipt key={fund.id} funding={fund} refresh={refresh} />)}</Card>}
        {state.data.shift && state.data.account?.isActive && state.data.assignment?.isActive && hasPermission('expenses.create') && <ExpenseEntry refresh={refresh} />}
        <Card as="section"><h2>آخر تسليماتي</h2>{state.data.handovers.length ? state.data.handovers.map(handover => <div className="st-list-item" key={handover.id}><div className="st-row"><strong>وردية #{handover.shiftId}</strong><HandoverStatus status={handover.status} /></div><p>التصريح: <Money value={handover.declaredAmount} /></p><small>{dateText(handover.createdAt)}</small></div>) : <EmptyState icon={Landmark} title="لا توجد تسليمات مسجلة بعد." />}</Card>
      </div></div>
      {state.data.account && <AccountLedger key={state.data.account.id + ':' + revision} id={state.data.account.id} />}
    </>}
  </>
}
export function SubTreasuryPage({ config, refreshConfig }: { config: TreasuryConfig; refreshConfig: () => void }) {
  const { hasPermission } = useAuth()
  const canOwn = hasPermission('treasury.view_own') || hasPermission('shifts.manage')
  const canReview = canOwn || hasPermission('treasury.handovers.view')
  const canAdmin = ['treasury.view', 'treasury.assign', 'treasury.fund'].some(hasPermission)
  const tabs = [...(canOwn && config.enabled ? [{ id: 'own', name: 'حسابي وورديتي' }] : []), ...(canReview && config.enabled ? [{ id: 'handovers', name: 'التسليمات والسجل' }] : []), ...(canAdmin ? [{ id: 'accounts', name: 'الحسابات والإدارة' }] : [])]
  const [selected, setSelected] = useState('')
  const tab = tabs.some(item => item.id === selected) ? selected : tabs[0]?.id
  return <div className="page-container treasury-page subtreasury"><div className="page-header st-row"><div><h1 className="page-header-title"><Landmark aria-hidden="true" size={24} /> الخزائن والإغلاق اليومي</h1><p>حسابات مستقلة · تسليم موثق · استلام مؤكد من المسؤول</p></div><Badge variant={config.enabled ? 'success' : 'neutral'}>{config.enabled ? 'إدارة الخزائن مفعلة' : 'إعداد قبل التفعيل'}</Badge></div>
    {!config.enabled && <Alert variant="info">إدارة الخزائن الفرعية غير مفعلة بعد. جهّز الحسابات والإسناد ثم حدد حساب الاستلام. العدّ لا ينشئ رصيدًا.</Alert>}
    <nav className="st-tabs" aria-label="أقسام الخزينة">{tabs.map(item => <Button key={item.id} variant={tab === item.id ? 'primary' : 'secondary'} aria-pressed={tab === item.id} onClick={() => setSelected(item.id)}>{item.name}</Button>)}</nav>
    {tab === 'own' && <OwnWorkspace />}
    {tab === 'handovers' && <HandoverWorkspace />}
    {tab === 'accounts' && <TreasuryAdministration config={config} refreshConfig={refreshConfig} />}
    {!tabs.length && <EmptyState icon={Landmark} title="تحتاج صلاحية عرض الحساب أو التسليمات لاستخدام هذه الشاشة." />}
  </div>
}
