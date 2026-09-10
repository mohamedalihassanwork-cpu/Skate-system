/**
 * KOSHK SKATE ERP — Login Page
 * Phase 03.5 — Design System (updated from Phase 02)
 *
 * Changes from Phase 02:
 *   - Desktop: split-screen layout (left navy panel + right form) — OD-002 / DEC-035
 *   - Mobile: centered single-column (unchanged — was already centered)
 *   - Warning icon uses Lucide AlertTriangle (OD-003 / DEC-036 — no emoji)
 *   - Spinner uses Lucide Loader2 (OD-003)
 *   - Structural styles moved to CSS classes (UI-007)
 *
 * Auth logic (login, validation, error handling) UNCHANGED from Phase 02.
 * All existing HTML ids preserved for test compatibility.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني')
      return
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    setIsLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'حدث خطأ أثناء تسجيل الدخول'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="login-page">

        {/* ── Left panel: branding (desktop only) ── */}
        <div className="login-brand-panel" aria-hidden="true">
          <div className="login-brand-logo">KS</div>
          <h1 className="login-brand-title">KOSHK SKATE</h1>
          <p className="login-brand-tagline">نظام إدارة موارد التزلج</p>
          <p className="login-brand-sub">إدارة ذكية · عمليات سلسة · نتائج موثوقة</p>
        </div>

        {/* ── Right panel: form ── */}
        <main className="login-form-panel" role="main">
          <div className="login-form-container">

            {/* Mobile-only logo */}
            <div className="login-mobile-logo" aria-hidden="true">
              <div className="login-brand-logo login-brand-logo--mobile">KS</div>
            </div>

            <div className="login-form-header">
              <h2 className="login-form-title">تسجيل الدخول</h2>
              <p className="login-form-subtitle">أدخل بيانات حسابك للمتابعة</p>
            </div>

            <form
              id="login-form"
              onSubmit={handleSubmit}
              noValidate
              className="login-form"
            >
              {/* Email */}
              <div className="login-field-group">
                <label htmlFor="login-email" className="login-label">
                  البريد الإلكتروني
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="admin@koshkskate.com"
                  className={['login-input', error ? 'login-input--error' : '', isLoading ? 'login-input--disabled' : ''].filter(Boolean).join(' ')}
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={error ? true : undefined}
                  dir="ltr"
                />
              </div>

              {/* Password */}
              <div className="login-field-group">
                <label htmlFor="login-password" className="login-label">
                  كلمة المرور
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className={['login-input', error ? 'login-input--error' : '', isLoading ? 'login-input--disabled' : ''].filter(Boolean).join(' ')}
                  dir="ltr"
                />
              </div>

              {/* Error message — Lucide icon, no emoji */}
              {error && (
                <div
                  id="login-error"
                  role="alert"
                  aria-live="polite"
                  className="login-error"
                >
                  <AlertTriangle size={16} aria-hidden="true" color="var(--color-danger-text)" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading ? true : undefined}
                className="login-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2
                      size={16}
                      aria-hidden="true"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    <span>جارٍ تسجيل الدخول...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </button>
            </form>

            <p className="login-footer">
              KOSHK SKATE ERP — النظام الداخلي المحمي
            </p>
          </div>
        </main>
      </div>

      <style>{`
        /* ===== PAGE LAYOUT ===== */
        .login-page {
          min-height: 100vh;
          display: flex;
          direction: rtl;
          font-family: var(--font-family-base);
        }

        /* ===== BRAND PANEL (left / LTR-visual-left = RTL right) ===== */
        .login-brand-panel {
          flex: 1;
          background: linear-gradient(160deg, var(--color-navy-900) 0%, var(--color-navy-800) 60%, var(--color-navy-700) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12) var(--space-8);
          gap: var(--space-4);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* Decorative background circles */
        .login-brand-panel::before,
        .login-brand-panel::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          background: rgba(243,183,53,0.06);
          pointer-events: none;
        }
        .login-brand-panel::before { width: 480px; height: 480px; top: -120px; right: -80px; }
        .login-brand-panel::after  { width: 320px; height: 320px; bottom: -80px; left: -60px; }

        .login-brand-logo {
          width: 72px; height: 72px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--color-gold-500), var(--color-gold-400));
          display: flex; align-items: center; justify-content: center;
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-navy-900);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          position: relative; z-index: 1;
        }

        .login-brand-logo--mobile {
          width: 56px; height: 56px;
          font-size: var(--font-size-xl);
        }

        .login-brand-title {
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-white);
          margin: 0;
          letter-spacing: 0.04em;
          position: relative; z-index: 1;
        }

        .login-brand-tagline {
          font-size: var(--font-size-lg);
          color: var(--color-gold-400);
          font-weight: var(--font-weight-semibold);
          margin: 0;
          position: relative; z-index: 1;
        }

        .login-brand-sub {
          font-size: var(--font-size-sm);
          color: rgba(255,255,255,0.45);
          margin: 0;
          position: relative; z-index: 1;
          letter-spacing: 0.02em;
        }

        /* ===== FORM PANEL ===== */
        .login-form-panel {
          flex: 1;
          background-color: var(--color-white);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-6);
        }

        .login-form-container {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          animation: page-enter 0.35s ease-out;
        }

        .login-mobile-logo { display: none; align-items: center; justify-content: center; }

        .login-form-header { text-align: right; }

        .login-form-title {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-navy-800);
          margin: 0 0 var(--space-1);
        }

        .login-form-subtitle {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        /* ===== FORM FIELDS ===== */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .login-field-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .login-label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
        }

        .login-input {
          width: 100%;
          height: 44px;
          padding: 0 var(--space-4);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-base);
          font-size: var(--font-size-base);
          font-family: var(--font-family-base);
          color: var(--color-text-primary);
          background-color: var(--color-white);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          box-sizing: border-box;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--color-border-focus);
          box-shadow: 0 0 0 3px rgba(77, 106, 153, 0.15);
        }

        .login-input--error { border-color: var(--color-danger-500) !important; }
        .login-input--error:focus { box-shadow: 0 0 0 3px rgba(237,69,71,0.12) !important; }

        .login-input--disabled {
          background-color: var(--color-page-bg);
          cursor: not-allowed;
          opacity: 0.7;
        }

        .login-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
        }

        /* ===== ERROR ===== */
        .login-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background-color: var(--color-danger-bg);
          border-radius: var(--radius-base);
          border: 1px solid rgba(237,69,71,0.18);
          font-size: var(--font-size-sm);
          color: var(--color-danger-text);
          font-weight: var(--font-weight-medium);
        }

        /* ===== SUBMIT ===== */
        .login-submit {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          background-color: var(--color-navy-800);
          color: var(--color-white);
          border: none;
          border-radius: var(--radius-base);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          font-family: var(--font-family-base);
          cursor: pointer;
          transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
          box-shadow: 0 2px 8px rgba(25,39,68,0.20);
          margin-top: var(--space-2);
        }

        .login-submit:hover:not(:disabled) {
          background-color: var(--color-navy-700);
          box-shadow: 0 4px 16px rgba(25,39,68,0.28);
        }

        .login-submit:active:not(:disabled) { background-color: var(--color-navy-900); }
        .login-submit:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

        .login-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ===== FOOTER ===== */
        .login-footer {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          text-align: center;
          margin: 0;
        }

        /* ===== MOBILE — centered single-column ===== */
        @media (max-width: 767px) {
          .login-page {
            flex-direction: column;
            background-color: var(--color-page-bg);
          }

          .login-brand-panel { display: none; }

          .login-form-panel {
            flex: 1;
            background-color: transparent;
            align-items: flex-start;
            padding: var(--space-8) var(--space-4) var(--space-6);
          }

          .login-form-container {
            background-color: var(--color-white);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-card);
            padding: var(--space-6);
            gap: var(--space-5);
          }

          .login-mobile-logo { display: flex; }
        }
      `}</style>
    </>
  )
}
