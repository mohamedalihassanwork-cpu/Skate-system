/**
 * KOSHK SKATE ERP — Login Page
 * Phase 02 — Authentication & Permissions
 *
 * Arabic-first RTL design.
 * KOSHK SKATE visual identity: navy (#192744) + gold (#F3B735), Cairo font.
 * Handles: form validation, loading state, Arabic error messages.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div style={styles.page}>
      {/* Background decoration */}
      <div style={styles.bgDecoration} aria-hidden="true" />

      <main style={styles.container}>
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoIcon} aria-hidden="true">KS</div>
          <h1 style={styles.logoTitle}>KOSHK SKATE</h1>
          <p style={styles.logoSubtitle}>نظام إدارة الموارد</p>
        </div>

        {/* Card */}
        <div style={styles.card} role="region" aria-label="تسجيل الدخول">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>تسجيل الدخول</h2>
            <p style={styles.cardSubtitle}>أدخل بيانات حسابك للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={styles.form} id="login-form">
            {/* Email field */}
            <div style={styles.fieldGroup}>
              <label htmlFor="login-email" style={styles.label}>
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
                style={{
                  ...styles.input,
                  ...(error ? styles.inputError : {}),
                  ...(isLoading ? styles.inputDisabled : {}),
                }}
                aria-describedby={error ? 'login-error' : undefined}
                dir="ltr"
              />
            </div>

            {/* Password field */}
            <div style={styles.fieldGroup}>
              <label htmlFor="login-password" style={styles.label}>
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
                style={{
                  ...styles.input,
                  ...(error ? styles.inputError : {}),
                  ...(isLoading ? styles.inputDisabled : {}),
                }}
                dir="ltr"
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                id="login-error"
                role="alert"
                aria-live="polite"
                style={styles.errorBox}
              >
                <span style={styles.errorIcon} aria-hidden="true">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.submitBtn,
                ...(isLoading ? styles.submitBtnLoading : {}),
              }}
            >
              {isLoading ? (
                <span style={styles.btnContent}>
                  <span style={styles.spinner} aria-hidden="true" />
                  <span>جارٍ تسجيل الدخول...</span>
                </span>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          KOSHK SKATE ERP — النظام الداخلي المحمي
        </p>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
        }

        #login-submit-btn:hover:not(:disabled) {
          background-color: var(--color-navy-900) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(25, 39, 68, 0.35) !important;
        }

        #login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        #login-email:focus, #login-password:focus {
          outline: none;
          border-color: var(--color-navy-600) !important;
          box-shadow: 0 0 0 3px rgba(25, 39, 68, 0.12) !important;
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-gray-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-6)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Cairo', sans-serif",
    direction: 'rtl',
  },
  bgDecoration: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(25,39,68,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-6)',
    animation: 'fadeIn 0.4s ease-out',
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-navy-800)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--color-gold-400)',
    letterSpacing: '-0.03em',
    boxShadow: '0 8px 24px rgba(25,39,68,0.25)',
  },
  logoTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 700,
    color: 'var(--color-navy-800)',
    letterSpacing: '0.04em',
    margin: 0,
  },
  logoSubtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  card: {
    width: '100%',
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: '0 4px 32px rgba(25,39,68,0.10), 0 1px 4px rgba(25,39,68,0.06)',
    padding: 'var(--space-8)',
    border: '1px solid var(--color-border)',
  },
  cardHeader: {
    marginBottom: 'var(--space-6)',
    textAlign: 'center' as const,
  },
  cardTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 700,
    color: 'var(--color-navy-800)',
    margin: '0 0 var(--space-1) 0',
  },
  cardSubtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  input: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-base)',
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-white)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box' as const,
    fontFamily: "'Cairo', sans-serif",
  },
  inputError: {
    borderColor: 'var(--color-danger)',
  },
  inputDisabled: {
    backgroundColor: 'var(--color-gray-50)',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-danger-bg)',
    borderRadius: 'var(--radius-base)',
    border: '1px solid rgba(220,53,69,0.2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-danger)',
    fontWeight: 500,
  },
  errorIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  submitBtn: {
    width: '100%',
    padding: 'var(--space-3) var(--space-6)',
    backgroundColor: 'var(--color-navy-800)',
    color: 'var(--color-white)',
    border: 'none',
    borderRadius: 'var(--radius-base)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s, transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 2px 8px rgba(25,39,68,0.2)',
    fontFamily: "'Cairo', sans-serif",
    marginTop: 'var(--space-2)',
    boxSizing: 'border-box' as const,
  },
  submitBtnLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  btnContent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    justifyContent: 'center',
  },
  spinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footer: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textAlign: 'center' as const,
    margin: 0,
  },
}
