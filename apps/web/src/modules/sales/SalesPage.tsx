import { useState, useEffect, useCallback } from 'react'
import { ListOrdered, Loader2, Ban, Eye, X } from 'lucide-react'
import { salesApi, type Sale } from './sales.api'
import { Button, SearchBar, useToast, DataTable, Badge, type TableColumn, PageLoader, Modal, ConfirmDialog } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { useMobilePresentation } from '../../hooks/useMobilePresentation'

function formatDate(isoString: string) {
  const d = new Date(isoString)
  return new Intl.DateTimeFormat('ar-EG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

export default function SalesPage() {
  const { hasPermission } = useAuth()
  const canCancel = hasPermission('sales.cancel')
  const { showToast } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [selectedSaleData, setSelectedSaleData] = useState<Sale | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null)
  const clearPendingCancellation = useCallback(() => setCancelSaleId(null), [])
  const compactView = useMobilePresentation(clearPendingCancellation)

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    try {
      setLoading(true)
      const res = await salesApi.getSales()
      setSales(res.data)
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تحميل سجل المبيعات' })
    } finally {
      setLoading(false)
    }
  }

  async function handleViewDetails(id: number) {
    setSelectedSaleId(id)
    setSelectedSaleData(null)
    setLoadingDetails(true)
    try {
      const res = await salesApi.getSale(id)
      setSelectedSaleData(res.data)
    } catch {
      showToast({ type: 'error', title: 'تعذر تحميل تفاصيل الفاتورة' })
      setSelectedSaleId(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleCancelSale(id: number) {
    if (compactView) {
      setCancelSaleId(id)
      return
    }
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة واسترجاع المخزون؟')) return
    await cancelSale(id)
  }

  async function cancelSale(id: number) {
    try {
      await salesApi.cancelSale(id)
      showToast({ type: 'success', title: 'تم إلغاء الفاتورة بنجاح' })
      fetchSales()
      if (selectedSaleId === id) handleViewDetails(id)
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || 'خطأ في الإلغاء' })
    }
  }

  const filteredSales = sales.filter(s => s.saleCode.toLowerCase().includes(search.toLowerCase()))

  const columns: TableColumn<any>[] = [
    { key: 'code', header: 'رقم الفاتورة', render: (_, r: any) => <span style={{ fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)' }}>{r.saleCode}</span> },
    { key: 'date', header: 'التاريخ والوقت', render: (_, r: any) => formatDate(r.createdAt) },
    { key: 'total', header: 'الإجمالي', render: (_, r: any) => <span style={{ fontWeight: 'var(--font-weight-bold)' as any }}>{r.totalAmount} ج.م</span> },
    { key: 'status', header: 'الحالة', render: (_, r: any) => (
      <Badge status={r.status === 'completed' ? 'completed' : 'cancelled'}>
        {r.status === 'completed' ? 'مكتمل' : 'ملغى'}
      </Badge>
    ) },
    { key: 'actions', header: '', align: 'left', render: (_, r: any) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(r.id)} title="التفاصيل">
          <Eye size={16} />
        </Button>
        {canCancel && r.status === 'completed' && (
          <Button variant="danger" size="sm" onClick={() => handleCancelSale(r.id)} title="إلغاء الفاتورة">
            <Ban size={16} />
          </Button>
        )}
      </div>
    ) },
  ]

  const saleDetailsBody = (
    <div className="sale-details-body" style={{ padding: 'var(--space-6)', overflowY: 'auto', flex: 1 }}>
      {loadingDetails ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><Loader2 style={{ animation: 'spin 1s linear infinite', color: 'var(--color-navy-500)' }} size={32} /></div>
      ) : selectedSaleData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="sale-details-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-1)' }}>رقم الفاتورة</p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' as any, margin: 0 }}>{selectedSaleData.saleCode}</p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-1)' }}>التاريخ</p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' as any, margin: 0 }}>{formatDate(selectedSaleData.createdAt)}</p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-1)' }}>الحالة</p>
              <Badge status={selectedSaleData.status === 'completed' ? 'completed' : 'cancelled'}>
                {selectedSaleData.status === 'completed' ? 'مكتمل' : 'ملغى'}
              </Badge>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-1)' }}>الإجمالي</p>
              <p style={{ fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-gold-600)', fontSize: 'var(--font-size-lg)', margin: 0 }}>{selectedSaleData.totalAmount} ج.م</p>
            </div>
          </div>

          <div className="sale-details-items" role="region" aria-label="عناصر الفاتورة" tabIndex={0}>
            <h4 style={{ fontWeight: 'var(--font-weight-semibold)' as any, marginBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-1)' }}>عناصر الفاتورة</h4>
            <table className="ds-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>رقم المنتج</th>
                  <th style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>السعر</th>
                  <th style={{ padding: 'var(--space-2) 0', textAlign: 'center' }}>الكمية</th>
                  <th style={{ padding: 'var(--space-2) 0', textAlign: 'left' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {selectedSaleData.items?.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: 'var(--space-2) 0' }}>ID: {item.productId}</td>
                    <td style={{ padding: 'var(--space-2) 0' }}>{item.unitPrice} ج.م</td>
                    <td style={{ padding: 'var(--space-2) 0', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: 'var(--space-2) 0', textAlign: 'left', fontWeight: 'var(--font-weight-semibold)' as any }}>{item.totalPrice} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 style={{ fontWeight: 'var(--font-weight-semibold)' as any, marginBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-1)' }}>المدفوعات</h4>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {selectedSaleData.payments?.map(p => (
                <span key={p.id} style={{ backgroundColor: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', padding: '4px 12px', borderRadius: 'var(--radius-base)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)' }}>
                  {p.amount} ج.م
                </span>
              ))}
            </div>
          </div>

          {canCancel && selectedSaleData.status === 'completed' && (
            <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="danger" onClick={() => handleCancelSale(selectedSaleData.id)}>
                <Ban size={16} />
                إلغاء الفاتورة واسترجاع المخزون
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>لا توجد بيانات</div>
      )}
    </div>
  )

  if (loading) {
    return <PageLoader label="جارٍ تحميل سجل المبيعات" />
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">سجل المبيعات</h1>
          <p className="page-header-subtitle">{sales.length} فاتورة مسجلة</p>
        </div>
      </div>

      <div className="filters-row">
        <SearchBar
          value={search}
          onChange={(val) => setSearch(val)}
          placeholder="البحث برقم الفاتورة..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredSales as any[]}
        emptyMessage={search ? 'لا توجد نتائج تطابق بحثك.' : 'لا توجد مبيعات مسجلة.'}
        emptyIcon={ListOrdered}
      />

      {/* Details Modal */}
      {selectedSaleId && (compactView ? (
        <Modal isOpen={true} onClose={() => setSelectedSaleId(null)} title="تفاصيل الفاتورة" size="lg" closeOnBackdrop={false}>
          {saleDetailsBody}
        </Modal>
      ) : (
        <div className="sale-details-overlay" style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,25,41,0.5)', backdropFilter: 'blur(4px)', padding: 'var(--space-4)' }}>
          <div className="sale-details-panel" style={{ backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="sale-details-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-navy-800)', color: 'var(--color-white)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)' as any, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0 }}><ListOrdered size={18}/> تفاصيل الفاتورة</h3>
              <button onClick={() => setSelectedSaleId(null)} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-full)' }}>
                <X size={20} />
              </button>
            </div>

            {saleDetailsBody}
          </div>
        </div>
      ))}

      {compactView && cancelSaleId !== null && (
        <ConfirmDialog
          isOpen={true}
          title="إلغاء الفاتورة"
          description="هل أنت متأكد من إلغاء هذه الفاتورة واسترجاع المخزون؟"
          confirmLabel="إلغاء الفاتورة"
          cancelLabel="تراجع"
          onCancel={() => setCancelSaleId(null)}
          onConfirm={() => {
            const id = cancelSaleId
            setCancelSaleId(null)
            void cancelSale(id)
          }}
        />
      )}
    </div>
  )
}
