import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { expenses } from '../../db/schema/treasury.js'
import { users } from '../../db/schema/users.js'
import { lockCashierSession, resolvePaymentAccount, postTreasuryMovement, strictAudit, withFinancialOperation } from '../treasury/treasury-posting.js'
import { BusinessRuleError, ForbiddenError } from '../../utils/errors.js'
import type { CreateExpenseInput, ExpenseDTO } from './expenses.types.js'

export async function recordExpense(cashierId: number, input: CreateExpenseInput): Promise<ExpenseDTO> {
  return await db.transaction(tx => withFinancialOperation(
    tx, cashierId, 'CREATE_EXPENSE', input.operationKey,
    { amount: input.amount, description: input.description, categoryId: input.categoryId ?? null },
    async () => {
      const activeShift = await lockCashierSession(tx, cashierId)
      const shiftId = activeShift.id

      // 2. Insert expense
      const [result] = await tx.insert(expenses).values({
        amount: String(input.amount),
        description: input.description,
        categoryId: input.categoryId || null,
        cashierId,
        shiftId,
      })

      const newId = result.insertId

      // Managed sessions always spend their assigned drawer. Legacy sessions retain
      // their original global cash mapping until the explicit cutover.
      let sourceAccountId = activeShift.treasuryAccountId
      if (!activeShift.managed) {
        const [cashAccountRows] = await tx.execute(
          sql`SELECT id FROM treasury_accounts WHERE is_cash_drawer = true LIMIT 1`
        )
        const cashAccount = (cashAccountRows as unknown as any[])[0]
        if (!cashAccount) {
          throw new BusinessRuleError('لا يوجد درج نقدية محدد في النظام', 'NO_CASH_DRAWER')
        }
        sourceAccountId = cashAccount.id
      }
      const treasuryAccountId = await resolvePaymentAccount(tx, activeShift, sourceAccountId!, cashierId)

      await postTreasuryMovement(tx, {
        accountId: treasuryAccountId,
        amount: String(input.amount),
        type: 'out',
        referenceType: 'expense',
        referenceId: newId,
        cashierId,
        shiftId,
        notes: input.description
      })

      await strictAudit(tx, { userId: cashierId, action: 'CREATE_EXPENSE', entityType: 'EXPENSE', entityId: String(newId), newValue: { amount: input.amount, categoryId: input.categoryId, treasuryAccountId, shiftId } })

      // 5. Fetch inserted
      const [row] = await tx.select().from(expenses).where(eq(expenses.id, newId))
    
      return {
        id: row.id,
        amount: parseFloat(String(row.amount)),
        description: row.description,
        categoryId: row.categoryId,
        cashierId: row.cashierId,
        shiftId: row.shiftId,
        createdAt: row.createdAt.toISOString()
      }
  }))
}

export async function listExpenses(cashierId: number, permissions: readonly string[]): Promise<ExpenseDTO[]> {
  const canViewAll = permissions.includes('expenses.view_all')
  if (!canViewAll && !permissions.includes('expenses.view')) throw new ForbiddenError()
  const rows = await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      description: expenses.description,
      categoryId: expenses.categoryId,
      cashierId: expenses.cashierId,
      cashierName: users.name,
      shiftId: expenses.shiftId,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(users, eq(users.id, expenses.cashierId))
    .where(canViewAll ? undefined : eq(expenses.cashierId, cashierId))
    .orderBy(desc(expenses.createdAt))

  return rows.map(r => ({
    id: r.id,
    amount: parseFloat(String(r.amount)),
    description: r.description,
    categoryId: r.categoryId,
    cashierId: r.cashierId,
    cashierName: r.cashierName || undefined,
    shiftId: r.shiftId,
    createdAt: r.createdAt.toISOString()
  }))
}
