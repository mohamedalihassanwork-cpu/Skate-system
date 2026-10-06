/**
 * KOSHK SKATE ERP — TagInput Component
 * Phase 05.5 — Settings Administration
 *
 * Reusable tag/chip editor for array-valued settings.
 * Approved via SETT-005 (Option B) — owner-approved UI pattern.
 *
 * Features:
 *   - Displays current values as removable chips
 *   - Keyboard-friendly: Enter or comma to add a tag
 *   - RTL-aware layout (chips flow right-to-left in Arabic)
 *   - Integrated label, error, and helper text (consistent with FormFields.tsx)
 *   - WCAG 2.5.5: remove button has min 44px touch target
 *   - Validates per-tag rules via optional `validate` callback
 *   - UI-002: shared component — use this, do not duplicate in modules
 *   - UI-007: no structural inline styles
 *
 * Usage:
 *   <TagInput
 *     id="duration-options"
 *     label="خيارات مدة الإيجار (دقائق)"
 *     values={[15, 30, 45, 60]}
 *     onChange={(vals) => setDurations(vals)}
 *     validate={(v) => (v > 0 && Number.isInteger(v)) ? null : 'يجب أن يكون عدداً صحيحاً موجباً'}
 *     error={errors.rental_duration_options}
 *     helperText="أدخل المدة ثم اضغط Enter أو فاصلة"
 *   />
 */

import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Styles — injected once, consistent with FormFields.tsx pattern
// ---------------------------------------------------------------------------

const TAG_INPUT_STYLES = `
  .tag-input-wrapper { display: flex; flex-direction: column; gap: var(--space-2); }

  .tag-input-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    line-height: var(--line-height-normal);
  }

  /* The tags container + text input in one border box */
  .tag-input-box {
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-base);
    background-color: var(--color-white);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    cursor: text;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    box-sizing: border-box;
  }

  .tag-input-box:focus-within {
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgba(77, 106, 153, 0.15);
  }

  .tag-input-box--error {
    border-color: var(--color-danger-500);
  }

  .tag-input-box--error:focus-within {
    box-shadow: 0 0 0 3px rgba(237, 69, 71, 0.12);
  }

  .tag-input-box--disabled {
    background-color: var(--color-neutral-bg);
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* Individual tag chip */
  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-2);
    height: 28px;
    background-color: var(--color-navy-50);
    border: 1px solid var(--color-navy-200, var(--color-border));
    border-radius: var(--radius-full, 9999px);
    font-size: var(--font-size-sm);
    font-family: var(--font-family-base);
    color: var(--color-navy-800);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    user-select: none;
  }

  /* Remove button inside the chip */
  .tag-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    min-height: 44px; /* WCAG 2.5.5 touch target — achieved via padding-box extension */
    margin: -13px -2px; /* pull touch-target outward without changing visual size */
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--color-text-muted);
    border-radius: var(--radius-full, 9999px);
    padding: 0;
    transition: color var(--transition-fast), background-color var(--transition-fast);
    flex-shrink: 0;
  }

  .tag-chip-remove:hover:not(:disabled) {
    color: var(--color-danger-500);
    background-color: rgba(237, 69, 71, 0.08);
  }

  .tag-chip-remove:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 1px;
  }

  /* Text input inside the tag box */
  .tag-input-field {
    flex: 1;
    min-width: 80px;
    height: 28px;
    border: none;
    outline: none;
    font-size: var(--font-size-sm);
    font-family: var(--font-family-base);
    color: var(--color-text-primary);
    background: transparent;
    text-align: right;
    padding: 0 var(--space-1);
  }

  .tag-input-field::placeholder {
    color: var(--color-text-muted);
  }

  .tag-input-field:disabled { cursor: not-allowed; }

  /* Error / helper below the box */
  .tag-input-message {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);
  }
  .tag-input-message--error  { color: var(--color-danger-text); }
  .tag-input-message--helper { color: var(--color-text-muted); }

  /* Mobile — tags wrap naturally (flex-wrap already on) */
  @media (max-width: 640px) {
    .tag-input-box { padding: var(--space-2); }
    .tag-input-field { min-width: 60px; }
  }
`

