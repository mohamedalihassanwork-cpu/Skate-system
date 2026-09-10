/**
 * KOSHK SKATE ERP — DataTable Component
 * Phase 03.5 — Design System
 *
 * Standard ERP data table. Enforces correct row height, RTL column order,
 * no uppercase on headers, loading skeleton rows, and empty state.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LoadingSkeleton } from './Loading'
import { EmptyState } from './EmptyState'

export interface TableColumn<T = Record<string, unknown>> {
  key: string
  header: string
  render?: (value: unknown, row: T) => ReactNode
  width?: string
  align?: 'right' | 'left' | 'center'
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: LucideIcon
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyIcon,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  return (
    <>
      <div className={['table-wrapper', className].filter(Boolean).join(' ')}>
        <table className="ds-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align ?? 'right',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`} className="table-skeleton-row">
                  {columns.map(col => (
                    <td key={col.key}>
                      <LoadingSkeleton height="1.1rem" radius="var(--radius-sm)" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyMessage}
                    description="جرّب تغيير عوامل التصفية"
                  />
                </td>
              </tr>
            )}

            {!loading && data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={onRowClick ? 'table-row-clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row) }
                } : undefined}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align ?? 'right' }}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '—')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .ds-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-family-base);
          direction: rtl;
        }

        .ds-table thead tr {
          background-color: var(--color-page-bg);
          border-bottom: 1px solid var(--color-border);
        }

        .ds-table th {
          padding: var(--space-3) var(--space-4);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-muted);
          white-space: nowrap;
          /* NO text-transform: uppercase — prohibited on Arabic text */
        }

        .ds-table td {
          padding: var(--space-3) var(--space-4);
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--color-border);
          vertical-align: middle;
        }

        .ds-table tbody tr:last-child td { border-bottom: none; }

        .ds-table tbody tr:hover td { background-color: var(--color-page-bg); }

        .table-row-clickable { cursor: pointer; }
        .table-row-clickable:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: -2px;
        }

        .table-skeleton-row td { padding: var(--space-4) var(--space-4); }

        @media (max-width: 639px) {
          .table-wrapper { border-radius: var(--radius-base); }
        }
      `}</style>
    </>
  )
}
