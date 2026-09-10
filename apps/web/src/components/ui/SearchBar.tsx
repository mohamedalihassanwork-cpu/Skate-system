/**
 * KOSHK SKATE ERP — SearchBar Component
 * Phase 03.5 — Design System
 */

import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClear?: () => void
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'بحث...',
  onClear,
  className = '',
}: SearchBarProps) {
  const hasValue = value.length > 0

  return (
    <>
      <div className={['searchbar', className].filter(Boolean).join(' ')}>
        <Search
          size={16}
          aria-hidden="true"
          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
        />
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="searchbar-input"
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={() => { onChange(''); onClear?.() }}
            aria-label="مسح البحث"
            className="searchbar-clear"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <style>{`
        .searchbar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          height: 40px;
          padding: 0 var(--space-3);
          background-color: var(--color-white);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-base);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          min-width: 200px;
        }

        .searchbar:focus-within {
          border-color: var(--color-border-focus);
          box-shadow: 0 0 0 3px rgba(77, 106, 153, 0.15);
        }

        .searchbar-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: var(--font-family-base);
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
          text-align: right;
          min-width: 0;
        }

        .searchbar-input::placeholder { color: var(--color-text-muted); }
        .searchbar-input::-webkit-search-decoration,
        .searchbar-input::-webkit-search-cancel-button { display: none; }

        .searchbar-clear {
          display: flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; padding: 0;
          background: none; border: none; cursor: pointer;
          color: var(--color-text-muted); border-radius: var(--radius-sm);
          transition: color var(--transition-fast), background-color var(--transition-fast);
          flex-shrink: 0;
        }

        .searchbar-clear:hover { color: var(--color-text-primary); background-color: var(--color-neutral-bg); }
      `}</style>
    </>
  )
}
