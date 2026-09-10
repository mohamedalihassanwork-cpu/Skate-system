/**
 * KOSHK SKATE ERP — Pagination Component
 * Phase 03.5 — Design System
 *
 * RTL-aware page navigation.
 * In RTL: "next page" visually on LEFT, "previous page" visually on RIGHT.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <>
      <nav
        aria-label="التنقل بين الصفحات"
        className={['pagination', className].filter(Boolean).join(' ')}
      >
        {/* Next page — LEFT side in RTL */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="الصفحة التالية"
          className="pagination-btn"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        {pages.map((page, idx) => (
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={['pagination-btn', page === currentPage ? 'pagination-btn--active' : ''].filter(Boolean).join(' ')}
            >
              {page}
            </button>
          )
        ))}

        {/* Previous page — RIGHT side in RTL */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="الصفحة السابقة"
          className="pagination-btn"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>

      <style>{`
        .pagination {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          direction: rtl;
          flex-wrap: wrap;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 var(--space-2);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-base);
          background-color: var(--color-white);
          color: var(--color-text-primary);
          font-family: var(--font-family-base);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: var(--color-navy-50);
          border-color: var(--color-navy-500);
          color: var(--color-navy-800);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-btn--active {
          background-color: var(--color-navy-800);
          border-color: var(--color-navy-800);
          color: var(--color-white);
          font-weight: var(--font-weight-bold);
        }

        .pagination-btn--active:hover:not(:disabled) {
          background-color: var(--color-navy-700);
          border-color: var(--color-navy-700);
          color: var(--color-white);
        }

        .pagination-btn:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }

        .pagination-ellipsis {
          display: flex;
          align-items: center;
          padding: 0 var(--space-2);
          color: var(--color-text-muted);
          font-size: var(--font-size-sm);
          user-select: none;
        }
      `}</style>
    </>
  )
}
