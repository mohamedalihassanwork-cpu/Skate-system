/**
 * KOSHK SKATE ERP — DataTable Component
 * Phase 03.5 — Design System
 * Updated: phone/tablet presentation (MOBILE_TABLET_UI_UX_AUDIT.md).
 *
 * Standard ERP data table. Enforces correct row height, RTL column order,
 * no uppercase on headers, loading skeleton rows, and empty state.
 *
 * PHONE / TABLET PRESENTATION
 *   Below 1024px the same rows can be presented either as the standard
 *   horizontally scrollable table (default, unchanged) or as stacked cards via
 *   `mobileLayout="cards"`. Desktop markup and styling are identical in both
 *   cases — the card list is `display: none` from 1024px up, and the table is
 *   `display: none` below it, so only one presentation is ever rendered and
 *   only one is exposed to assistive technology.
 *
 *   Column `priority` drives which fields appear where in a card:
 *     'primary'   → card header, identity of the row, no label
 *     'secondary' → labelled field row
 *     'detail'    → labelled field row, visually de-emphasised
 *     'actions'   → card footer
 *
 *   With no explicit priority, keyboard/visual order is preserved: the first
 *   column becomes primary, the rest secondary, and any headerless column
 *   becomes the action footer.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LoadingSkeleton } from './Loading'
import { EmptyState } from './EmptyState'

export type TableColumnPriority = 'primary' | 'secondary' | 'detail' | 'actions'

export interface TableColumn<T = Record<string, unknown>> {
  key: string
  header: string
  render?: (value: unknown, row: T) => ReactNode
  width?: string
  align?: 'right' | 'left' | 'center'
  /** Placement of this column's cell within a stacked mobile card. */
  priority?: TableColumnPriority
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: LucideIcon
  onRowClick?: (row: T) => void
  className?: string
  /**
   * 'table' (default) keeps the contained horizontal scroller below 1024px.
   * 'cards' stacks each row as a labelled card below 1024px.
   */
  mobileLayout?: 'table' | 'cards'
  /** Accessible name for the scrollable table region. */
  ariaLabel?: string
}

function resolvePriority<T>(
  col: TableColumn<T>,
  index: number,
  hasExplicit: boolean,
  isPrimaryClaimed: boolean,
): TableColumnPriority {
  if (col.priority) return col.priority
  if (hasExplicit) return 'secondary'
  // No explicit priorities anywhere: headerless columns are action columns,
  // the first column identifies the row, everything else is a labelled field.
  if (!col.header) return 'actions'
  if (index === 0 && !isPrimaryClaimed) return 'primary'
  return 'secondary'
}

/** Renders only when the cell produced real content (permission gates often
 *  return null without a placeholder), so empty fields never leave a gap. */
