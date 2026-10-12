/**
 * KOSHK SKATE ERP — Finalize Rental Modal
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Shown when ALL Rental Items have been returned and payment can be collected.
 * Displays actual amounts per item (computed by server), total, and payment form.
 *
 * §15: Final invoice generated server-side at finalization.
 * §7: This is where ALL payment for the rental is collected.
 */

import { useState, useEffect } from 'react'
import { CheckCircle, Plus, Trash2 } from 'lucide-react'
import { Modal, Button, Alert, Input, LoadingSpinner } from '../../components/ui'
import { rentalsService, type RentalDTO } from './rentals.service'
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import { formatCurrency } from '../../utils/currency'
import { usePrint } from '../../contexts/PrintContext'

interface FinalizeRentalModalProps {
  isOpen: boolean
  onClose: () => void
  rental: RentalDTO | null
  onSuccess: (rental: RentalDTO) => void
}

export function FinalizeRentalModal({ isOpen, onClose, rental, onSuccess }: FinalizeRentalModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [methods, setMethods] = useState<PaymentMethodDTO[]>([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [payments, setPayments] = useState<{ methodId: number; amount: string }[]>([])

  const { printInvoice } = usePrint()

  // Total from server-computed actual amounts + collected late fees
  const totalAmount = rental?.items.reduce((sum, item) => {
    return sum + (item.actualAmount ?? 0) + (item.lateFeeCollected ?? 0)
  }, 0) ?? 0

  useEffect(() => {
    if (isOpen && rental) {
      setError(null)
      setMethodsLoading(true)
      paymentsService.listMethods()
        .then(res => {
          const fetched = res.data || []
          setMethods(fetched)
          if (fetched.length > 0) {
            setPayments([{ methodId: fetched[0].id, amount: totalAmount.toFixed(0) }])
          }
        })
        .catch(() => setError('تعذر تحميل طرق الدفع'))
        .finally(() => setMethodsLoading(false))
    }
  }, [isOpen, rental?.id])

  if (!isOpen || !rental) return null

  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const isExact = Math.abs(totalPayments - totalAmount) < 0.01

  const handleAddPayment = () => {
    if (methods.length === 0) return
    setPayments([...payments, { methodId: methods[0].id, amount: '' }])
  }

  const handleRemovePayment = (idx: number) => {
    setPayments(payments.filter((_, i) => i !== idx))
  }

  const handleUpdatePayment = (idx: number, field: 'methodId' | 'amount', value: string | number) => {
    const next = [...payments]
    next[idx] = { ...next[idx], [field]: value }
    setPayments(next)
  }

  const handleSubmit = async () => {
    if (!isExact) {
      setError('إجمالي المدفوعات لا يساوي المبلغ الإجمالي')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await rentalsService.finalize(rental.id, {
        payments: payments.map(p => ({
          paymentMethodId: p.methodId,
          amount: parseFloat(p.amount) || 0,
        })),
      })
      const finalizedRental = res.data

      // Build invoice data for printing
      printInvoice({
        type: 'RENTAL',
        invoiceNumber: finalizedRental.invoiceNumber ?? 'N/A',
        transactionCode: finalizedRental.rentalCode,
        date: finalizedRental.completedAt ?? new Date().toISOString(),
        status: finalizedRental.status,
        cashierName: finalizedRental.cashier.name,
        customerName: finalizedRental.customer.name,
        total: finalizedRental.totalAmount ?? 0,
        payments: payments.map(p => ({
          method: methods.find(m => m.id === p.methodId)?.name ?? 'Unknown',
          amount: parseFloat(p.amount) || 0,
        })),
        rentalItems: finalizedRental.items.map(i => ({
          skateBarcode: i.skate.skateCode,
          durationMinutes: i.actualDurationMinutes ?? 0,
          rentalAmount: i.actualAmount ?? 0,
          lateFee: i.lateFeeCollected ?? 0,
        }))
      })

      onSuccess(finalizedRental)
      onClose()
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      setError(errObj?.response?.data?.error?.message ?? errObj?.message ?? 'حدث خطأ أثناء إتمام الإيجار')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`إتمام الإيجار — ${rental.rentalCode}`} size="lg">
      <div className="rental-modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2px' }}>
        {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        {/* Items breakdown */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 12, color: 'var(--color-text-secondary)' }}>
            تفصيل المدة والمبالغ الفعلية
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rental.items.filter(i => i.status === 'returned').map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                    {item.skate.skateCode} — مقاس {item.skate.size}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {item.actualDurationMinutes} دقيقة فعلية
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                    {formatCurrency(item.actualAmount ?? 0)}
                  </div>
                  {(item.lateFeeCollected ?? 0) > 0 && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-600)', marginTop: 2 }}>
                      + {formatCurrency(item.lateFeeCollected!)} غرامة ({item.lateMinutes} د)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', background: 'var(--color-primary-subtle)',
            border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)',
            marginTop: 12, fontWeight: 'var(--font-weight-bold)',
          }}>
            <span>الإجمالي</span>
            <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-primary)' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Payment section */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>الدفع</h3>
            <Button variant="ghost" onClick={handleAddPayment} style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', height: 'auto', minHeight: 'unset' }}>
              <Plus size={14} style={{ marginInlineEnd: 4 }} /> تقسيم
            </Button>
          </div>

          {methodsLoading ? (
            <div style={{ textAlign: 'center', padding: 16 }}><LoadingSpinner /></div>
          ) : methods.length === 0 ? (
            <Alert variant="danger">لا توجد طرق دفع متاحة</Alert>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {payments.map((p, idx) => (
                <div key={idx} className="finalize-payment-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={p.methodId}
                    onChange={e => handleUpdatePayment(idx, 'methodId', parseInt(e.target.value, 10))}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)', appearance: 'auto' }}
                  >
                    {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <Input
                    id={`finalize-payment-amount-${idx}`}
                    label=""
                    type="number"
                    min="0"
                    step="1"
                    value={p.amount}
                    onChange={e => handleUpdatePayment(idx, 'amount', e.target.value)}
                    style={{ width: 110 }}
                  />
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger-text)', cursor: 'pointer', padding: 4 }}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <div className="finalize-payment-totals" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)', fontWeight: 'var(--font-weight-bold)' }}>
                <span style={{ color: isExact ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                  إجمالي المدفوع: {formatCurrency(totalPayments)}
                </span>
                <span>المطلوب: {formatCurrency(totalAmount)}</span>
              </div>
              {!isExact && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-text)' }}>
                  يجب أن يتطابق الإجمالي مع المبلغ المطلوب بالضبط.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rental-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button
          id="finalize-rental-btn"
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!isExact || methodsLoading}
        >
          <CheckCircle size={16} style={{ marginInlineEnd: 6 }} /> إتمام الإيجار وطباعة الفاتورة
        </Button>
      </div>
      <style>{`
        @media screen and (min-width: 1024px) {
          .modal-container .modal-body:has(> .rental-modal-content) {
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            overflow: hidden;
          }
          .modal-body > .rental-modal-content {
            flex: 1 1 auto;
            min-height: 0;
            max-height: none !important;
            padding: var(--space-1) !important;
          }
          .modal-body > .rental-modal-actions { flex: 0 0 auto; flex-wrap: wrap; }
          .finalize-payment-row > select { min-width: 0; height: var(--space-10); padding-block: 0 !important; }
          .finalize-payment-row .field-label:empty { display: none; }
          .finalize-payment-row > .field-wrapper { flex: 0 0 7rem; min-width: 0; }
          .finalize-payment-row > button { flex-shrink: 0; min-width: var(--space-8); min-height: var(--space-8); }
          .finalize-payment-totals { flex-wrap: wrap; gap: var(--space-2); }
        }
      `}</style>
    </Modal>
  )
}
