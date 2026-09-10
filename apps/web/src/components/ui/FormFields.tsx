/**
 * KOSHK SKATE ERP — Input, Select, Textarea Components
 * Phase 03.5 — Design System
 *
 * Shared form controls with integrated label, error message, RTL support.
 * UI-002: All form fields must use these components.
 */

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/* =============================================================================
   Shared field styles (injected once via a style block)
   ============================================================================= */

const FIELD_STYLES = `
  .field-wrapper { display: flex; flex-direction: column; gap: var(--space-2); }

  .field-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    line-height: var(--line-height-normal);
  }

  .field-required { color: var(--color-danger-500); margin-right: var(--space-1); }

  .field-control {
    width: 100%;
    height: 40px;
    padding: 0 var(--space-4);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-base);
    font-size: var(--font-size-base);
    font-family: var(--font-family-base);
    color: var(--color-text-primary);
    background-color: var(--color-white);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    box-sizing: border-box;
    text-align: right;
  }

  .field-textarea {
    height: auto;
    min-height: 80px;
    padding: var(--space-3) var(--space-4);
    resize: vertical;
  }

  .field-control:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgba(77, 106, 153, 0.15);
  }

  .field-control.field-error {
    border-color: var(--color-danger-500);
  }

  .field-control.field-error:focus {
    box-shadow: 0 0 0 3px rgba(237, 69, 71, 0.12);
  }

  .field-control:disabled {
    background-color: var(--color-neutral-bg);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .field-message {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);
  }

  .field-message--error { color: var(--color-danger-text); }
  .field-message--helper { color: var(--color-text-muted); }

  /* Select arrow — RTL: appears on left side */
  select.field-control {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237D8798' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: left 12px center;
    padding-left: 2.5rem;
    cursor: pointer;
  }
`

let fieldStylesInjected = false

function injectFieldStyles() {
  if (fieldStylesInjected) return
  fieldStylesInjected = true
  const el = document.createElement('style')
  el.textContent = FIELD_STYLES
  document.head.appendChild(el)
}

/* =============================================================================
   Input
   ============================================================================= */

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export function Input({
  id,
  label,
  error,
  helperText,
  required,
  className = '',
  ...rest
}: InputProps) {
  injectFieldStyles()
  const messageId = `${id}-message`

  return (
    <div className="field-wrapper">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? messageId : undefined}
        className={['field-control', error ? 'field-error' : '', className].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && (
        <span id={messageId} className="field-message field-message--error" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={messageId} className="field-message field-message--helper">
          {helperText}
        </span>
      )}
    </div>
  )
}

/* =============================================================================
   Select
   ============================================================================= */

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  required?: boolean
}

export function Select({
  id,
  label,
  options,
  placeholder,
  error,
  required,
  className = '',
  ...rest
}: SelectProps) {
  injectFieldStyles()
  const messageId = `${id}-message`

  return (
    <div className="field-wrapper">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={['field-control', error ? 'field-error' : '', className].filter(Boolean).join(' ')}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <span id={messageId} className="field-message field-message--error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

/* =============================================================================
   Textarea
   ============================================================================= */

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export function Textarea({
  id,
  label,
  error,
  helperText,
  required,
  className = '',
  ...rest
}: TextareaProps) {
  injectFieldStyles()
  const messageId = `${id}-message`

  return (
    <div className="field-wrapper">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? messageId : undefined}
        className={['field-control', 'field-textarea', error ? 'field-error' : '', className].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && (
        <span id={messageId} className="field-message field-message--error" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={messageId} className="field-message field-message--helper">
          {helperText}
        </span>
      )}
    </div>
  )
}
