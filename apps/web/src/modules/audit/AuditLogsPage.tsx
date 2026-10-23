import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Loader2, FileText, ChevronLeft, ChevronRight, Activity, FilterX } from 'lucide-react'
import { auditApi, type AuditLogDTO } from './audit.api'
import { formatDateTime } from '../../utils/date'
import { usersService } from '../users/users.service'
import type { UserDTO } from '../users/users.service'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDTO[]>([])
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    entityType: '',
    action: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const fetchUsers = async () => {
    try {
      const data = await usersService.list()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users for filter', err)
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const params: any = { page, limit }
      if (filters.userId) params.userId = Number(filters.userId)
      if (filters.entityType) params.entityType = filters.entityType
      if (filters.action) params.action = filters.action

      const res = await auditApi.getLogs(params)
      setLogs(res.data)
      setTotalPages(res.meta.totalPages || 1)
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل سجل التدقيق')
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({ userId: '', entityType: '', action: '' })
    setPage(1)
  }

  const translateAction = (action: string) => {
    const map: Record<string, string> = {
      CREATE: 'إنشاء',
      UPDATE: 'تحديث',
      DELETE: 'حذف',
      LOGIN: 'تسجيل دخول',
      LOGOUT: 'تسجيل خروج',
      PAYMENT: 'دفع',
      RETURN: 'إرجاع',
      DAMAGE: 'تلف',
      MAINTENANCE: 'صيانة',
    }
    return map[action] || action
  }

  const translateEntityType = (type: string) => {
    const map: Record<string, string> = {
      RENTAL: 'إيجار',
      SKATE: 'اسكيت',
      CUSTOMER: 'عميل',
      USER: 'مستخدم',
      ROLE: 'صلاحية',
      PAYMENT: 'دفعة',
      DAMAGE: 'تلف',
      MAINTENANCE: 'صيانة',
      SETTING: 'إعدادات',
    }
    return map[type] || type
  }

  return (
    <div className="space-y-6 audit-page">
      <div className="flex items-center gap-4 audit-page-header">
        <Activity className="w-8 h-8 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 audit-page-title">سجل التدقيق</h1>
          <p className="text-slate-500 text-sm audit-page-subtitle">سجل شامل لجميع الحركات والتغييرات في النظام</p>
        </div>
      </div>

      <Card className="audit-card">
        <div className="bg-slate-50 border-b p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end audit-filters">
            <div className="space-y-1.5 flex-1 w-full">
              <label htmlFor="audit-user" className="text-sm font-medium text-slate-700">المستخدم</label>
              <select
                id="audit-user"
                value={filters.userId}
                onChange={(e: any) => { setFilters(f => ({ ...f, userId: e.target.value })); setPage(1) }}
                className="w-full h-10 px-3 rounded-md border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">الكل</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 flex-1 w-full">
              <label htmlFor="audit-entity" className="text-sm font-medium text-slate-700">نوع الكيان</label>
              <select
                id="audit-entity"
                value={filters.entityType}
                onChange={(e: any) => { setFilters(f => ({ ...f, entityType: e.target.value })); setPage(1) }}
                className="w-full h-10 px-3 rounded-md border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">الكل</option>
                <option value="RENTAL">إيجار</option>
                <option value="SKATE">اسكيت</option>
                <option value="CUSTOMER">عميل</option>
                <option value="PAYMENT">دفعة</option>
                <option value="DAMAGE">تلف</option>
                <option value="MAINTENANCE">صيانة</option>
                <option value="USER">مستخدم</option>
                <option value="ROLE">صلاحية</option>
                <option value="SETTING">إعدادات</option>
              </select>
            </div>

            <div className="space-y-1.5 flex-1 w-full">
              <label htmlFor="audit-action" className="text-sm font-medium text-slate-700">العملية</label>
              <select
                id="audit-action"
                value={filters.action}
                onChange={(e: any) => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1) }}
                className="w-full h-10 px-3 rounded-md border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">الكل</option>
                <option value="CREATE">إنشاء</option>
                <option value="UPDATE">تحديث</option>
                <option value="DELETE">حذف</option>
                <option value="PAYMENT">دفع</option>
                <option value="RETURN">إرجاع</option>
              </select>
            </div>

            {(filters.userId || filters.entityType || filters.action) && (
              <Button variant="secondary" onClick={clearFilters} className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                <FilterX className="w-4 h-4 ml-2" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </div>

        <div className="p-0">
          {error && (
            <div className="p-4 m-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {loading && logs.length === 0 ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400" />
              <p className="mt-4 text-slate-500">جاري تحميل السجل...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>لا يوجد سجلات مطابقة للبحث</p>
            </div>
          ) : (
            <div className="overflow-x-auto audit-table-scroll" role="region" aria-label="جدول سجل التدقيق" tabIndex={0}>
              <table className="w-full text-sm text-right audit-data-table">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3 text-center audit-col-id">رقم</th>
                    <th className="px-4 py-3 audit-col-date">التاريخ والوقت</th>
                    <th className="px-4 py-3 audit-col-user">المستخدم</th>
                    <th className="px-4 py-3 audit-col-action">العملية</th>
                    <th className="px-4 py-3 audit-col-entity">الكيان</th>
                    <th className="px-4 py-3 audit-col-entity-id">معرف الكيان</th>
                    <th className="px-4 py-3 audit-col-ip">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs audit-col-id">#{log.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap audit-col-date" dir="ltr">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium audit-col-user">
                        {log.userName || <span className="text-slate-400">النظام</span>}
                      </td>
                      <td className="px-4 py-3 audit-col-action">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-800'
                          }`}>
                          {translateAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 audit-col-entity">
                        {translateEntityType(log.entityType)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs audit-col-entity-id">
                        {log.entityId}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono audit-col-ip" dir="ltr">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between bg-slate-50 audit-pagination">
              <div className="text-sm text-slate-500">
                صفحة <span className="font-medium text-slate-900">{page}</span> من <span className="font-medium text-slate-900">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronRight className="w-4 h-4 ml-1" />
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  التالي
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      <style>{`
        /*
          Phone/tablet presentation. This table is read-only and its value is
          column-aligned comparison, so a stacked card layout would lose the
          scanability that makes an audit log useful. Instead the table is
          tightened so the five columns an auditor actually reads on a small
          screen — row id, time, user, action, entity — fit without deep
          horizontal scrolling, and the two low-value technical columns
          (entity id, IP address) are dropped rather than clipped, since
          neither is actionable on a phone.
        */
        @media screen and (max-width: 1023px) {
          .audit-page { padding: var(--page-padding-mobile); max-width: 100%; margin: 0; min-width: 0; }
          .audit-page-header { gap: var(--space-3); align-items: flex-start; }
          .audit-page-title { font-size: var(--font-size-2xl); color: var(--color-navy-800); margin: 0; line-height: var(--line-height-tight); overflow-wrap: anywhere; }
          .audit-page-subtitle { color: var(--color-text-secondary); margin: var(--space-1) 0 0; }
          .audit-page .audit-card { padding: 0 !important; overflow: hidden; min-width: 0; }
          .audit-page .audit-filters {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
            align-items: end;
            gap: var(--space-3);
            padding: var(--space-4);
          }
          .audit-filters > div { min-width: 0; }
          .audit-filters label { display: block; color: var(--color-text-secondary); margin-bottom: var(--space-1); }
          .audit-filters select {
            width: 100%; min-width: 0; min-height: 44px;
            padding-inline: var(--space-3);
            border: 1.5px solid var(--color-border);
            border-radius: var(--radius-base);
            background: var(--color-white);
            color: var(--color-text-primary);
            font-size: var(--font-size-base);
          }
          .audit-filters select:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

          .audit-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-inline: contain; -webkit-overflow-scrolling: touch; }
          .audit-data-table { width: 100%; border-collapse: collapse; direction: rtl; font-variant-numeric: tabular-nums; }
          .audit-data-table th, .audit-data-table td { padding: var(--space-3) var(--space-3); text-align: right; vertical-align: middle; overflow-wrap: anywhere; }
          .audit-data-table th { background: var(--color-page-bg); color: var(--color-text-secondary); font-weight: var(--font-weight-semibold); white-space: nowrap; font-size: var(--font-size-sm); }
          .audit-data-table td { border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); font-size: var(--font-size-sm); }
          .audit-data-table tr:last-child td { border-bottom: 0; }
          .audit-col-entity-id, .audit-col-ip { display: none; }
          .audit-col-action { white-space: nowrap; }

          /* Pagination keeps both controls reachable and wraps the page count. */
          .audit-pagination { flex-wrap: wrap; gap: var(--space-3); }
        }

        @media screen and (min-width: 1024px) {
          .audit-page { padding: var(--page-padding); max-width: var(--content-max-width); margin-inline: auto; min-width: 0; }
          .audit-page-header { margin-bottom: var(--space-6); }
          .audit-page-title { font-size: var(--font-size-3xl); color: var(--color-navy-800); margin: 0; }
          .audit-page-subtitle { color: var(--color-text-secondary); margin: var(--space-1) 0 0; }
          .audit-page .audit-card { padding: 0 !important; overflow: hidden; min-width: 0; }
          .audit-page .audit-filters {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
            align-items: end;
            gap: var(--space-4);
          }
          .audit-filters > div { min-width: 0; }
          .audit-filters label { display: block; color: var(--color-text-secondary); }
          .audit-filters select { min-width: 0; min-height: 44px; background: var(--color-white); color: var(--color-text-primary); }
          .audit-filters select:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
          .audit-table-scroll { width: 100%; overflow-x: auto; }
          .audit-data-table { width: 100%; border-collapse: collapse; direction: rtl; }
          .audit-data-table th, .audit-data-table td { padding: var(--space-3) var(--space-4); text-align: right; vertical-align: middle; }
          .audit-data-table th { background: var(--color-page-bg); color: var(--color-text-secondary); font-weight: var(--font-weight-semibold); white-space: nowrap; }
          .audit-data-table td { border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
          .audit-data-table tr:last-child td { border-bottom: 0; }
          .audit-data-table tbody tr:hover { background: var(--color-page-bg); }
        }
      `}</style>
    </div>
  )
}