function cellContent<T extends Record<string, unknown>>(
  col: TableColumn<T>,
  row: T,
): ReactNode | null {
  const value = col.render
    ? col.render(row[col.key], row)
    : (row[col.key] === null || row[col.key] === undefined || row[col.key] === ''
        ? null
        : String(row[col.key]))

  if (value === null || value === undefined || value === false || value === '') return null
  return value
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyIcon,
  onRowClick,
  className = '',
  mobileLayout = 'table',
  ariaLabel,
}: DataTableProps<T>) {
  const usesCards = mobileLayout === 'cards' && columns.length > 0

  const hasExplicitPriority = columns.some(col => col.priority !== undefined)
  let primaryClaimed = false
  const resolved: TableColumnPriority[] = columns.map((col, index) => {
    const priority = resolvePriority(col, index, hasExplicitPriority, primaryClaimed)
    if (priority === 'primary') primaryClaimed = true
    return priority
  })

  const cardColumns = usesCards
    ? columns
        .map((col, index) => ({ col, priority: resolved[index] }))
        .filter(entry => entry.priority !== 'primary')
    : []

  // Interaction props only — `key` stays explicit at the call site so it is
  // statically visible to React tooling (spread keys defeat the linter).
  const rowProps = (row: T) => ({
    className: onRowClick ? 'table-row-clickable' : '',
    onClick: onRowClick ? () => onRowClick(row) : undefined,
    tabIndex: onRowClick ? 0 : undefined,
    role: onRowClick ? ('button' as const) : undefined,
    onKeyDown: onRowClick
      ? (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRowClick(row)
          }
        }
      : undefined,
  })

  const emptyState = (
    <EmptyState icon={emptyIcon} title={emptyMessage} description="جرّب تغيير عوامل التصفية" />
  )

  return (
    <>
      <div
        className={['table-wrapper', className].filter(Boolean).join(' ')}
        data-mobile-layout={usesCards ? 'cards' : undefined}
        role={ariaLabel ? 'region' : undefined}
        aria-label={ariaLabel}
        tabIndex={ariaLabel ? 0 : undefined}
      >
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
                  {emptyState}
                </td>
              </tr>
            )}

            {!loading && data.map((row, rowIdx) => (
              <tr key={rowIdx} {...rowProps(row)}>
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

      {usesCards && (
        <div className="table-cards" role="list">
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={`card-skel-${i}`} className="table-card table-card--skeleton">
              <LoadingSkeleton height="1.25rem" radius="var(--radius-sm)" />
              <LoadingSkeleton height="1rem" radius="var(--radius-sm)" />
            </div>
          ))}

          {!loading && data.length === 0 && (
            <div className="table-cards-empty">{emptyState}</div>
          )}

          {!loading && data.map((row, rowIdx) => {
            const headerColumns = columns.filter((_, i) => resolved[i] === 'primary')
            const fieldEntries = cardColumns
              .filter(entry => entry.priority === 'secondary' || entry.priority === 'detail')
              .map(entry => ({ ...entry, content: cellContent(entry.col, row) }))
              .filter(entry => entry.content !== null)
            const actionEntries = cardColumns
              .filter(entry => entry.priority === 'actions')
              .map(entry => ({ ...entry, content: cellContent(entry.col, row) }))
              .filter(entry => entry.content !== null)

            const headerContent = headerColumns
              .map(col => cellContent(col, row))
              .filter(content => content !== null)

            return (
              <div
                key={rowIdx}
                {...rowProps(row)}
                role="listitem"
              >
                {headerContent.length > 0 && (
                  <div className="table-card-header">
                    <div className="table-card-title">{headerContent}</div>
                  </div>
                )}

                {fieldEntries.length > 0 && (
                  <dl className="table-card-fields">
                    {fieldEntries.map(entry => (
                      <div
                        key={entry.col.key}
                        className={`table-card-field${entry.priority === 'detail' ? ' table-card-field--detail' : ''}`}
                      >
                        <dt className="table-card-label">{entry.col.header}</dt>
                        <dd className="table-card-value">{entry.content}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {actionEntries.length > 0 && (
                  <div
                    className="table-card-actions"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {actionEntries.map(entry => (
                      <div key={entry.col.key} className="table-card-action-group">
                        {entry.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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

        /* Stacked card presentation. Only rendered when mobileLayout="cards";
           hidden above the phone/tablet breakpoint so desktop is untouched. */
        .table-cards { display: none; }

        @media screen and (max-width: 1023px) {
          body .table-wrapper { border-radius: var(--radius-base); }

          /* Card mode: replace the scroller entirely with the card list. The
             table branch keys off the opt-in data attribute only, so raw
             .ds-table markup elsewhere (e.g. the sale-details invoice items)
             is never affected. Both branches use display:none, so only one is
             in the accessibility tree at a time. */
          body .table-wrapper[data-mobile-layout='cards'] { display: none; }

          .table-cards {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }

          .table-card {
            min-width: 0;
            padding: var(--space-4);
            background-color: var(--color-white);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xs);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
            overflow-wrap: anywhere;
          }

          .table-card:focus-visible {
            outline: 2px solid var(--color-border-focus);
            outline-offset: 2px;
          }

          .table-card--skeleton { gap: var(--space-3); }

          .table-card-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: var(--space-3);
            min-width: 0;
          }

          /* Identity line — semibold navy, matches the desktop first cell. */
          .table-card-title {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--space-2);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            color: var(--color-navy-800);
            line-height: var(--line-height-tight);
          }

          /* A trailing badge/status in the header stays on the same line. */
          .table-card-title > .badge { flex-shrink: 0; }

          .table-card-fields {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: var(--space-2);
            margin: 0;
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-border);
          }

          .table-card-field {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: var(--space-3);
            min-width: 0;
          }

          .table-card-label {
            flex-shrink: 0;
            color: var(--color-text-secondary);
            font-size: var(--font-size-sm);
          }

          .table-card-value {
            min-width: 0;
            margin: 0;
            text-align: start;
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-primary);
            overflow-wrap: anywhere;
          }

          .table-card-field--detail .table-card-label,
          .table-card-field--detail .table-card-value {
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            font-weight: var(--font-weight-regular);
            font-variant-numeric: tabular-nums;
          }

          .table-card-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--space-2);
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-border);
          }

          .table-card-action-group { display: flex; align-items: center; gap: var(--space-2); }

          /* Touch target sizing is owned by mobile-shared.css for body buttons;
             these keep the card footer from collapsing the label text. */
          .table-card-actions .btn { flex: 0 1 auto; }

          .table-cards-empty {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            background-color: var(--color-white);
          }
        }

        @media screen and (max-width: 639px) {
          .table-wrapper { border-radius: var(--radius-base); }
        }
      `}</style>
    </>
  )
}
