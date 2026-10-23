import { pool } from '../../db/connection.js'
import { ConflictError, NotFoundError, ForbiddenError, BusinessRuleError, ValidationError } from '../../utils/errors.js'
import type { OpenShiftInput, CloseShiftInput, ShiftDTO } from './shifts.types.js'
import { query, transaction, configuration, withFinancialOperation, strictAudit, checkedBalance, cents, money, reasonText, type FinanceTx } from '../treasury/treasury-posting.js'
import { sessionAmounts, unsettled } from '../treasury/treasury.service.js'
function mapToDTO(row:any):ShiftDTO {
  return {id:row.id,cashierId:row.cashier_id,cashierName:row.cashier_name,openedAt:new Date(row.opened_at).toISOString(),closedAt:row.closed_at?new Date(row.closed_at).toISOString():null,openingBalance:Number(row.opening_balance),expectedBalance:row.expected_balance===null?null:Number(row.expected_balance),actualBalance:row.actual_balance===null?null:Number(row.actual_balance),difference:row.difference===null?null:Number(row.difference),status:row.status,treasuryAccountId:row.treasury_account_id,expectedLedgerBalance:row.expected_ledger_balance,openingLedgerBalance:row.opening_ledger_balance,declaredAmount:row.declared_amount,businessDate:row.business_date}
}
export async function getActiveShiftForCashier(cashierId:number):Promise<ShiftDTO|null> {
  const rows=await query(pool,"SELECT * FROM cashier_shifts WHERE cashier_id=? AND status='active' ORDER BY id",[cashierId]);if(rows.length>1)throw new ConflictError('توجد ورديات نشطة متعارضة');return rows.length?mapToDTO(rows[0]):null
}
export async function openShift(cashierId:number,input:OpenShiftInput):Promise<ShiftDTO> {
  const count=money(cents(input.openingBalance))
  return transaction(tx=>withFinancialOperation(tx,cashierId,'shift.open',input.operationKey,{openingBalance:count},async()=>{
    const config=await configuration(tx,true)
    const [actor]=await query(tx,'SELECT id,is_active FROM users WHERE id=? FOR UPDATE',[cashierId]);if(!actor?.is_active)throw new ForbiddenError('حساب المستخدم غير نشط')
    if((await query(tx,"SELECT id FROM cashier_shifts WHERE cashier_id=? AND status='active' FOR UPDATE",[cashierId])).length)throw new ConflictError('لديك وردية مفتوحة بالفعل')
    let accountId:number|null=null,assignmentId:number|null=null,openingLedger:string|null=null
    if(config.enabled) {
      const [assignment]=await query(tx,'SELECT * FROM treasury_assignments WHERE cashier_id=? FOR UPDATE',[cashierId])
      if(!assignment?.is_active)throw new BusinessRuleError('لا توجد خزينة معينة نشطة','NO_TREASURY_ASSIGNMENT')
      accountId=assignment.account_id;assignmentId=assignment.id
      if((await unsettled(tx,accountId!)).length)throw new ConflictError('تسليم الوردية السابقة لم يؤكد بعد')
      const [a]=await query(tx,'SELECT is_active FROM treasury_accounts WHERE id=? FOR UPDATE',[accountId]);if(!a?.is_active)throw new BusinessRuleError('الخزينة غير نشطة','INACTIVE_TREASURY')
      openingLedger=money(await checkedBalance(tx,accountId!))
    }
    const now=new Date(),businessDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
    const r=await query(tx,'INSERT INTO cashier_shifts(cashier_id,opening_balance,treasury_account_id,assignment_id,opening_ledger_balance,business_date) VALUES(?,?,?,?,?,?)',[cashierId,count,accountId,assignmentId,openingLedger,businessDate])
    await strictAudit(tx,{userId:cashierId,action:'OPEN_SHIFT',entityType:'SHIFT',entityId:String(r.insertId),newValue:{openingBalance:count,openingLedgerBalance:openingLedger,openingDifference:openingLedger===null?null:money(cents(count)-cents(openingLedger,true)),treasuryAccountId:accountId,businessDate,countOnly:true}})
    const [s]=await query(tx,'SELECT * FROM cashier_shifts WHERE id=?',[r.insertId]);return mapToDTO(s)
  }))
}
async function expected(tx:FinanceTx,s:any):Promise<bigint> {
  if(s.treasury_account_id)return cents((await sessionAmounts(tx,s,true)).expectedBalance,true)
  const rows=await query(tx,'SELECT m.amount,m.type FROM treasury_movements m JOIN treasury_accounts a ON a.id=m.treasury_account_id WHERE m.shift_id=? AND COALESCE(m.cash_snapshot,a.is_cash_drawer)=1 FOR UPDATE',[s.id])
  return rows.reduce((n:bigint,r:any)=>n+(r.type==='in'?1n:-1n)*cents(String(r.amount)),cents(String(s.opening_balance)))
}
export async function calculateExpectedCashBalance(shiftId:number,tx:FinanceTx=pool):Promise<number> {
  const [s]=await query(tx,'SELECT * FROM cashier_shifts WHERE id=?',[shiftId]);if(!s)throw new NotFoundError('الوردية غير موجودة');return Number(money(await expected(tx,s)))
}
export async function closeShift(shiftId:number,input:CloseShiftInput,cashierId:number):Promise<ShiftDTO> {
  const count=money(cents(input.actualBalance))
  return transaction(tx=>withFinancialOperation(tx,cashierId,'shift.close',input.operationKey,{shiftId,actualBalance:count,declaredAmount:input.declaredAmount,reason:input.reason,closedAt:input.closedAt},async()=>{
    await configuration(tx,true);await query(tx,'SELECT id FROM users WHERE id=? FOR UPDATE',[cashierId])
    const [s]=await query(tx,'SELECT * FROM cashier_shifts WHERE id=? FOR UPDATE',[shiftId]);if(!s)throw new NotFoundError('الوردية غير موجودة');if(s.cashier_id!==cashierId)throw new ForbiddenError('لا يمكنك إغلاق وردية أخرى');if(s.status!=='active')throw new ConflictError('الوردية مغلقة بالفعل')
    let closedAt=new Date(),declared:string|null=null,ledger:string|null=null,note=reasonText(input.reason,false)
    if(s.treasury_account_id) {
      if(input.closedAt!==undefined)throw new ValidationError('وقت إغلاق الوردية يسجل من الخادم')
      declared=money(cents(input.declaredAmount));if(declared!==count)throw new ValidationError('التسليم الكامل يجب أن يساوي النقدية المعدودة')
      ledger=money(await checkedBalance(tx,s.treasury_account_id))
      const calculated=await sessionAmounts(tx,s,true)
      if(ledger!==calculated.expectedLedgerBalance)throw new BusinessRuleError('حركات الخزينة لا تتطابق مع الوردية','SHIFT_LEDGER_DRIFT')
    } else if(input.closedAt) {
      closedAt=new Date(input.closedAt);if(isNaN(closedAt.getTime())||closedAt<new Date(s.opened_at))throw new BusinessRuleError('وقت الإغلاق غير صالح','INVALID_CLOSE_TIME')
    }
    const expectedCash=await expected(tx,s),difference=cents(count)-expectedCash
    if(s.treasury_account_id && (difference!==0n || cents(count)!==cents(ledger!,true)))note=reasonText(input.reason)
    await query(tx,"UPDATE cashier_shifts SET status='closed',closed_at=?,closed_by=?,expected_balance=?,expected_ledger_balance=?,actual_balance=?,declared_amount=?,difference=?,notes=? WHERE id=?",[closedAt,cashierId,money(expectedCash),ledger,count,declared,money(difference),note,shiftId])
    let handoverId:number|undefined
    if(s.treasury_account_id) {
      const h=await query(tx,'INSERT INTO treasury_handovers(shift_id,account_id,cashier_id,expected_balance,expected_ledger_balance,actual_balance,declared_amount,difference,reason) VALUES(?,?,?,?,?,?,?,?,?)',[shiftId,s.treasury_account_id,cashierId,money(expectedCash),ledger,count,declared,money(difference),note]);handoverId=h.insertId
      await strictAudit(tx,{userId:cashierId,action:'DECLARE_TREASURY_HANDOVER',entityType:'TREASURY_HANDOVER',entityId:String(handoverId),newValue:{shiftId,declaredAmount:declared,expectedLedgerBalance:ledger,status:'pending',reason:note}})
    }
    await strictAudit(tx,{userId:cashierId,action:'CLOSE_SHIFT',entityType:'SHIFT',entityId:String(shiftId),oldValue:{status:'active'},newValue:{status:'closed',expectedBalance:money(expectedCash),expectedLedgerBalance:ledger,actualBalance:count,declaredAmount:declared,difference:money(difference),handoverId,reason:note}})
    const [row]=await query(tx,'SELECT * FROM cashier_shifts WHERE id=?',[shiftId]);return {...mapToDTO(row),handoverId}
  }))
}
export async function listShifts(cashierId?:number,viewAll=false):Promise<ShiftDTO[]> {
  if(!viewAll && !cashierId)throw new ForbiddenError()
  const rows=await query(pool,'SELECT s.*,u.name cashier_name FROM cashier_shifts s LEFT JOIN users u ON u.id=s.cashier_id'+(viewAll?'':' WHERE s.cashier_id=?')+' ORDER BY s.opened_at DESC',viewAll?[]:[cashierId]);return rows.map(mapToDTO)
}
