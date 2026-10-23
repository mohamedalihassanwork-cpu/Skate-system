import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { pool } from '../../db/connection.js'
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js'

// One adapter for existing raw mysql2 and Drizzle transactions; never opens a second connection.
export type FinanceTx = any
export async function query(tx: FinanceTx, statement: string, params: any[] = []): Promise<any> {
  if (typeof tx.query === 'function') return (await tx.query(statement, params))[0]
  const parts = statement.split('?')
  if (parts.length !== params.length + 1) throw new Error('Financial SQL parameter mismatch')
  const chunks: any[] = []
  parts.forEach((part, i) => { chunks.push(sql.raw(part)); if(i < params.length) chunks.push(sql`${params[i]}`) })
  return (await tx.execute(sql.join(chunks, sql.raw(''))))[0]
}
export const MAX_MONEY = 999999999999n
export function cents(value: unknown, signed = false): bigint {
  const s = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof s !== 'string' || !(signed ? /^-?\d{1,10}(?:\.\d{1,2})?$/ : /^\d{1,10}(?:\.\d{1,2})?$/).test(s)) throw new ValidationError('المبلغ يجب أن يكون رقماً صالحاً بحد أقصى منزلتين عشريتين')
  const neg = s.startsWith('-'), [whole, fraction = ''] = (neg ? s.slice(1) : s).split('.')
  const n = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  if(n > MAX_MONEY) throw new ValidationError('المبلغ يتجاوز الحد المسموح')
  return neg ? -n : n
}
export function money(n: bigint): string {
  if(n > MAX_MONEY || n < -MAX_MONEY) throw new BusinessRuleError('الرصيد يتجاوز السعة المالية المسموحة','BALANCE_OVERFLOW')
  const a = n < 0n ? -n : n
  return `${n < 0n ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2,'0')}`
}
export function positiveId(value: unknown): number {
  if(!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new ValidationError('المعرف غير صالح')
  return Number(value)
}
export function reasonText(value: unknown, required = true): string {
  if(value === undefined && !required) return ''
  if(typeof value !== 'string' || value.trim().length > 1000 || (required && !value.trim())) throw new ValidationError('يرجى إدخال سبب واضح (حتى 1000 حرف)')
  return value.trim()
}
export async function configuration(tx: FinanceTx, lock = false): Promise<{enabled:boolean;mainAccountId:number|null}> {
  const rows = await query(tx,'SELECT enabled,main_account_id FROM treasury_configuration WHERE id=1'+(lock?' LOCK IN SHARE MODE':''))
  if(!rows.length) throw new BusinessRuleError('إعداد الخزينة غير مكتمل','TREASURY_CONFIGURATION_MISSING')
  return {enabled:!!rows[0].enabled,mainAccountId:rows[0].main_account_id}
}
export async function transaction<T>(work:(tx:FinanceTx)=>Promise<T>):Promise<T> {
  for(let attempt=0; ;attempt++) {
    const tx=await pool.getConnection()
    try { await tx.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'); await tx.beginTransaction(); const result=await work(tx); await tx.commit(); return result }
    catch(e:any) { await tx.rollback(); if(attempt<2 && (e.errno===1213 || e.errno===1205)) continue; throw e }
    finally { tx.release() }
  }
}
/** A single MVCC snapshot keeps displayed balances, states and history mutually consistent. */
export async function readSnapshot<T>(work:(tx:FinanceTx)=>Promise<T>):Promise<T> {
  const tx=await pool.getConnection()
  try {
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await tx.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY')
    const result=await work(tx)
    await tx.commit()
    return result
  } catch(error) { await tx.rollback(); throw error }
  finally { tx.release() }
}
export async function strictAudit(tx:FinanceTx, p:{userId:number;action:string;entityType:string;entityId:string;oldValue?:unknown;newValue?:unknown}) {
  await query(tx,'INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_value,new_value,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP())',
    [p.userId,p.action,p.entityType,p.entityId,p.oldValue===undefined?null:JSON.stringify(p.oldValue),p.newValue===undefined?null:JSON.stringify(p.newValue)])
}
function canonical(v:any):any { if(Array.isArray(v)) return v.map(canonical); if(v && typeof v==='object') return Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])); return v }
export async function withFinancialOperation<T>(tx:FinanceTx, actorId:number, scope:string, key:string|undefined, payload:unknown, work:()=>Promise<T>):Promise<T> {
  const config=await configuration(tx,true)
  if(!key) { if(config.enabled || scope.startsWith('treasury.')) throw new ValidationError('معرف العملية مطلوب لمنع تكرار الحركة'); return work() }
  if(typeof key!=='string' || !/^[A-Za-z0-9:_-]{8,100}$/.test(key)) throw new ValidationError('معرف العملية غير صالح')
  // Lock actor before the operation FK takes a shared user lock. Concurrent retries
  // otherwise deadlock while both upgrade that FK lock in the session guard.
  await query(tx,'SELECT id FROM users WHERE id=? FOR UPDATE',[actorId])
  const hash=createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex')
  await query(tx,'INSERT INTO financial_operations(actor_id,scope,operation_key,request_hash) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE id=id',[actorId,scope,key,hash])
  const [row]=await query(tx,'SELECT id,request_hash,result FROM financial_operations WHERE actor_id=? AND scope=? AND operation_key=? FOR UPDATE',[actorId,scope,key])
  if(row.request_hash!==hash) throw new ConflictError('معرف العملية مستخدم ببيانات مختلفة')
  if(row.result!==null) return typeof row.result==='string'?JSON.parse(row.result):row.result
  const result=await work()
  await query(tx,'UPDATE financial_operations SET result=? WHERE id=?',[JSON.stringify(result ?? null),row.id])
  return result
}
export interface CashierSession { id:number;treasuryAccountId:number|null;assignmentId:number|null;managed:boolean }
export function lockCashierSession(tx:FinanceTx, actorId:number, required?:true):Promise<CashierSession>
export function lockCashierSession(tx:FinanceTx, actorId:number, required:false):Promise<CashierSession|null>
export async function lockCashierSession(tx:FinanceTx, actorId:number, required=true):Promise<CashierSession|null> {
  const config=await configuration(tx,true)
  const [actor]=await query(tx,'SELECT id,is_active FROM users WHERE id=? FOR UPDATE',[actorId])
  if(!actor?.is_active) throw new ForbiddenError('حساب المستخدم غير نشط')
  const rows=await query(tx,"SELECT * FROM cashier_shifts WHERE cashier_id=? AND status='active' FOR UPDATE",[actorId])
  if(rows.length>1) throw new ConflictError('توجد ورديات نشطة متعارضة؛ يلزم مراجعتها')
  if(!rows.length) { if(required) throw new BusinessRuleError('العملية تتطلب وردية نشطة','NO_ACTIVE_SHIFT'); return null }
  const s=rows[0]
  if(config.enabled && !s.treasury_account_id) throw new BusinessRuleError('يجب إغلاق الوردية القديمة قبل استخدام الخزينة الفرعية','LEGACY_SHIFT')
  if(s.treasury_account_id) {
    const [a]=await query(tx,'SELECT * FROM treasury_assignments WHERE id=? AND cashier_id=? FOR UPDATE',[s.assignment_id,actorId])
    if(!a?.is_active || a.account_id!==s.treasury_account_id) throw new ForbiddenError('تعيين الخزينة غير صالح')
  }
  return {id:s.id,treasuryAccountId:s.treasury_account_id,assignmentId:s.assignment_id,managed:!!s.treasury_account_id}
}
export async function resolvePaymentAccount(tx:FinanceTx, session:CashierSession|null, mappedAccountId:number, actorId:number):Promise<number> {
  const [account]=await query(tx,'SELECT id,is_cash_drawer FROM treasury_accounts WHERE id=?',[mappedAccountId])
  if(!account) throw new NotFoundError('حساب الخزينة غير موجود')
  if(session?.managed && account.is_cash_drawer) return session.treasuryAccountId!
  if(!session && account.is_cash_drawer && (await configuration(tx,true)).enabled) throw new BusinessRuleError('الدفع النقدي يتطلب وردية وخزينة معينة','NO_ACTIVE_SHIFT')
  return mappedAccountId
}
export async function lockTreasuryAccounts(tx:FinanceTx, ids:number[]) {
  for(const id of [...new Set(ids)].sort((a,b)=>a-b)) {
    const rows=await query(tx,'SELECT id FROM treasury_accounts WHERE id=? FOR UPDATE',[id])
    if(!rows.length) throw new NotFoundError('حساب الخزينة غير موجود')
  }
}
export async function ledgerBalance(tx:FinanceTx, accountId:number, lock=false):Promise<bigint> {
  const rows=await query(tx,'SELECT amount,type FROM treasury_movements WHERE treasury_account_id=?'+(lock?' FOR UPDATE':''),[accountId])
  return rows.reduce((n:bigint,r:any)=>n+(r.type==='in'?1n:-1n)*cents(String(r.amount)),0n)
}
export async function checkedBalance(tx:FinanceTx, accountId:number):Promise<bigint> {
  const [account]=await query(tx,'SELECT balance,is_active FROM treasury_accounts WHERE id=? FOR UPDATE',[accountId])
  if(!account) throw new NotFoundError('حساب الخزينة غير موجود')
  const ledger=await ledgerBalance(tx,accountId,true)
  if(ledger!==cents(String(account.balance),true)) throw new BusinessRuleError('يوجد اختلاف بين الرصيد المسجل ودفتر الحركات؛ يلزم مراجعة البيانات','LEDGER_DRIFT')
  return ledger
}
export async function postTreasuryMovement(tx:FinanceTx, p:{accountId:number;amount:string|number;type:'in'|'out';referenceType:string;referenceId:number;cashierId:number;shiftId?:number|null;notes?:string;operationKey?:string;transferId?:number|null;transferLeg?:'in'|'out'|null;allowClosed?:boolean;requireFunds?:boolean}) {
  const amount=cents(p.amount)
  if(amount<=0n) throw new ValidationError('مبلغ الحركة يجب أن يكون أكبر من صفر')
  const [account]=await query(tx,'SELECT * FROM treasury_accounts WHERE id=? FOR UPDATE',[p.accountId])
  if(!account) throw new NotFoundError('حساب الخزينة غير موجود')
  const [assignment]=await query(tx,'SELECT * FROM treasury_assignments WHERE account_id=?',[p.accountId])
  let balance=cents(String(account.balance),true)
  if(assignment || p.requireFunds) {
    if(!account.is_active || (assignment && !assignment.is_active)) throw new BusinessRuleError('الخزينة غير نشطة','INACTIVE_TREASURY')
    balance=await checkedBalance(tx,p.accountId)
    if(assignment && !p.allowClosed) {
      const [shift]=await query(tx,"SELECT id FROM cashier_shifts WHERE id=? AND cashier_id=? AND treasury_account_id=? AND status='active' FOR UPDATE",[p.shiftId??0,p.cashierId,p.accountId])
      if(!shift || assignment.cashier_id!==p.cashierId) throw new ForbiddenError('لا يمكنك استخدام خزينة أو وردية أخرى')
    }
  }
  const next=balance+(p.type==='in'?amount:-amount)
  if((assignment || p.requireFunds) && next<0n) throw new BusinessRuleError('الرصيد المسجل غير كافٍ','INSUFFICIENT_TREASURY_FUNDS')
  money(next)
  await query(tx,'INSERT INTO treasury_movements(treasury_account_id,amount,type,reference_type,reference_id,cashier_id,shift_id,notes,transfer_id,transfer_leg,cash_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[p.accountId,money(amount),p.type,p.referenceType,p.referenceId,p.cashierId,p.shiftId??null,p.notes??null,p.transferId??null,p.transferLeg??null,!!account.is_cash_drawer])
  await query(tx,'UPDATE treasury_accounts SET balance=balance+?,updated_at=UTC_TIMESTAMP() WHERE id=?',[money(p.type==='in'?amount:-amount),p.accountId])
}
