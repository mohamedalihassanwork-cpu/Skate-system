import { pool } from '../../db/connection.js'
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js'
import { cents, money, query, transaction, readSnapshot, configuration, withFinancialOperation, strictAudit, checkedBalance, ledgerBalance, lockTreasuryAccounts, positiveId, reasonText, type FinanceTx } from './treasury-posting.js'
import { postTreasuryMovement } from './treasury-posting.js'
export interface TreasuryActor { id:number;permissions:string[] }
export function permit(actor:TreasuryActor,...keys:string[]) { if(!keys.some(k=>actor.permissions.includes(k))) throw new ForbiddenError() }
function iso(v:any) { return v ? new Date(v).toISOString() : null }
export async function getConfig() { return configuration(pool) }
async function enabled(tx:FinanceTx) { const c=await configuration(tx,true); if(!c.enabled || !c.mainAccountId) throw new BusinessRuleError('نظام الخزائن الفرعية غير مفعل','TREASURY_NOT_ENABLED'); return c }
async function lockOwner(tx:FinanceTx,cashierId:number) {
  const [u]=await query(tx,'SELECT id,is_active FROM users WHERE id=? FOR UPDATE',[cashierId]); if(!u?.is_active) throw new BusinessRuleError('الكاشير غير نشط','INACTIVE_CASHIER')
  const [a]=await query(tx,'SELECT * FROM treasury_assignments WHERE cashier_id=? FOR UPDATE',[cashierId]); if(!a?.is_active) throw new BusinessRuleError('لا توجد خزينة معينة للكاشير','NO_TREASURY_ASSIGNMENT'); return a
}
export async function unsettled(tx:FinanceTx,accountId:number) {
  return query(tx,"SELECT s.id FROM cashier_shifts s LEFT JOIN treasury_settlements x ON x.shift_id=s.id WHERE s.treasury_account_id=? AND s.status='closed' AND x.id IS NULL FOR UPDATE",[accountId])
}
export async function sessionAmounts(tx:FinanceTx,s:any,lock=false) {
  const rows=await query(tx,'SELECT amount,type FROM treasury_movements WHERE shift_id=? AND treasury_account_id=?'+(lock?' FOR UPDATE':''),[s.id,s.treasury_account_id])
  const net=rows.reduce((n:bigint,r:any)=>n+(r.type==='in'?1n:-1n)*cents(String(r.amount)),0n)
  return {expectedBalance:money(cents(String(s.opening_balance))+net),expectedLedgerBalance:money(cents(String(s.opening_ledger_balance),true)+net)}
}
export async function accountDTO(tx:FinanceTx,row:any) {
  const balance=await ledgerBalance(tx,row.id)
  return {id:row.id,name:row.name,nameAr:row.name_ar,isCashDrawer:!!row.is_cash_drawer,isActive:!!row.is_active,accountRole:row.account_role,balance:money(balance),storedBalance:String(row.balance),difference:money(cents(String(row.balance),true)-balance),cashierId:row.cashier_id??null,cashierName:row.cashier_name??null}
}
export async function listAccounts(actor:TreasuryActor) {
  permit(actor,'treasury.view')
  return readSnapshot(async tx=> {
    const rows=await query(tx,'SELECT a.*,d.cashier_id,u.name cashier_name FROM treasury_accounts a LEFT JOIN treasury_assignments d ON d.account_id=a.id LEFT JOIN users u ON u.id=d.cashier_id ORDER BY a.id')
    return Promise.all(rows.map((r:any)=>accountDTO(tx,r)))
  })
}
export async function setupOptions(actor:TreasuryActor) {
  permit(actor,'treasury.assign','treasury.fund')
  const accounts=await query(pool,'SELECT id,name_ar nameAr,is_cash_drawer isCashDrawer,is_active isActive,account_role accountRole FROM treasury_accounts ORDER BY id')
  const cashiers=await query(pool,'SELECT id,name FROM users WHERE is_active=1 ORDER BY name')
  return {accounts:accounts.map((a:any)=>({...a,isCashDrawer:!!a.isCashDrawer,isActive:!!a.isActive})),cashiers}
}
export async function createAccount(actor:TreasuryActor,input:any) {
  permit(actor,'treasury.assign')
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>255||typeof input.nameAr!=='string'||!input.nameAr.trim()||input.nameAr.length>255||typeof input.isCashDrawer!=='boolean') throw new ValidationError('بيانات الحساب غير صالحة')
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.account',input.operationKey,{name:input.name,nameAr:input.nameAr,isCashDrawer:input.isCashDrawer},async()=>{
    const r=await query(tx,'INSERT INTO treasury_accounts(name,name_ar,is_cash_drawer,account_role) VALUES(?,?,?,?)',[input.name.trim(),input.nameAr.trim(),input.isCashDrawer,input.isCashDrawer?'cash':'electronic'])
    await strictAudit(tx,{userId:actor.id,action:'CREATE_TREASURY_ACCOUNT',entityType:'TREASURY_ACCOUNT',entityId:String(r.insertId),newValue:{name:input.name,nameAr:input.nameAr,isCashDrawer:input.isCashDrawer}})
    return {id:r.insertId}
  }))
}
export async function assignDrawer(actor:TreasuryActor,input:any) {
  permit(actor,'treasury.assign');const cashierId=positiveId(input.cashierId),accountId=positiveId(input.accountId)
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.assign',input.operationKey,{cashierId,accountId},async()=>{
    const c=await configuration(tx,true)
    await query(tx,'SELECT id FROM users WHERE id=? FOR UPDATE',[cashierId])
    const [u]=await query(tx,'SELECT is_active FROM users WHERE id=?',[cashierId]);if(!u?.is_active) throw new ValidationError('الكاشير غير نشط')
    if(c.mainAccountId===accountId) throw new BusinessRuleError('حساب الاستلام الرئيسي لا يخصص لكاشير')
    if((await query(tx,'SELECT id FROM treasury_assignments WHERE cashier_id=? OR account_id=? FOR UPDATE',[cashierId,accountId])).length) throw new ConflictError('المستخدم أو الحساب معين بالفعل؛ التعيين التاريخي لا يعاد استخدامه')
    const [a]=await query(tx,'SELECT * FROM treasury_accounts WHERE id=? FOR UPDATE',[accountId]);if(!a?.is_active||!a.is_cash_drawer) throw new ValidationError('يجب اختيار حساب نقدي نشط')
    if((await query(tx,'SELECT id FROM payment_methods WHERE treasury_account_id=? LIMIT 1',[accountId])).length) throw new BusinessRuleError('أنشئ حساباً نقدياً مستقلاً لا يرتبط بوسيلة دفع مشتركة')
    if((await query(tx,'SELECT id FROM treasury_movements WHERE treasury_account_id=? LIMIT 1',[accountId])).length || await checkedBalance(tx,accountId)!==0n) throw new BusinessRuleError('تعيين الخزينة يتطلب حساباً جديداً بلا حركات ورصيد صفر')
    const r=await query(tx,'INSERT INTO treasury_assignments(account_id,cashier_id,assigned_by) VALUES(?,?,?)',[accountId,cashierId,actor.id])
    await query(tx,"UPDATE treasury_accounts SET account_role='cashier_cash' WHERE id=?",[accountId])
    await strictAudit(tx,{userId:actor.id,action:'ASSIGN_TREASURY',entityType:'TREASURY_ASSIGNMENT',entityId:String(r.insertId),newValue:{accountId,cashierId}})
    return {id:r.insertId,accountId,cashierId}
  }))
}
export async function activate(actor:TreasuryActor,input:any) {
  permit(actor,'treasury.assign');const accountId=positiveId(input.mainAccountId)
  // Exclusive config lock precedes all other locks; ongoing financial transactions use shared lock.
  return transaction(async tx=>{
    const [old]=await query(tx,'SELECT * FROM treasury_configuration WHERE id=1 FOR UPDATE')
    if(old.enabled) { if(old.main_account_id===accountId) return {enabled:true,mainAccountId:accountId}; throw new ConflictError('لا يمكن تغيير حساب الاستلام بعد التفعيل') }
    return withFinancialOperation(tx,actor.id,'treasury.activate',input.operationKey,{mainAccountId:accountId},async()=>{
      if((await query(tx,"SELECT id FROM cashier_shifts WHERE status='active' FOR UPDATE")).length) throw new ConflictError('أغلق جميع الورديات القديمة قبل التفعيل')
      const [a]=await query(tx,'SELECT * FROM treasury_accounts WHERE id=? FOR UPDATE',[accountId]);if(!a?.is_active||!a.is_cash_drawer) throw new ValidationError('اختر حساب استلام نقدي نشط')
      if((await query(tx,'SELECT id FROM treasury_assignments WHERE account_id=?',[accountId])).length) throw new ValidationError('حساب الاستلام لا يمكن أن يكون خزينة كاشير')
      const accounts=await query(tx,'SELECT id FROM treasury_accounts ORDER BY id FOR UPDATE');for(const a of accounts) await checkedBalance(tx,a.id)
      await query(tx,'UPDATE treasury_configuration SET enabled=1,main_account_id=?,activated_by=?,activated_at=UTC_TIMESTAMP() WHERE id=1',[accountId,actor.id])
      await query(tx,"UPDATE treasury_accounts SET account_role='main_cash' WHERE id=?",[accountId])
      await strictAudit(tx,{userId:actor.id,action:'ACTIVATE_SUBTREASURIES',entityType:'TREASURY_CONFIGURATION',entityId:'1',newValue:{mainAccountId:accountId}})
      return {enabled:true,mainAccountId:accountId}
    })
  })
}
function fundingDTO(r:any) { return {id:r.id,cashierId:r.cashier_id,cashierName:r.cashier_name,amount:String(r.amount),status:r.status,reason:r.reason,createdBy:r.created_by,createdAt:iso(r.created_at),acceptedAt:iso(r.accepted_at)} }
export async function authorizeFunding(actor:TreasuryActor,input:any) {
  permit(actor,'treasury.fund');const cashierId=positiveId(input.cashierId),amount=money(cents(input.amount)),reason=reasonText(input.reason)
  if(cents(amount)<=0n) throw new ValidationError('مبلغ التمويل يجب أن يكون أكبر من صفر')
  if(actor.id===cashierId) throw new ForbiddenError('لا يمكنك اعتماد واستلام تمويل لنفسك')
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.funding',input.operationKey,{cashierId,amount,reason},async()=>{
    const c=await enabled(tx),a=await lockOwner(tx,cashierId)
    if((await unsettled(tx,a.account_id)).length) throw new ConflictError('الخزينة تنتظر تسوية التسليم')
    const r=await query(tx,'INSERT INTO treasury_funding(assignment_id,cashier_id,source_account_id,destination_account_id,amount,reason,created_by) VALUES(?,?,?,?,?,?,?)',[a.id,cashierId,c.mainAccountId,a.account_id,amount,reason,actor.id])
    await strictAudit(tx,{userId:actor.id,action:'AUTHORIZE_TREASURY_FUNDING',entityType:'TREASURY_FUNDING',entityId:String(r.insertId),newValue:{cashierId,amount,reason}})
    return {id:r.insertId,status:'pending'}
  }))
}
async function transfer(tx:FinanceTx,p:{source:number;destination:number;amount:string;actorId:number;shiftId:number|null;kind:'funding'|'handover';fundingId?:number;handoverId?:number}) {
  if(p.source===p.destination) throw new ValidationError('حسابا التحويل يجب أن يكونا مستقلين')
  await lockTreasuryAccounts(tx,[p.source,p.destination])
  await checkedBalance(tx,p.source);await checkedBalance(tx,p.destination)
  const r=await query(tx,'INSERT INTO treasury_transfers(source_account_id,destination_account_id,amount,kind,handover_id,funding_id,confirmed_by) VALUES(?,?,?,?,?,?,?)',[p.source,p.destination,p.amount,p.kind,p.handoverId??null,p.fundingId??null,p.actorId])
  for(const leg of ['out','in'] as const) await postTreasuryMovement(tx,{accountId:leg==='out'?p.source:p.destination,amount:p.amount,type:leg,referenceType:'treasury_transfer',referenceId:r.insertId,cashierId:p.actorId,shiftId:p.shiftId,transferId:r.insertId,transferLeg:leg,allowClosed:true,requireFunds:true,notes:p.kind==='funding'?'تمويل خزينة مع إقرار الاستلام':'تحويل تسليم مؤكد'})
  await strictAudit(tx,{userId:p.actorId,action:'COMPLETE_TREASURY_TRANSFER',entityType:'TREASURY_TRANSFER',entityId:String(r.insertId),newValue:p})
  return r.insertId as number
}
export async function acceptFunding(actor:TreasuryActor,id:number,input:any) {
  permit(actor,'shifts.manage','treasury.view_own')
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.funding.accept',input.operationKey,{id},async()=>{
    await enabled(tx);const a=await lockOwner(tx,actor.id)
    const active=await query(tx,"SELECT * FROM cashier_shifts WHERE cashier_id=? AND status='active' FOR UPDATE",[actor.id]);if(active.length>1) throw new ConflictError('ورديات نشطة متعارضة')
    if((await unsettled(tx,a.account_id)).length) throw new ConflictError('تسليم الوردية السابقة لم يسو بعد')
    const [f]=await query(tx,'SELECT * FROM treasury_funding WHERE id=? FOR UPDATE',[id]);if(!f) throw new NotFoundError()
    if(f.cashier_id!==actor.id||f.created_by===actor.id||f.assignment_id!==a.id) throw new ForbiddenError('لا يمكنك استلام هذا التمويل')
    if(f.status!=='pending') throw new ConflictError('طلب التمويل لم يعد معلقاً')
    const transferId=await transfer(tx,{source:f.source_account_id,destination:f.destination_account_id,amount:String(f.amount),actorId:actor.id,shiftId:active[0]?.id??null,kind:'funding',fundingId:id})
    await query(tx,"UPDATE treasury_funding SET status='accepted',accepted_by=?,accepted_at=UTC_TIMESTAMP() WHERE id=?",[actor.id,id])
    await strictAudit(tx,{userId:actor.id,action:'ACCEPT_TREASURY_FUNDING',entityType:'TREASURY_FUNDING',entityId:String(id),newValue:{transferId,amount:String(f.amount)}})
    return {id,status:'accepted',transferId}
  }))
}
export async function cancelFunding(actor:TreasuryActor,id:number,input:any) {
  permit(actor,'treasury.fund');const reason=reasonText(input.reason)
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.funding.cancel',input.operationKey,{id,reason},async()=>{
    await enabled(tx);const [f]=await query(tx,'SELECT * FROM treasury_funding WHERE id=? FOR UPDATE',[id]);if(!f) throw new NotFoundError();if(f.status!=='pending') throw new ConflictError('طلب التمويل لم يعد معلقاً')
    await query(tx,"UPDATE treasury_funding SET status='cancelled',cancelled_by=?,cancelled_at=UTC_TIMESTAMP(),cancellation_reason=? WHERE id=?",[actor.id,reason,id])
    await strictAudit(tx,{userId:actor.id,action:'CANCEL_TREASURY_FUNDING',entityType:'TREASURY_FUNDING',entityId:String(id),newValue:{reason}});return {id,status:'cancelled'}
  }))
}
export function handoverDTO(r:any) {return {id:r.id,closingId:r.shift_id,shiftId:r.shift_id,attempt:r.attempt,replacesId:r.replaces_id,accountId:r.account_id,cashierId:r.cashier_id,cashierName:r.cashier_name,expectedBalance:String(r.expected_balance),expectedLedgerBalance:String(r.expected_ledger_balance),actualBalance:String(r.actual_balance),declaredAmount:String(r.declared_amount),difference:String(r.difference),settlementDifference:money(cents(String(r.declared_amount))-cents(String(r.expected_ledger_balance),true)),status:r.status,reason:r.reason,createdAt:iso(r.created_at),confirmedBy:['confirmed','zero_acknowledged'].includes(r.status)?r.reviewed_by:null,confirmedAt:['confirmed','zero_acknowledged'].includes(r.status)?iso(r.reviewed_at):null,reviewedBy:r.reviewed_by,reviewedAt:iso(r.reviewed_at),reviewReason:r.review_reason,receivedAmount:r.received_amount===null?null:String(r.received_amount)}}
function pagination(input:any) {const page=Math.max(1,Math.min(100000,Number(input.page)||1)),limit=Math.max(1,Math.min(100,Number(input.limit)||50));if(!Number.isInteger(page)||!Number.isInteger(limit))throw new ValidationError('ترقيم الصفحات غير صالح');return {page,limit,offset:(page-1)*limit}}
export async function listHandovers(actor:TreasuryActor,input:any={}) {
  return readSnapshot(async tx=>{
  permit(actor,'treasury.handovers.view','treasury.view_own','shifts.manage')
  const all=actor.permissions.includes('treasury.handovers.view'),p=pagination(input),where:string[]=[],params:any[]=[]
  if(!all){where.push('h.cashier_id=?');params.push(actor.id)}
  if(input.status){if(!['pending','rejected','confirmed','zero_acknowledged'].includes(input.status))throw new ValidationError('حالة التسليم غير صالحة');where.push('h.status=?');params.push(input.status)}
  const clause=where.length?' WHERE '+where.join(' AND '):''
  const rows=await query(tx,'SELECT h.*,u.name cashier_name FROM treasury_handovers h JOIN users u ON u.id=h.cashier_id'+clause+' ORDER BY h.id DESC LIMIT ? OFFSET ?',[...params,p.limit,p.offset])
  const [count]=await query(tx,'SELECT COUNT(*) total FROM treasury_handovers h'+clause,params)
  return {data:rows.map(handoverDTO),meta:{total:Number(count.total),page:p.page,limit:p.limit,totalPages:Math.ceil(Number(count.total)/p.limit)}}
  })
}
async function readableAccount(actor:TreasuryActor,accountId:number) {
  if(actor.permissions.includes('treasury.view'))return
  permit(actor,'treasury.view_own','shifts.manage')
  if(!(await query(pool,'SELECT id FROM treasury_assignments WHERE account_id=? AND cashier_id=?',[accountId,actor.id])).length) throw new ForbiddenError()
}
function movementDTO(r:any) {return {id:r.id,accountId:r.treasury_account_id,type:r.type,amount:String(r.amount),referenceType:r.reference_type,referenceId:r.reference_id,shiftId:r.shift_id,cashierName:r.cashier_name,notes:r.notes,createdAt:iso(r.created_at)}}
export async function movements(actor:TreasuryActor,accountId:number,input:any={}) {
  return readSnapshot(async tx=>{
  await readableAccount(actor,accountId);const p=pagination(input)
  const rows=await query(tx,'SELECT m.*,u.name cashier_name FROM treasury_movements m JOIN users u ON u.id=m.cashier_id WHERE m.treasury_account_id=? ORDER BY m.id DESC LIMIT ? OFFSET ?',[accountId,p.limit,p.offset])
  const [count]=await query(tx,'SELECT COUNT(*) total FROM treasury_movements WHERE treasury_account_id=?',[accountId])
  return {data:rows.map(movementDTO),meta:{total:Number(count.total),page:p.page,limit:p.limit,totalPages:Math.ceil(Number(count.total)/p.limit)}}
  })
}
export async function handoverDetail(actor:TreasuryActor,id:number) {
  return readSnapshot(async tx=>{
  permit(actor,'treasury.handovers.view','treasury.view_own','shifts.manage')
  const [h]=await query(tx,'SELECT h.*,u.name cashier_name FROM treasury_handovers h JOIN users u ON u.id=h.cashier_id WHERE h.id=?',[id]);if(!h)throw new NotFoundError()
  if(h.cashier_id!==actor.id&&!actor.permissions.includes('treasury.handovers.view'))throw new ForbiddenError()
  const [closing]=await query(tx,'SELECT * FROM cashier_shifts WHERE id=?',[h.shift_id])
  const attempts=await query(tx,'SELECT * FROM treasury_handovers WHERE shift_id=? ORDER BY attempt',[h.shift_id])
  const rows=await query(tx,'SELECT m.*,u.name cashier_name FROM treasury_movements m JOIN users u ON u.id=m.cashier_id WHERE m.shift_id=? ORDER BY m.id',[h.shift_id])
  const [settlement]=await query(tx,'SELECT * FROM treasury_settlements WHERE shift_id=?',[h.shift_id])
  return {handover:handoverDTO(h),closing:{id:closing.id,openingBalance:String(closing.opening_balance),openingLedgerBalance:String(closing.opening_ledger_balance),expectedBalance:String(closing.expected_balance),expectedLedgerBalance:String(closing.expected_ledger_balance),actualBalance:String(closing.actual_balance),declaredAmount:String(closing.declared_amount),difference:String(closing.difference),openedAt:iso(closing.opened_at),closedAt:iso(closing.closed_at),closedBy:closing.closed_by,businessDate:closing.business_date},attempts:attempts.map(handoverDTO),movements:rows.map(movementDTO),settlement:settlement?{id:settlement.id,transferId:settlement.transfer_id,receivedAmount:String(settlement.received_amount),adjustmentAmount:String(settlement.adjustment_amount),confirmedBy:settlement.confirmed_by,varianceApprovedBy:settlement.variance_approved_by,reason:settlement.reason,createdAt:iso(settlement.created_at)}:null}
  })
}
async function lockHandover(tx:FinanceTx,id:number) {
  const [lookup]=await query(tx,'SELECT cashier_id,shift_id FROM treasury_handovers WHERE id=?',[id]);if(!lookup)throw new NotFoundError()
  // User -> shift -> attempt is shared by close, replacement, confirmation and funding.
  await query(tx,'SELECT id FROM users WHERE id=? FOR UPDATE',[lookup.cashier_id])
  await query(tx,'SELECT id FROM cashier_shifts WHERE id=? FOR UPDATE',[lookup.shift_id])
  const [h]=await query(tx,'SELECT * FROM treasury_handovers WHERE id=? FOR UPDATE',[id])
  const [last]=await query(tx,'SELECT id FROM treasury_handovers WHERE shift_id=? ORDER BY attempt DESC LIMIT 1 FOR UPDATE',[h.shift_id])
  if(last.id!==id) throw new ConflictError('يوجد إقرار تسليم أحدث')
  if((await query(tx,'SELECT id FROM treasury_settlements WHERE shift_id=? FOR UPDATE',[h.shift_id])).length)throw new ConflictError('التسليم مسوى بالفعل')
  return h
}
export async function confirmHandover(actor:TreasuryActor,id:number,input:any) {
  permit(actor,'treasury.handovers.confirm');const received=money(cents(input.receivedAmount)),reason=reasonText(input.reason,false)
  if(input.approveVariance!==undefined&&typeof input.approveVariance!=='boolean')throw new ValidationError('موافقة الفرق غير صالحة')
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.handover.confirm',input.operationKey,{id,received,reason,approveVariance:input.approveVariance===true},async()=>{
    const c=await enabled(tx),h=await lockHandover(tx,id)
    if(h.cashier_id===actor.id)throw new ForbiddenError('لا يمكنك تأكيد تسليم ورديتك')
    if(h.status!=='pending')throw new ConflictError('التسليم ليس في انتظار الاستلام')
    if(received!==String(h.declared_amount))throw new BusinessRuleError('المبلغ المستلم يختلف عن الإقرار؛ ارفض التسليم واطلب إقراراً جديداً','HANDOVER_AMOUNT_MISMATCH')
    const delta=cents(received)-cents(String(h.expected_ledger_balance),true)
    if(delta!==0n){permit(actor,'treasury.reconcile');if(input.approveVariance!==true)throw new ValidationError('اعتماد الفرق مطلوب صراحة');reasonText(reason)}
    await lockTreasuryAccounts(tx,[h.account_id,c.mainAccountId!])
    if(await checkedBalance(tx,h.account_id)!==cents(String(h.expected_ledger_balance),true))throw new BusinessRuleError('رصيد الخزينة تغير منذ الإغلاق؛ يلزم مراجعة البيانات','CLOSING_LEDGER_DRIFT')
    const r=await query(tx,'INSERT INTO treasury_settlements(shift_id,handover_id,received_amount,adjustment_amount,confirmed_by,variance_approved_by,reason) VALUES(?,?,?,?,?,?,?)',[h.shift_id,id,received,money(delta),actor.id,delta!==0n?actor.id:null,reason])
    if(delta!==0n) {
      await postTreasuryMovement(tx,{accountId:h.account_id,amount:money(delta<0n?-delta:delta),type:delta<0n?'out':'in',referenceType:'treasury_variance',referenceId:r.insertId,cashierId:actor.id,shiftId:h.shift_id,notes:reason,allowClosed:true,requireFunds:true})
      await strictAudit(tx,{userId:actor.id,action:'APPROVE_TREASURY_VARIANCE',entityType:'TREASURY_SETTLEMENT',entityId:String(r.insertId),newValue:{handoverId:id,adjustment:money(delta),reason,openingAndClosingCountsRetained:true}})
    }
    const transferId=cents(received)>0n?await transfer(tx,{source:h.account_id,destination:c.mainAccountId!,amount:received,actorId:actor.id,shiftId:h.shift_id,kind:'handover',handoverId:id}):null
    const status=transferId?'confirmed':'zero_acknowledged'
    await query(tx,'UPDATE treasury_settlements SET transfer_id=? WHERE id=?',[transferId,r.insertId])
    await query(tx,'UPDATE treasury_handovers SET status=?,received_amount=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP(),review_reason=? WHERE id=?',[status,received,actor.id,reason,id])
    await strictAudit(tx,{userId:actor.id,action:transferId?'CONFIRM_TREASURY_HANDOVER':'ACKNOWLEDGE_ZERO_HANDOVER',entityType:'TREASURY_HANDOVER',entityId:String(id),newValue:{receivedAmount:received,adjustment:money(delta),transferId,reason}})
    return {id,status,transferId,settlementId:r.insertId}
  }))
}
export async function rejectHandover(actor:TreasuryActor,id:number,input:any) {
  permit(actor,'treasury.handovers.confirm');const reason=reasonText(input.reason)
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.handover.reject',input.operationKey,{id,reason},async()=>{
    await enabled(tx);const h=await lockHandover(tx,id);if(h.cashier_id===actor.id)throw new ForbiddenError('لا يمكنك مراجعة تسليمك');if(h.status!=='pending')throw new ConflictError('التسليم ليس معلقاً')
    await query(tx,"UPDATE treasury_handovers SET status='rejected',reviewed_by=?,reviewed_at=UTC_TIMESTAMP(),review_reason=? WHERE id=?",[actor.id,reason,id])
    await strictAudit(tx,{userId:actor.id,action:'REJECT_TREASURY_HANDOVER',entityType:'TREASURY_HANDOVER',entityId:String(id),newValue:{reason}});return {id,status:'rejected'}
  }))
}
export async function replaceHandover(actor:TreasuryActor,id:number,input:any) {
  permit(actor,'shifts.manage');const amount=money(cents(input.declaredAmount)),reason=reasonText(input.reason)
  return transaction(tx=>withFinancialOperation(tx,actor.id,'treasury.handover.replace',input.operationKey,{id,amount,reason},async()=>{
    await enabled(tx);const h=await lockHandover(tx,id);if(h.cashier_id!==actor.id)throw new ForbiddenError();if(h.status!=='rejected')throw new ConflictError('يمكن استبدال الإقرار المرفوض فقط')
    const r=await query(tx,'INSERT INTO treasury_handovers(shift_id,attempt,replaces_id,account_id,cashier_id,expected_balance,expected_ledger_balance,actual_balance,declared_amount,difference,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[h.shift_id,h.attempt+1,id,h.account_id,h.cashier_id,h.expected_balance,h.expected_ledger_balance,h.actual_balance,amount,h.difference,reason])
    await strictAudit(tx,{userId:actor.id,action:'REPLACE_TREASURY_DECLARATION',entityType:'TREASURY_HANDOVER',entityId:String(r.insertId),newValue:{replacesId:id,declaredAmount:amount,reason}});return {id:r.insertId,status:'pending'}
  }))
}
export async function getMine(actor:TreasuryActor) {
  permit(actor,'treasury.view_own','shifts.manage')
  return readSnapshot(async tx=>{
  const c=await configuration(tx)
  const [a]=await query(tx,'SELECT * FROM treasury_assignments WHERE cashier_id=?',[actor.id])
  if(!a)return {enabled:c.enabled,assignment:null,account:null,shift:null,currentBalance:'0.00',expectedBalance:null,expectedLedgerBalance:null,funding:[],handovers:[]}
    const [account]=await query(tx,'SELECT a.*,d.cashier_id,u.name cashier_name FROM treasury_accounts a JOIN treasury_assignments d ON d.account_id=a.id JOIN users u ON u.id=d.cashier_id WHERE a.id=?',[a.account_id])
    const [s]=await query(tx,"SELECT * FROM cashier_shifts WHERE cashier_id=? AND status='active' AND treasury_account_id=?",[actor.id,a.account_id])
    const amounts=s?await sessionAmounts(tx,s):null
    const f=await query(tx,"SELECT f.*,u.name cashier_name FROM treasury_funding f JOIN users u ON u.id=f.cashier_id WHERE f.cashier_id=? AND f.status='pending' ORDER BY f.id DESC",[actor.id])
    const h=await query(tx,'SELECT h.*,u.name cashier_name FROM treasury_handovers h JOIN users u ON u.id=h.cashier_id WHERE h.cashier_id=? ORDER BY h.id DESC LIMIT 50',[actor.id])
    const dto=await accountDTO(tx,account)
    return {enabled:c.enabled,assignment:{id:a.id,accountId:a.account_id,cashierId:a.cashier_id,isActive:!!a.is_active},account:dto,currentBalance:dto.balance,expectedBalance:amounts?.expectedBalance??null,expectedLedgerBalance:amounts?.expectedLedgerBalance??null,shift:s?{id:s.id,cashierId:s.cashier_id,openingBalance:String(s.opening_balance),openingLedgerBalance:String(s.opening_ledger_balance),openingDifference:money(cents(String(s.opening_balance))-cents(String(s.opening_ledger_balance),true)),openedAt:iso(s.opened_at),businessDate:s.business_date,status:s.status,...amounts}:null,funding:f.map(fundingDTO),handovers:h.map(handoverDTO)}
  })
}

export async function listFunding(actor:TreasuryActor,input:any={}) {
  permit(actor,'treasury.fund')
  const status=input.status
  if(status && !['pending','accepted','cancelled'].includes(status))throw new ValidationError('حالة التمويل غير صالحة')
  const rows=await query(pool,'SELECT f.*,u.name cashier_name FROM treasury_funding f JOIN users u ON u.id=f.cashier_id'+(status?' WHERE f.status=?':'')+' ORDER BY f.id DESC LIMIT 100',status?[status]:[])
  return rows.map(fundingDTO)
}

/** Latest declarations only: replacements never multiply pending or completed amounts. */
export async function handoverSummary(actor:TreasuryActor) {
  permit(actor,'treasury.handovers.view','treasury.view_own','shifts.manage')
  const all=actor.permissions.includes('treasury.handovers.view')
  const [row]=await query(pool,`
    SELECT
      SUM(h.status='pending') pending_count,
      COALESCE(SUM(CASE WHEN h.status='pending' THEN h.declared_amount ELSE 0 END),0) pending_amount,
      SUM(h.status='rejected') rejected_count,
      COALESCE(SUM(CASE WHEN h.status='rejected' THEN h.declared_amount ELSE 0 END),0) rejected_amount,
      SUM(h.status='confirmed') completed_count,
      SUM(h.status='zero_acknowledged') zero_count,
      COALESCE(SUM(s.received_amount),0) received_amount,
      COALESCE(SUM(s.adjustment_amount),0) adjustment_amount
    FROM treasury_handovers h
    LEFT JOIN treasury_settlements s ON s.handover_id=h.id
    WHERE NOT EXISTS (SELECT 1 FROM treasury_handovers newer WHERE newer.shift_id=h.shift_id AND newer.attempt>h.attempt)
      ${all?'':'AND h.cashier_id=?'}`,all?[]:[actor.id])
  // SQL DECIMAL sums can exceed a single-account limit; preserve their exact strings.
  return {pendingCount:Number(row.pending_count||0),pendingDeclaredAmount:String(row.pending_amount),
    rejectedCount:Number(row.rejected_count||0),rejectedDeclaredAmount:String(row.rejected_amount),
    completedCount:Number(row.completed_count||0),zeroAcknowledgedCount:Number(row.zero_count||0),
    receivedAmount:String(row.received_amount),adjustmentAmount:String(row.adjustment_amount)}
}
