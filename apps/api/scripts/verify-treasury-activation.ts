import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { assertDisposableTarget, readHistory, assertHistoryUnchanged, rows } from './migration-0020'

async function main() {
  assertDisposableTarget(process.env.DB_NAME || '')
  if (process.env.NODE_ENV !== 'development') throw new Error('Activation requires an explicitly isolated environment')
  const { pool } = await import('../src/db/connection')
  try {
    const [manager] = await rows(pool as any, 'SELECT id FROM users WHERE email=?', ['migration-verifier@example.invalid'])
    assert.ok(manager, 'Seed must provide the disposable fixture manager')
    const permissions = await rows(pool as any, 'SELECT DISTINCT p.' + String.fromCharCode(96) + 'key' + String.fromCharCode(96) + ' permissionKey FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=?', [manager.id])
    const actor = { id: manager.id, permissions: permissions.map(row => row.permissionKey) }
    assert.ok(actor.permissions.includes('treasury.assign'))
    const history = await readHistory(pool as any)
    delete history.treasury_configuration
    const { createAccount, activate, getConfig } = await import('../src/modules/treasury/treasury.service')
    const main = await createAccount(actor, { operationKey: randomUUID(), name: 'Disposable receiving cash',
      nameAr: 'خزينة تحقق مؤقتة', isCashDrawer: true })
    const electronic = await createAccount(actor, { operationKey: randomUUID(), name: 'Disposable electronic',
      nameAr: 'حساب إلكتروني للتحقق', isCashDrawer: false })
    const input = { operationKey: randomUUID(), mainAccountId: main.id }
    assert.deepEqual(await activate(actor, input), { enabled: true, mainAccountId: main.id })
    assert.deepEqual(await activate(actor, input), { enabled: true, mainAccountId: main.id })
    assert.deepEqual(await getConfig(), { enabled: true, mainAccountId: main.id })
    const [config] = await rows(pool as any, 'SELECT * FROM treasury_configuration WHERE id=1')
    assert.equal(config.activated_by, manager.id); assert.ok(config.activated_at)
    const audits = await rows(pool as any, "SELECT id FROM audit_logs WHERE action='ACTIVATE_SUBTREASURIES' AND user_id=?", [manager.id])
    assert.equal(audits.length, 1)
    const accounts = await rows(pool as any, 'SELECT id,balance,is_cash_drawer FROM treasury_accounts WHERE id IN (?,?) ORDER BY id', [main.id, electronic.id])
    assert.equal(accounts.length, 2)
    assert.ok(accounts.every(row => String(row.balance) === '0.00'))
    const preservedRows = await assertHistoryUnchanged(pool as any, history,
      new Set(['treasury_accounts', 'financial_operations', 'audit_logs']))
    console.log(JSON.stringify({ activated: true, distinctCashAndElectronicAccounts: true,
      noDuplicateActivationAudit: true, newAccountBalances: '0.00', preservedRows }))
  } finally { await pool.end() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
