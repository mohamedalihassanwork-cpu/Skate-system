import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import app from '../app.js'
import env from '../config/env.js'
import { pool } from '../db/connection.js'
import * as treasury from '../modules/treasury/treasury.service.js'
import { openShift, closeShift } from '../modules/shifts/shifts.service.js'
import { query, transaction, cents, money, strictAudit } from '../modules/treasury/treasury-posting.js'
const stamp=randomUUID().slice(0,8),key=()=>randomUUID()
const actors:number[]=[],roles:number[]=[],accounts:number[]=[]
let originalConfig:any,mainId:number,manager:any,otherManager:any,noRights:any
const adminPerms=['treasury.view','treasury.assign','treasury.fund','treasury.handovers.view','treasury.handovers.confirm','treasury.reconcile','treasury.view_own','shifts.manage','shifts.view','shifts.view_all']
async function user(label:string,rights:string[]) {
  const email=`st-${label}-${stamp}-${actors.length}@example.test`
  const u=await query(pool,'INSERT INTO users(name,email,password_hash,is_active) VALUES(?,?,?,1)',[label,email,'fixture'])
  actors.push(u.insertId)
  const r=await query(pool,'INSERT INTO roles(name,name_ar) VALUES(?,?)',[`st-${stamp}-${roles.length}`,label]);roles.push(r.insertId)
  for(const right of rights){const [p]=await query(pool,'SELECT id FROM permissions WHERE `key`=?',[right]);expect(p,`permission ${right}`).toBeTruthy();await query(pool,'INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)',[r.insertId,p.id])}
  await query(pool,'INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[u.insertId,r.insertId])
  return {id:u.insertId,permissions:rights,token:jwt.sign({sub:u.insertId,email},env.JWT_SECRET,{expiresIn:'1h'})}
}
async function account(name:string,cash=true) {const r=await query(pool,'INSERT INTO treasury_accounts(name,name_ar,is_cash_drawer) VALUES(?,?,?)',[name,'خزينة اختبار',cash]);accounts.push(r.insertId);return r.insertId}
async function cashier(label='cashier') {
  const a=await user(label,['treasury.view_own','shifts.manage','shifts.view'])
  const accountId=await account(label)
  await treasury.assignDrawer(manager,{cashierId:a.id,accountId,operationKey:key()})
  return {...a,accountId}
}
async function funds(a:any,amount='100.00') {
  const f=await treasury.authorizeFunding(manager,{cashierId:a.id,amount,reason:'عهدة اختبار',operationKey:key()})
  await treasury.acceptFunding(a,f.id,{operationKey:key()});return f.id
}
async function closed(a:any,actual='100.00',opening='100.00') {
  const s=await openShift(a.id,{openingBalance:opening,operationKey:key()})
  const close=await closeShift(s.id,{actualBalance:actual,declaredAmount:actual,reason:'عد النقدية للاختبار',operationKey:key()},a.id)
  return {shift:s,id:close.handoverId!}
}
async function totals(ids:number[]) {const rows=[];for(const id of ids){const [r]=await query(pool,'SELECT balance FROM treasury_accounts WHERE id=?',[id]);rows.push(String(r.balance))}return rows}
async function movementCount(){const [r]=await query(pool,'SELECT COUNT(*) n FROM treasury_movements');return Number(r.n)}
const auth=(token:string)=>({Authorization:`Bearer ${token}`})
beforeAll(async()=>{
  const [db]=await query(pool,'SELECT DATABASE() db');expect(db.db).toBe('koshk_skate_test')
  ;[originalConfig]=await query(pool,'SELECT * FROM treasury_configuration WHERE id=1')
  manager=await user('manager',adminPerms);otherManager=await user('reviewer',['treasury.handovers.view','treasury.handovers.confirm']);noRights=await user('none',[])
  mainId=await account('main')
  // A fixture represents previously recorded funds; opening-count endpoints never create this money.
  await query(pool,'INSERT INTO treasury_movements(treasury_account_id,amount,type,reference_type,reference_id,cashier_id) VALUES(?,10000,\'in\',\'other\',?,?)',[mainId,manager.id,manager.id])
  await query(pool,'UPDATE treasury_accounts SET balance=10000 WHERE id=?',[mainId])
  await query(pool,'UPDATE treasury_configuration SET enabled=1,main_account_id=? WHERE id=1',[mainId])
},30000)
afterAll(async()=>{
  vi.restoreAllMocks()
  if(originalConfig)await query(pool,'UPDATE treasury_configuration SET enabled=?,main_account_id=?,activated_by=?,activated_at=? WHERE id=1',[originalConfig.enabled,originalConfig.main_account_id,originalConfig.activated_by,originalConfig.activated_at])
  if(actors.length){
    const q=actors.map(()=>'?').join(',')
    await query(pool,`DELETE FROM financial_operations WHERE actor_id IN (${q})`,actors)
    await query(pool,`DELETE FROM audit_logs WHERE user_id IN (${q})`,actors)
    await query(pool,`DELETE FROM treasury_movements WHERE cashier_id IN (${q})`,actors)
    await query(pool,`DELETE FROM treasury_settlements WHERE confirmed_by IN (${q})`,actors)
    await query(pool,`DELETE FROM treasury_transfers WHERE confirmed_by IN (${q})`,actors)
    const hs=await query(pool,`SELECT id FROM treasury_handovers WHERE cashier_id IN (${q}) ORDER BY id DESC`,actors)
    for(const h of hs)await query(pool,'DELETE FROM treasury_handovers WHERE id=?',[h.id])
    await query(pool,`DELETE FROM treasury_funding WHERE cashier_id IN (${q})`,actors)
    await query(pool,`DELETE FROM cashier_shifts WHERE cashier_id IN (${q})`,actors)
    await query(pool,`DELETE FROM treasury_assignments WHERE cashier_id IN (${q})`,actors)
    for(const id of accounts)await query(pool,'DELETE FROM treasury_accounts WHERE id=?',[id])
    await query(pool,`DELETE FROM user_roles WHERE user_id IN (${q})`,actors)
    for(const id of roles){await query(pool,'DELETE FROM role_permissions WHERE role_id=?',[id]);await query(pool,'DELETE FROM roles WHERE id=?',[id])}
    await query(pool,`DELETE FROM users WHERE id IN (${q})`,actors)
  }
},30000)
describe('Approved sub-treasury lifecycle (real isolated test DB)',()=>{
  it('enforces authentication, permissions and per-cashier account access',async()=>{
    expect((await request(app).get('/api/v1/treasury/me')).status).toBe(401)
    expect((await request(app).get('/api/v1/treasury/accounts').set(auth(noRights.token))).status).toBe(403)
    const a=await cashier('isolation-a'),b=await cashier('isolation-b')
    expect((await request(app).get(`/api/v1/treasury/accounts/${b.accountId}/movements`).set(auth(a.token))).status).toBe(403)
    expect((await request(app).get('/api/v1/treasury/me').set(auth(a.token))).body.account.id).toBe(a.accountId)
    expect((await request(app).get('/api/v1/treasury/accounts').set(auth(a.token))).status).toBe(403)
  })
  it('blocks a disabled cashier with a still-valid token from reading current balances',async()=>{
    const a=await cashier('inactive-token');await openShift(a.id,{openingBalance:'0.00',operationKey:key()})
    await query(pool,'UPDATE users SET is_active=0 WHERE id=?',[a.id])
    try {
      expect((await request(app).get('/api/v1/shifts/current').set(auth(a.token))).status).toBe(403)
      expect((await request(app).get('/api/v1/treasury/me').set(auth(a.token))).status).toBe(401)
    } finally { await query(pool,'UPDATE users SET is_active=1 WHERE id=?',[a.id]) }
  })
  it('records any valid opening count without creating ledger funds',async()=>{
    const a=await cashier('count-only'),before=await movementCount()
    const s=await openShift(a.id,{openingBalance:'120.35',operationKey:key()})
    expect(await movementCount()).toBe(before);expect(await totals([a.accountId])).toEqual(['0.00'])
    const mine=await treasury.getMine(a)
    expect(mine.shift).toMatchObject({openingBalance:'120.35',openingLedgerBalance:'0.00',openingDifference:'120.35',expectedBalance:'120.35',expectedLedgerBalance:'0.00'})
    const [audit]=await query(pool,"SELECT new_value FROM audit_logs WHERE user_id=? AND action='OPEN_SHIFT' AND entity_id=?",[a.id,String(s.id)])
    const value=typeof audit.new_value==='string'?JSON.parse(audit.new_value):audit.new_value;expect(value.countOnly).toBe(true)
  })
  it('keeps authorizations pending without funds; acknowledgment posts exactly two legs',async()=>{
    const a=await cashier('funding'),before=await totals([mainId,a.accountId]),n=await movementCount(),k=key()
    const f=await treasury.authorizeFunding(manager,{cashierId:a.id,amount:'42.10',reason:'عهدة',operationKey:key()})
    expect(await totals([mainId,a.accountId])).toEqual(before);expect(await movementCount()).toBe(n)
    const accepted=await treasury.acceptFunding(a,f.id,{operationKey:k});expect(await treasury.acceptFunding(a,f.id,{operationKey:k})).toEqual(accepted)
    expect(await movementCount()).toBe(n+2)
    expect(await totals([a.accountId])).toEqual(['42.10'])
    const [legs]=await query(pool,'SELECT COUNT(*) n,SUM(CASE WHEN type=\'in\' THEN amount ELSE -amount END) net FROM treasury_movements WHERE transfer_id=?',[accepted.transferId]);expect(Number(legs.n)).toBe(2);expect(cents(String(legs.net),true)).toBe(0n)
  })
  it('supports top-ups once and never double-counts opening funding',async()=>{
    const a=await cashier('topup');await funds(a,'10.10');await openShift(a.id,{openingBalance:'9.10',operationKey:key()})
    await funds(a,'5.20')
    const mine=await treasury.getMine(a);expect(mine).toMatchObject({currentBalance:'15.30',expectedBalance:'14.30',expectedLedgerBalance:'15.30'})
  })
  it('closing creates immutable snapshots and pending handover without transfer',async()=>{
    const a=await cashier('closing');await funds(a);const before=await totals([mainId,a.accountId]),n=await movementCount()
    const h=await closed(a)
    expect(await totals([mainId,a.accountId])).toEqual(before);expect(await movementCount()).toBe(n)
    const d=await treasury.handoverDetail(a,h.id);expect(d.handover.status).toBe('pending');expect(d.settlement).toBeNull();expect(d.closing).toMatchObject({expectedLedgerBalance:'100.00',actualBalance:'100.00',closedBy:a.id})
    await expect(openShift(a.id,{openingBalance:'0.00',operationKey:key()})).rejects.toThrow('تسليم')
    await expect(treasury.authorizeFunding(manager,{cashierId:a.id,amount:'5.00',reason:'تمويل',operationKey:key()})).rejects.toThrow('تسوية')
  })
  it('confirms receipt once, moves actual funds, and opens next session only after settlement',async()=>{
    const a=await cashier('confirm');await funds(a,'50.25');const h=await closed(a,'50.25','50.25'),before=await totals([mainId,a.accountId]),k=key()
    const result=await treasury.confirmHandover(manager,h.id,{receivedAmount:'50.25',operationKey:k})
    expect(await treasury.confirmHandover(manager,h.id,{receivedAmount:'50.25',operationKey:k})).toEqual(result)
    const after=await totals([mainId,a.accountId]);expect(cents(after[0])-cents(before[0])).toBe(5025n);expect(after[1]).toBe('0.00')
    await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'50.25',operationKey:key()})).rejects.toThrow()
    const d=await treasury.handoverDetail(manager,h.id);expect(d.handover).toMatchObject({status:'confirmed',confirmedBy:manager.id,receivedAmount:'50.25'});expect(d.movements.filter(x=>x.referenceType==='treasury_transfer')).toHaveLength(2)
    expect((await openShift(a.id,{openingBalance:'0.00',operationKey:key()})).status).toBe('active')
  })
  it('rejects received/declaration mismatch with no balance or state change',async()=>{
    const a=await cashier('mismatch');await funds(a);const h=await closed(a),before=await totals([mainId,a.accountId])
    await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'99.00',operationKey:key()})).rejects.toThrow('يختلف')
    expect(await totals([mainId,a.accountId])).toEqual(before);expect((await treasury.handoverDetail(manager,h.id)).handover.status).toBe('pending')
  })
  it('requires explicit discrepancy right and acknowledgment, recording shortage separately',async()=>{
    const a=await cashier('shortage');await funds(a);const h=await closed(a,'90.00'),before=await totals([mainId,a.accountId])
    await expect(treasury.confirmHandover(otherManager,h.id,{receivedAmount:'90.00',approveVariance:true,reason:'عجز',operationKey:key()})).rejects.toBeInstanceOf(Error)
    await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'90.00',operationKey:key()})).rejects.toThrow('اعتماد')
    await treasury.confirmHandover(manager,h.id,{receivedAmount:'90.00',approveVariance:true,reason:'عجز معتمد',operationKey:key()})
    const d=await treasury.handoverDetail(manager,h.id);expect(d.settlement).toMatchObject({adjustmentAmount:'-10.00',varianceApprovedBy:manager.id});expect(d.closing.difference).toBe('-10.00')
    const after=await totals([mainId,a.accountId]);expect(cents(after[0])-cents(before[0])).toBe(9000n);expect(after[1]).toBe('0.00')
    expect(d.movements.filter(x=>x.referenceType==='treasury_variance')).toHaveLength(1)
  })
  it('records overage separately and settles using ledger due rather than opening count',async()=>{
    const a=await cashier('overage');await funds(a,'10.00');const h=await closed(a,'15.00','12.00')
    const prior=await treasury.handoverDetail(a,h.id);expect(prior.closing.difference).toBe('3.00');expect(prior.handover.settlementDifference).toBe('5.00')
    await treasury.confirmHandover(manager,h.id,{receivedAmount:'15.00',approveVariance:true,reason:'زيادة معتمدة',operationKey:key()})
    const d=await treasury.handoverDetail(manager,h.id);expect(d.settlement?.adjustmentAmount).toBe('5.00');expect(d.closing.openingBalance).toBe('12.00')
  })
  it('retains rejected attempt and original count on replacement',async()=>{
    const a=await cashier('replacement');await funds(a,'20.00');const h=await closed(a,'20.00','20.00'),n=await movementCount()
    await treasury.rejectHandover(manager,h.id,{reason:'إعادة العد',operationKey:key()})
    expect(await movementCount()).toBe(n)
    const next=await treasury.replaceHandover(a,h.id,{declaredAmount:'19.00',reason:'تصحيح الإقرار بعد العد',operationKey:key()})
    const d=await treasury.handoverDetail(manager,next.id);expect(d.attempts).toHaveLength(2);expect(d.closing.actualBalance).toBe('20.00');expect(d.handover.actualBalance).toBe('20.00');expect(d.handover.declaredAmount).toBe('19.00')
    await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'20.00',operationKey:key()})).rejects.toThrow('أحدث')
    await treasury.confirmHandover(manager,next.id,{receivedAmount:'19.00',approveVariance:true,reason:'عجز معتمد بعد إعادة العد',operationKey:key()})
  })
  it('acknowledges zero without inventing a transfer, including total shortage',async()=>{
    const a=await cashier('zero'),h=await closed(a,'0.00','0.00'),n=await movementCount()
    const r=await treasury.confirmHandover(manager,h.id,{receivedAmount:'0.00',operationKey:key()});expect(r.status).toBe('zero_acknowledged');expect(r.transferId).toBeNull();expect(await movementCount()).toBe(n)
    const b=await cashier('zero-shortage');await funds(b,'5.00');const hb=await closed(b,'0.00','5.00')
    const rb=await treasury.confirmHandover(manager,hb.id,{receivedAmount:'0.00',approveVariance:true,reason:'عجز كامل معتمد',operationKey:key()});expect(rb.transferId).toBeNull();expect(await totals([b.accountId])).toEqual(['0.00'])
  })
  it('prevents self-confirmation even with every permission',async()=>{
    const accountId=await account('manager-own');await treasury.assignDrawer(manager,{cashierId:manager.id,accountId,operationKey:key()})
    const h=await closed({...manager,accountId},'0.00','0.00')
    await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'0.00',operationKey:key()})).rejects.toThrow('ورديتك')
    await expect(treasury.authorizeFunding(manager,{cashierId:manager.id,amount:'1.00',reason:'عهدة',operationKey:key()})).rejects.toThrow('لنفسك')
  })
  it('serializes competing confirms so exactly one settlement and pair commit',async()=>{
    const a=await cashier('parallel-confirm');await funds(a,'7.70');const h=await closed(a,'7.70','7.70')
    const r=await Promise.allSettled([treasury.confirmHandover(manager,h.id,{receivedAmount:'7.70',operationKey:key()}),treasury.confirmHandover(otherManager,h.id,{receivedAmount:'7.70',operationKey:key()})])
    expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1)
    const [n]=await query(pool,'SELECT COUNT(*) n FROM treasury_settlements WHERE shift_id=?',[h.shift.id]);expect(Number(n.n)).toBe(1)
    const [legs]=await query(pool,'SELECT COUNT(*) n FROM treasury_movements WHERE reference_type=\'treasury_transfer\' AND transfer_id IN (SELECT id FROM treasury_transfers WHERE handover_id=?)',[h.id]);expect(Number(legs.n)).toBe(2)
  })
  it('serializes confirm versus reject with one terminal outcome',async()=>{
    const a=await cashier('parallel-reject');await funds(a,'3.00');const h=await closed(a,'3.00','3.00')
    const r=await Promise.allSettled([treasury.confirmHandover(manager,h.id,{receivedAmount:'3.00',operationKey:key()}),treasury.rejectHandover(otherManager,h.id,{reason:'مراجعة',operationKey:key()})]);expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1)
    const d=await treasury.handoverDetail(manager,h.id);expect(['confirmed','rejected']).toContain(d.handover.status);expect(d.settlement!==null).toBe(d.handover.status==='confirmed')
  })
  it('serializes duplicate opens and enforces the database active-shift guard',async()=>{
    const a=await cashier('parallel-open'),results=await Promise.allSettled([openShift(a.id,{openingBalance:'0.00',operationKey:key()}),openShift(a.id,{openingBalance:'0.00',operationKey:key()})])
    expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1)
    const [s]=await query(pool,"SELECT * FROM cashier_shifts WHERE cashier_id=? AND status='active'",[a.id])
    await expect(query(pool,"INSERT INTO cashier_shifts(cashier_id,opening_balance,treasury_account_id,assignment_id) VALUES(?,0,?,?)",[a.id,a.accountId,s.assignment_id])).rejects.toThrow()
  })
  it('rejects missing keys, changed replay payloads and malformed/new close amounts',async()=>{
    const a=await cashier('validation'),k=key()
    await expect(openShift(a.id,{openingBalance:'0.00'})).rejects.toThrow('معرف')
    for(const value of ['1.001','1e2','-1',NaN,Infinity,'10000000000.00'])await expect(openShift(a.id,{openingBalance:value as any,operationKey:key()})).rejects.toThrow()
    const s=await openShift(a.id,{openingBalance:'0.00',operationKey:k})
    await expect(openShift(a.id,{openingBalance:'1.00',operationKey:k})).rejects.toThrow('مختلفة')
    await expect(closeShift(s.id,{actualBalance:'2.00',declaredAmount:'1.00',reason:'فرق',operationKey:key()},a.id)).rejects.toThrow('الكامل')
    await expect(closeShift(s.id,{actualBalance:'0.00',declaredAmount:'0.00',closedAt:'2099-01-01',operationKey:key()},a.id)).rejects.toThrow('الخادم')
  })
  it('validates money boundaries exactly and assigns Cairo opening date',async()=>{
    expect(money(cents('9999999999.99'))).toBe('9999999999.99');expect(money(cents('0.01'))).toBe('0.01')
    const a=await cashier('date'),s=await openShift(a.id,{openingBalance:'0.00',operationKey:key()})
    expect(s.businessDate).toBe(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s.openedAt)))
  })
  it('own/all history and handover IDs cannot expose another cashier',async()=>{
    const a=await cashier('ownhistory'),b=await cashier('otherhistory'),ha=await closed(a,'0.00','0.00'),hb=await closed(b,'0.00','0.00')
    const own=await request(app).get('/api/v1/shifts').set(auth(a.token));expect(own.status).toBe(200);expect(own.body.every((s:any)=>s.cashierId===a.id)).toBe(true)
    expect((await request(app).get(`/api/v1/treasury/handovers/${hb.id}`).set(auth(a.token))).status).toBe(403)
    const list=await treasury.listHandovers(a);expect(list.data.map((x:any)=>x.id)).toContain(ha.id);expect(list.data.every((x:any)=>x.cashierId===a.id)).toBe(true)
    await expect(closeShift(hb.shift.id,{actualBalance:'0.00',declaredAmount:'0.00',operationKey:key()},a.id)).rejects.toThrow('أخرى')
  })
  it('rejects ledger drift without adjusting or transferring historical money',async()=>{
    const a=await cashier('drift');await funds(a,'2.00');const h=await closed(a,'2.00','2.00'),n=await movementCount()
    await query(pool,'UPDATE treasury_accounts SET balance=3 WHERE id=?',[a.accountId])
    try{await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'2.00',operationKey:key()})).rejects.toThrow('دفتر');expect(await movementCount()).toBe(n)}finally{await query(pool,'UPDATE treasury_accounts SET balance=2 WHERE id=?',[a.accountId])}
  })
  it('cancels pending funding without any movement and blocks acceptance',async()=>{
    const a=await cashier('cancel-funding'),n=await movementCount(),f=await treasury.authorizeFunding(manager,{cashierId:a.id,amount:'1.00',reason:'عهدة',operationKey:key()})
    await treasury.cancelFunding(manager,f.id,{reason:'إلغاء العهدة',operationKey:key()});expect(await movementCount()).toBe(n)
    await expect(treasury.acceptFunding(a,f.id,{operationKey:key()})).rejects.toThrow('معلقاً')
  })
  it('rolls back both transfer legs, account deltas, settlement and status on audit failure',async()=>{
    const a=await cashier('rollback');await funds(a,'4.00');const h=await closed(a,'4.00','4.00'),before=await totals([mainId,a.accountId]),n=await movementCount()
    const real=pool.getConnection.bind(pool)
    const spy=vi.spyOn(pool,'getConnection').mockImplementation(async()=>{const conn=await real();const original=conn.query.bind(conn);conn.query=((text:any,...args:any[])=>{if(typeof text==='string' && text.startsWith('INSERT INTO audit_logs'))return Promise.reject(new Error('simulated required audit failure'));return (original as any)(text,...args)}) as any;const release=conn.release.bind(conn);conn.release=()=>{conn.query=original as any;release()};return conn})
    try{await expect(treasury.confirmHandover(manager,h.id,{receivedAmount:'4.00',operationKey:key()})).rejects.toThrow('simulated')}finally{spy.mockRestore()}
    expect(await totals([mainId,a.accountId])).toEqual(before);expect(await movementCount()).toBe(n);const d=await treasury.handoverDetail(manager,h.id);expect(d.settlement).toBeNull();expect(d.handover.status).toBe('pending')
  })
  it('reports latest pending declarations separately from completed receipts and adjustments',async()=>{
    const a=await cashier('summary');await funds(a,'10.00');const h=await closed(a,'10.00','10.00')
    expect(await treasury.handoverSummary(a)).toMatchObject({pendingCount:1,pendingDeclaredAmount:'10.00',completedCount:0,receivedAmount:'0.00',adjustmentAmount:'0.00'})
    await treasury.rejectHandover(manager,h.id,{reason:'إعادة العد',operationKey:key()})
    expect(await treasury.handoverSummary(a)).toMatchObject({pendingCount:0,rejectedCount:1,rejectedDeclaredAmount:'10.00',receivedAmount:'0.00'})
    const replacement=await treasury.replaceHandover(a,h.id,{declaredAmount:'9.00',reason:'إقرار مصحح',operationKey:key()})
    expect(await treasury.handoverSummary(a)).toMatchObject({pendingCount:1,pendingDeclaredAmount:'9.00',rejectedCount:0,receivedAmount:'0.00'})
    await treasury.confirmHandover(manager,replacement.id,{receivedAmount:'9.00',approveVariance:true,reason:'عجز معتمد',operationKey:key()})
    expect(await treasury.handoverSummary(a)).toMatchObject({pendingCount:0,rejectedCount:0,completedCount:1,receivedAmount:'9.00',adjustmentAmount:'-1.00'})
    expect((await request(app).get('/api/v1/treasury/summary').set(auth(noRights.token))).status).toBe(403)
    const own=await request(app).get('/api/v1/treasury/summary').set(auth(a.token));expect(own.status).toBe(200);expect(own.body.receivedAmount).toBe('9.00')
    const all=await treasury.handoverSummary(manager);expect(all.completedCount).toBeGreaterThan(1)
  })
  it('blocks activation with legacy active sessions and rejects pre-activation funding without changes',async()=>{
    const old=await query(pool,'SELECT * FROM treasury_configuration WHERE id=1')
    await query(pool,'UPDATE treasury_configuration SET enabled=0,main_account_id=NULL WHERE id=1')
    try{await expect(treasury.createAccount(manager,{name:'missing key',nameAr:'اختبار',isCashDrawer:true})).rejects.toThrow('معرف');await expect(treasury.activate(manager,{mainAccountId:mainId,operationKey:key()})).rejects.toThrow('الورديات');await expect(treasury.authorizeFunding(manager,{cashierId:noRights.id,amount:'1.00',reason:'تمويل',operationKey:key()})).rejects.toThrow('غير مفعل')}
    finally{await query(pool,'UPDATE treasury_configuration SET enabled=?,main_account_id=? WHERE id=1',[old[0].enabled,old[0].main_account_id])}
  })
})
