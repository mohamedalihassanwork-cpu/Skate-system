export interface CreateExpenseInput {
  operationKey?: string
  amount: number
  description: string
  categoryId?: number
}

export interface ExpenseDTO {
  id: number
  amount: number
  description: string
  categoryId?: number | null
  cashierId: number
  cashierName?: string
  shiftId: number
  createdAt: string
}