let tagInputStylesInjected = false
function injectTagInputStyles() {
  if (tagInputStylesInjected) return
  tagInputStylesInjected = true
  const el = document.createElement('style')
  el.textContent = TAG_INPUT_STYLES
  document.head.appendChild(el)
}

// ---------------------------------------------------------------------------
// Component interface
// ---------------------------------------------------------------------------

interface TagInputProps {
  /** Unique HTML id — used for label association */
  id: string
  /** Visible label above the tag box */
  label: string
  /** Controlled current values */
  values: number[]
  /** Called when values change */
  onChange: (values: number[]) => void
  /**
   * Optional per-value validator.
   * Return null/undefined if valid, or an Arabic error string if invalid.
   */
  validate?: (value: number) => string | null | undefined
  /** Error message shown below the box (field-level) */
  error?: string
  /** Helper text shown below the box (suppressed if error is set) */
  helperText?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder for the text input */
  placeholder?: string
  /** Required indicator */
  required?: boolean
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

export function TagInput({
  id,
  label,
  values,
  onChange,
  validate,
  error,
  helperText,
  disabled = false,
  placeholder = 'أدخل قيمة ثم اضغط Enter',
  required = false,
}: TagInputProps) {
  injectTagInputStyles()

  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messageId = `${id}-message`

  /** Attempt to commit the current inputValue as a new tag */
  const commitTag = useCallback(() => {
    const raw = inputValue.trim()
    if (!raw) return

    const num = Number(raw)
    if (isNaN(num)) {
      setInputError('يجب أن تكون القيمة رقماً')
      return
    }

    // Run custom validator if provided
    if (validate) {
      const validationError = validate(num)
      if (validationError) {
        setInputError(validationError)
        return
      }
    }

    // Default: positive integer check
    if (!Number.isInteger(num) || num <= 0) {
      setInputError('يجب أن تكون القيمة عدداً صحيحاً موجباً')
      return
    }

    // Duplicate check
    if (values.includes(num)) {
      setInputError('هذه القيمة موجودة بالفعل')
      return
    }

    // Clear error, add value, keep ascending sort
    setInputError(null)
    setInputValue('')
    const next = [...values, num].sort((a, b) => a - b)
    onChange(next)
  }, [inputValue, values, onChange, validate])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTag()
    }
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }, [commitTag, inputValue, values, onChange])

  const removeTag = useCallback((index: number) => {
    const next = values.filter((_, i) => i !== index)
    onChange(next)
  }, [values, onChange])

  const displayError = error || inputError

  return (
    <div className="tag-input-wrapper">
      <label htmlFor={id} className="tag-input-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>

      <div
        className={[
          'tag-input-box',
          displayError ? 'tag-input-box--error' : '',
          disabled ? 'tag-input-box--disabled' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => !disabled && inputRef.current?.focus()}
        aria-invalid={displayError ? true : undefined}
      >
        {/* Existing value chips */}
        {values.map((val, i) => (
          <span key={`${val}-${i}`} className="tag-chip">
            {val}
            {!disabled && (
              <button
                type="button"
                className="tag-chip-remove"
                onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                aria-label={`إزالة ${val}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </span>
        ))}

        {/* Text input for new values */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          className="tag-input-field"
          value={inputValue}
          disabled={disabled}
          placeholder={values.length === 0 ? placeholder : ''}
          aria-describedby={displayError || helperText ? messageId : undefined}
          onChange={(e) => {
            setInputValue(e.target.value)
            if (inputError) setInputError(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={commitTag}
        />
      </div>

      {displayError && (
        <span id={messageId} className="tag-input-message tag-input-message--error" role="alert">
          {displayError}
        </span>
      )}
      {!displayError && helperText && (
        <span id={messageId} className="tag-input-message tag-input-message--helper">
          {helperText}
        </span>
      )}
    </div>
  )
}
