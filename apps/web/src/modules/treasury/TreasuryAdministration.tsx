import { useCallback, useState } from 'react'
import { Alert, Badge, Button, Card, CheckboxField, EmptyState, Input, Pagination, Select } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { subTreasuryApi, type Funding, type ManagedAccount, type SetupOptions, type TreasuryConfig } from './treasury.api'
import { ActionForm, Money, MoneyInput, Movements, ResourceState } from './subtreasury.ui'
import { useResource, useTreasuryAction } from './subtreasury.state'

function AccountHistory({ account }: { account: ManagedAccount }) {
  const [page, setPage] = useState(1)
  const loader = useCallback(() => subTreasuryApi.movements(account.id, page), [account.id, page])
  const state = useResource(loader)
  return <Card as="section"><h2>سجل {account.nameAr}</h2><ResourceState {...state} retry={() => void state.refresh()} />
    {state.data && <><Movements rows={state.data.data} /><Pagination currentPage={page} totalPages={state.data.meta.totalPages} onPageChange={setPage} /></>}
  </Card>
}
function AccountList({ config }: { config: TreasuryConfig }) {
  const state = useResource(subTreasuryApi.accounts), [selected, setSelected] = useState<ManagedAccount | null>(null)
  return <><ResourceState {...state} retry={() => void state.refresh()} />{state.data && <Card as="section"><div className="st-row"><h2>أرصدة الحسابات المستقلة</h2><Button variant="secondary" disabled={state.loading} onClick={() => void state.refresh()}>تحديث الأرصدة</Button></div><p className="st-secondary">لكل حساب سجل مستقل. حساب الاستلام لا يتضمن أرصدة حسابات الكاشير.</p>
    <ul className="st-account-list">{state.data.map(account => <li key={account.id}><div className="st-row"><div><h3>{account.nameAr}</h3><p>{account.isCashDrawer ? 'نقدي' : 'إلكتروني / غير نقدي'}{account.cashierName ? ' · ' + account.cashierName : ''}</p></div><strong><Money value={account.balance} /></strong></div>
      <div className="st-row"><div className="st-actions">{account.id === config.mainAccountId && <Badge variant="info">حساب الاستلام</Badge>}{!account.isActive && <Badge variant="neutral">غير نشط</Badge>}</div><Button variant="secondary" onClick={() => setSelected(account)}>حركات {account.nameAr}</Button></div>
      {account.difference !== '0.00' && <Alert variant="warning">فرق الرصيد المحفوظ عن الحركات: <Money value={account.difference} />. يلزم مراجعة سلامة البيانات.</Alert>}
    </li>)}</ul>{!state.data.length && <EmptyState title="لا توجد حسابات مسجلة." />}
  </Card>}{selected && <AccountHistory key={selected.id} account={selected} />}</>
}
function SetupForms({ options, config, refresh }: { options: SetupOptions; config: TreasuryConfig; refresh: () => void }) {
  const { hasPermission, user } = useAuth()
  const [name, setName] = useState(''), [nameAr, setNameAr] = useState(''), [cash, setCash] = useState(true)
  const [cashier, setCashier] = useState(''), [account, setAccount] = useState(''), [main, setMain] = useState('')
  const [fundCashier, setFundCashier] = useState(''), [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [activateAcknowledged, setActivateAcknowledged] = useState(false)
  const createAction = useTreasuryAction(refresh), assignAction = useTreasuryAction(refresh), activateAction = useTreasuryAction(refresh), fundAction = useTreasuryAction(refresh)
  const cashierOptions = options.cashiers.map(person => ({ value: String(person.id), label: person.name }))
  const accountOptions = options.accounts.filter(item => item.isActive && item.isCashDrawer).map(item => ({ value: String(item.id), label: item.nameAr }))
  return <div className="st-stack">
    {hasPermission('treasury.assign') && <Card as="section"><h2>إدارة الحسابات والإسناد</h2><div className="st-columns">
      <ActionForm action={createAction} onSubmit={async () => {
        const payload = { name, nameAr, isCashDrawer: cash }
        if (await createAction.run('account-create', payload, key => subTreasuryApi.createAccount({ ...payload, operationKey: key }))) { setName(''); setNameAr('') }
      }}><h3>حساب مستقل جديد</h3><Input id="st-account-name-ar" label="اسم الحساب بالعربية" value={nameAr} onChange={event => setNameAr(event.target.value)} required maxLength={100} /><Input id="st-account-name" label="اسم الحساب التعريفي" value={name} onChange={event => setName(event.target.value)} required maxLength={100} /><CheckboxField id="st-account-cash" label="حساب نقدي" checked={cash} onChange={setCash} helperText="ألغِ الاختيار للحساب الإلكتروني أو غير النقدي." /><p className="st-secondary">الحساب الجديد يبدأ برصيد مسجل صفر. إنشاء الحساب لا يضيف أموالًا.</p><Button type="submit" loading={createAction.busy}>إنشاء الحساب</Button></ActionForm>
      <ActionForm action={assignAction} onSubmit={async () => {
        const payload = { cashierId: Number(cashier), accountId: Number(account) }
        if (await assignAction.run('assign', payload, key => subTreasuryApi.assign({ ...payload, operationKey: key }))) { setCashier(''); setAccount('') }
      }}><h3>إسناد حساب للكاشير</h3><Select id="st-assign-cashier" label="الكاشير" value={cashier} onChange={event => setCashier(event.target.value)} options={cashierOptions} placeholder="اختر الكاشير" required /><Select id="st-assign-account" label="الحساب النقدي" value={account} onChange={event => setAccount(event.target.value)} options={accountOptions.filter(item => Number(item.value) !== config.mainAccountId)} placeholder="اختر الحساب" required /><p className="st-secondary">حساب نقدي غير مسند ورصيده صفر. الإسناد دائم لهذا الكاشير ويحفظ تاريخه.</p><Button type="submit" loading={assignAction.busy}>حفظ الإسناد</Button></ActionForm>
    </div></Card>}
    {!config.enabled && hasPermission('treasury.assign') && <Card as="section"><h2>تفعيل إدارة الخزائن</h2><ActionForm action={activateAction} onSubmit={async () => {
      if (!activateAcknowledged) return
      const payload = { mainAccountId: Number(main) }
      await activateAction.run('activate', payload, key => subTreasuryApi.activate({ ...payload, operationKey: key }))
    }}>
      <Select id="st-main-account" label="الحساب النقدي الذي يستقبل التسليمات" value={main} onChange={event => setMain(event.target.value)} options={accountOptions} placeholder="اختر حساب الاستلام" required />
      <Alert variant="warning">أغلق الورديات القديمة وراجع مطابقة الأرصدة والحركات قبل التفعيل. التفعيل يبدأ دورة جديدة دون إعادة توزيع الأموال أو إنشاء تسليمات تاريخية.</Alert>
      <CheckboxField id="st-activate-ack" label="راجعت الإعداد والإسناد وأوافق على بدء دورة الخزائن الجديدة" checked={activateAcknowledged} onChange={setActivateAcknowledged} />
      <Button type="submit" loading={activateAction.busy} disabled={!activateAcknowledged}>تفعيل إدارة الخزائن</Button>
    </ActionForm></Card>}
    {config.enabled && hasPermission('treasury.fund') && <Card as="section"><h2>تصريح تمويل / تغذية حساب كاشير</h2><ActionForm action={fundAction} onSubmit={async () => {
      const payload = { cashierId: Number(fundCashier), amount, reason }
      if (await fundAction.run('funding-authorize', payload, key => subTreasuryApi.authorizeFunding({ ...payload, operationKey: key }))) { setAmount(''); setReason('') }
    }}><div className="st-form-grid"><Select id="st-fund-cashier" label="الكاشير المستلم" value={fundCashier} onChange={event => setFundCashier(event.target.value)} options={cashierOptions.filter(item => Number(item.value) !== user?.id)} placeholder="اختر كاشيرًا آخر" required /><MoneyInput id="st-fund-amount" label="مبلغ التمويل" value={amount} onChange={setAmount} /></div><Input id="st-fund-reason" label="سبب التمويل" value={reason} onChange={event => setReason(event.target.value)} required maxLength={1000} /><p className="st-secondary">التمويل من حساب الاستلام المحدد. التصريح لا ينقل أو يحجز أموالًا؛ يتم التحويل عند إقرار الكاشير المستلم.</p><Button type="submit" loading={fundAction.busy}>إرسال تصريح التمويل</Button></ActionForm></Card>}
  </div>
}
function SetupPanel({ config, refresh }: { config: TreasuryConfig; refresh: () => void }) {
  const state = useResource(subTreasuryApi.setup)
  return <><ResourceState {...state} retry={() => void state.refresh()} />{state.data && <SetupForms options={state.data} config={config} refresh={() => { void state.refresh(); refresh() }} />}</>
}
export function TreasuryAdministration({ config, refreshConfig }: { config: TreasuryConfig; refreshConfig: () => void }) {
  const { hasPermission } = useAuth(), [revision, setRevision] = useState(0)
  return <div className="st-stack">
    {config.enabled && hasPermission('treasury.fund') && <FundingManager key={revision} revision={revision} />}
    {hasPermission('treasury.view') && <AccountList key={revision} config={config} />}
    {(hasPermission('treasury.assign') || hasPermission('treasury.fund')) && <SetupPanel config={config} refresh={() => { setRevision(value => value + 1); refreshConfig() }} />}
  </div>
}

function FundingManager({ revision }: { revision: number }) {
  const state = useResource(subTreasuryApi.funding)
  return <Card as="section"><div className="st-row"><h2>تصاريح التمويل</h2><Button variant="secondary" onClick={() => void state.refresh()} disabled={state.loading}>تحديث التمويل</Button></div><ResourceState {...state} retry={() => void state.refresh()} />
    {state.data && (state.data.length ? state.data.map(funding => <FundingCancellation key={funding.id + ':' + funding.status + ':' + revision} funding={funding} refresh={() => void state.refresh()} />) : <EmptyState title="لا توجد تصاريح تمويل." />)}
  </Card>
}
function FundingCancellation({ funding, refresh }: { funding: Funding; refresh: () => void }) {
  const action = useTreasuryAction(refresh), [reason, setReason] = useState('')
  return <article className="st-list-item"><div className="st-row"><h3>{funding.cashierName} · تصريح #{funding.id}</h3><Badge variant={funding.status === 'pending' ? 'warning' : 'neutral'}>{funding.status === 'pending' ? 'بانتظار إقرار الكاشير' : funding.status === 'accepted' ? 'تم التحويل بإقرار الكاشير' : 'ملغى'}</Badge></div><p><Money value={funding.amount} /> · {funding.reason}</p>
    {funding.status === 'pending' && <ActionForm action={action} onSubmit={async () => {
      await action.run('funding-cancel-' + funding.id, { reason }, key => subTreasuryApi.fundingAction(funding.id, 'cancel', { reason, operationKey: key }))
    }}><Input id={'st-cancel-fund-' + funding.id} label="سبب إلغاء تصريح التمويل" value={reason} onChange={event => setReason(event.target.value)} required maxLength={1000} /><Button type="submit" variant="danger" loading={action.busy}>إلغاء تصريح #{funding.id}</Button></ActionForm>}
  </article>
}
