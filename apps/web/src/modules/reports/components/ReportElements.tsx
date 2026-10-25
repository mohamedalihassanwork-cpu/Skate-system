import { Alert, Button, DataTable, Card } from '../../../components/ui'
import { formatCurrency } from '../../../utils/currency'
import { formatReportCell, type ReportColumn, type ReportRow } from '../reportSchemas'

export function ReportError({ error, retry }: { error: string; retry: () => void }) {
  return <Alert variant="danger"><p>{error}</p><Button variant="secondary" onClick={retry}>إعادة المحاولة</Button></Alert>
}
export function ReportTable({ columns, rows, label }: { columns: ReportColumn[]; rows: ReportRow[]; label: string }) {
  return <DataTable columns={columns.map(column => ({ key: column.key, header: column.label, render: (value: unknown) => <span style={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{formatReportCell(column, value)}</span> }))} data={rows} ariaLabel={label} mobileLayout="cards" emptyMessage="لا توجد بيانات في الفترة المحددة" />
}
export function ReportMetrics({ values }: { values: { label: string; value: number | null | undefined; currency?: boolean; suffix?: string }[] }) {
  return <div className="report-kpi-grid">{values.map(metric => <Card key={metric.label} padding="compact" className="report-kpi-card"><p className="report-metric-label">{metric.label}</p><p className="report-metric-value">{metric.currency ? formatCurrency(metric.value) : metric.value == null ? '—' : metric.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}{metric.suffix}</p></Card>)}</div>
}
