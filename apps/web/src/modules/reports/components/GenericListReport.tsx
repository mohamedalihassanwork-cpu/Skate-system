import { useCallback, useState } from 'react'
import { Card, PageLoader, Pagination, EmptyState, Button } from '../../../components/ui'
import { reportsApi } from '../reports.api'
import type { PaginatedParams, PaginatedResult } from '../reports.api'
import { useReportData } from '../useReportData'
import { getReportColumns, reportSummaryLabels, monetarySummaryKeys, type ReportRow } from '../reportSchemas'
import { ReportError, ReportMetrics, ReportTable } from './ReportElements'

type Filters = Omit<PaginatedParams, 'startDate' | 'endDate' | 'page' | 'limit'>
interface Props { type: string; startDate: string; endDate: string; filters: Filters }
const notes: Record<string, string> = {
  rentals: 'كل صف يمثل اسكيتاً في إيجار. المدة والقيمة الفعلية قد لا تكون متاحة قبل التسوية. السجلات الملغاة مدرجة ويمكن تصفيتها.',
  late: 'الفترة حسب تاريخ تسجيل الغرامة. التفاصيل قيم الرسوم المسوّاة المسجلة بعد إكمال الإيجار، وليست توزيعاً للتحصيل النقدي. التحصيل الفعلي خلال الفترة لإيجارات النتائج من الخزينة ويظهر منفصلاً، وقد يختلف بسبب تقريب التسوية إلى جنيه كامل. تحليل الكاشير حسب منشئ الإيجار.',
  damage: 'مطالبات العميل والتحصيل والإعفاء وتكلفة الإصلاح مبالغ منفصلة. مجموع الإصلاح يشمل سجلات الصيانة المرتبطة بالضرر.',
  maintenance: 'الفترة حسب تاريخ تسجيل الصيانة. التكلفة المسجلة قد تكون غير مدفوعة أو مدفوعة خارج الخزينة. متوسط المدة يشمل العمليات المكتملة فقط.',
  customers: 'عدد الإيجارات والأضرار حسب تاريخ النشاط، وصافي المدفوعات حسب تاريخ حركة الخزينة. المبيعات المجهولة خارج إنفاق العملاء المحددين.',
  cashiers: 'الإيرادات والمصروفات حسب منفذ الحركة وتاريخها، والإعفاءات حسب منفذ الإعفاء وتاريخه. فرق الوردية هو الفرق المسجل وليس رصيد الخزينة الحالي.',
  skates: 'قيم الإيجار واستخدام الاسكيت حسب البنود. الحالة لقطة حالية. إجمالي المطالبات وتكلفة الصيانة لا يمثلان ربحاً محاسبياً؛ لا توجد نسبة استخدام مفترضة.',
}

export default function GenericListReport({ type, startDate, endDate, filters }: Props) {
  const [page, setPage] = useState(1)
  const load = useCallback(() => {
    const params = { startDate, endDate, ...filters, page, limit: 10 }
    const getters: Record<string, (params: PaginatedParams) => Promise<{ data: PaginatedResult<ReportRow> }>> = {
      rentals: reportsApi.getRentals, late: reportsApi.getLate, damage: reportsApi.getDamage, maintenance: reportsApi.getMaintenance, customers: reportsApi.getCustomers, cashiers: reportsApi.getCashiers, skates: reportsApi.getSkates,
    }
    return getters[type](params)
  }, [type, startDate, endDate, filters, page])
  const { data, loading, error, retry } = useReportData(load)
  if (loading) return <PageLoader label="جارٍ تحميل التقرير" />
  if (error || !data) return <ReportError error={error || 'تعذر تحميل البيانات'} retry={retry} />
  const metrics = Object.entries(data.summary ?? {}).filter(([key]) => key in reportSummaryLabels).map(([key, value]) => ({ label: reportSummaryLabels[key], value, currency: monetarySummaryKeys.has(key) }))
  return <div className="report-stack">
    <p className="report-note">{notes[type]}</p>
    {metrics.length > 0 && <ReportMetrics values={metrics} />}
    {data.byCashier && <Card><h3 className="report-section-title">الغرامات حسب كاشير الإيجار</h3><ReportTable columns={[{ key: 'name', label: 'الكاشير', kind: 'text' }, { key: 'calculatedFees', label: 'المحسوب', kind: 'currency' }, { key: 'collectedFees', label: 'المسوّى المسجل', kind: 'currency' }, { key: 'waivedFees', label: 'المعفى', kind: 'currency' }, { key: 'pendingFees', label: 'بانتظار التسوية', kind: 'currency' }]} rows={data.byCashier} label="الغرامات حسب الكاشير" /></Card>}
    {data.byType && <Card><h3 className="report-section-title">الأضرار حسب النوع</h3><ReportTable columns={[{ key: 'type', label: 'نوع الضرر', kind: 'status' }, { key: 'count', label: 'العدد', kind: 'number' }, { key: 'chargeAmount', label: 'المطالبات', kind: 'currency' }, { key: 'repairCost', label: 'تكلفة الإصلاح', kind: 'currency' }]} rows={data.byType} label="الأضرار حسب النوع" /></Card>}
    <p className="report-note" role="status">إجمالي النتائج: {data.meta.total.toLocaleString('en-US')} · الصفحة {data.meta.page.toLocaleString('en-US')} من {Math.max(1, data.meta.totalPages).toLocaleString('en-US')}</p>
    {data.data.length ? <ReportTable columns={getReportColumns(type)} rows={data.data} label="تفاصيل التقرير" /> : <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تغيير الفترة أو المرشحات" />}
    {data.meta.page > Math.max(1,data.meta.totalPages) && <Button variant="secondary" onClick={() => setPage(1)}>العودة إلى الصفحة الأولى</Button>}
    <Pagination currentPage={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
  </div>
}
