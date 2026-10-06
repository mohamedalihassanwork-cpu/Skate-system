import { useEffect, useState } from 'react'
import { reportsApi } from '../reports.api'
import type { PaginatedResult } from '../reports.api'
import { FileText } from 'lucide-react'
import { formatCurrency } from '../../../utils/currency'
import { formatDateTime } from '../../../utils/date'
import { PageLoader, Alert, DataTable, type TableColumn, Pagination } from '../../../components/ui'

interface Props {
  type: string
  startDate: string
  endDate: string
}

export default function GenericListReport({ type, startDate, endDate }: Props) {
  const [data, setData] = useState<PaginatedResult<any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [type, startDate, endDate])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let res;
        const params = { startDate, endDate, page, limit: 10 }
        switch (type) {
          case 'rentals': res = await reportsApi.getRentals(params); break;
          case 'late': res = await reportsApi.getLate(params); break;
          case 'damage': res = await reportsApi.getDamage(params); break;
          case 'maintenance': res = await reportsApi.getMaintenance(params); break;
          case 'customers': res = await reportsApi.getCustomers(params); break;
          case 'cashiers': res = await reportsApi.getCashiers(params); break;
          case 'skates': res = await reportsApi.getSkates(params); break;
          default: throw new Error('تقرير غير معروف')
        }
        setData(res.data)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [type, startDate, endDate, page])

  if (loading && !data) {
    return <PageLoader label="جارٍ تحميل التقرير..." />
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>
  }

  if (!data || data.data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '256px', color: 'var(--color-text-muted)', gap: 'var(--space-2)' }}>
        <FileText size={48} style={{ opacity: 0.3 }} />
        <p style={{ fontWeight: 'var(--font-weight-medium)' as any }}>لا توجد بيانات لهذا التقرير في الفترة المحددة</p>
      </div>
    )
  }

  const rawColumns = Object.keys(data.data[0]).filter(k => k !== 'id')

  const formatHeader = (key: string) => {
    const map: Record<string, string> = {
      amount: 'القيمة', totalAmount: 'القيمة الإجمالية', rentalAmount: 'قيمة الإيجارات',
      totalRevenue: 'إجمالي الإيرادات', totalSpent: 'إجمالي الإنفاق',
      startTime: 'وقت البدء', endTime: 'وقت الانتهاء', startedAt: 'وقت البدء',
      actualReturnTime: 'وقت الإرجاع الفعلي', reportedAt: 'وقت الإبلاغ',
      customerName: 'اسم العميل', skateCode: 'كود الاسكيت', cashierName: 'الكاشير',
      duration: 'المدة (دقيقة)', status: 'الحالة', type: 'النوع', category: 'الفئة',
      lateFee: 'غرامة التأخير', chargeAmount: 'قيمة التحصيل', repairCost: 'تكلفة الإصلاح',
      damageType: 'نوع الضرر', problemType: 'نوع المشكلة', description: 'الوصف',
      severity: 'الشدة',
      rentalsCount: 'عدد الإيجارات', damages: 'عدد الأضرار', maintenanceCount: 'مرات الصيانة',
      lateReturns: 'مرات التأخير', shiftsCount: 'عدد الورديات', totalDifference: 'العجز/الزيادة',
      completedAt: 'وقت الانتهاء', date: 'التاريخ',
      name: 'الاسم', code: 'الكود', shiftDifference: 'فرق العهدة', expenses: 'المصروفات',
      rentalPayments: 'مدفوعات الإيجار', revenue: 'الإيرادات', rentalRevenue: 'إيرادات الإيجار',
      maintenanceCost: 'تكلفة الصيانة', damageCount: 'مرات التلف'
    }
    return map[key] || key
  }

  const statusMap: Record<string, string> = {
    active: 'نشط', returned: 'تم الإرجاع', cancelled: 'ملغى',
    pending: 'معلق', in_progress: 'قيد التنفيذ', completed: 'مكتمل',
    paid: 'مدفوع', partially_paid: 'مدفوع جزئياً', waived: 'تم الإعفاء',
    minor: 'بسيط', moderate: 'متوسط', severe: 'شديد',
    wheel: 'عجلة', strap: 'حزام', brake: 'فرامل', bearing: 'رمان بلي', body: 'هيكل', other: 'أخرى',
  }

  const formatCell = (key: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (key === 'status' || key === 'severity' || key === 'damageType') {
      return statusMap[value] || String(value)
    }
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('spent') || key.toLowerCase().includes('fee') || key.toLowerCase().includes('revenue') || key === 'totalDifference') {
      return formatCurrency(Number(value))
    }
    if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
      return formatDateTime(value)
    }
    return String(value)
  }

  // Map to DataTable columns
  const columns: TableColumn<any>[] = rawColumns.map(col => ({
    key: col,
    header: formatHeader(col),
    render: (_, row: any) => (
      <span style={{
        fontFamily: (col.toLowerCase().includes('amount') || col.toLowerCase().includes('cost') || col === 'totalDifference') ? 'monospace' : 'var(--font-family-base)',
        fontWeight: (col.toLowerCase().includes('amount') || col.toLowerCase().includes('cost') || col === 'totalDifference') ? 'var(--font-weight-bold)' as any : 'var(--font-weight-regular)' as any,
        color: (col.toLowerCase().includes('amount') || col.toLowerCase().includes('cost') || col === 'totalDifference') ? 'var(--color-navy-800)' : 'inherit'
      }}>
        {formatCell(col, row[col])}
      </span>
    )
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <DataTable
        columns={columns}
        data={data.data}
        emptyMessage="لا توجد بيانات."
      />

      {data.meta.totalPages > 1 && (
        <Pagination
          currentPage={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
