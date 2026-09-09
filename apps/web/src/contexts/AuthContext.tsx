/**
 * KOSHK SKATE ERP — Auth Context
 * Phase 02 — Authentication & Permissions
 *
 * Provides:
 *   - accessToken (in memory — never in localStorage)
 *   - current user + permissions
 *   - login / logout / refresh functions
 *
 * DEC-025: Access token stored in memory only.
 * DEC-024: Refresh token is in HttpOnly cookie — invisible to this code.
 *
 * Token refresh strategy:
 *   - On app mount: attempt silent refresh to restore session
 *   - On 401: api.ts interceptor calls refreshAccessToken()
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { loginApi, logoutApi, refreshApi, meApi, type AuthUser } from '../modules/auth/auth.service'

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
  hasPermission: (key: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)  // true until initial refresh completes

  // Keep a ref so the refresh function inside interceptors always has the latest token
  const accessTokenRef = useRef<string | null>(null)

  const setToken = useCallback((token: string | null) => {
    setAccessToken(token)
    accessTokenRef.current = token
  }, [])

  // ---------------------------------------------------------------------------
  // refreshAccessToken — silent renewal using HttpOnly refresh cookie
  // ---------------------------------------------------------------------------

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const newToken = await refreshApi()
      setToken(newToken)
      // Re-load user with new token
      const updatedUser = await meApi(newToken)
      setUser(updatedUser)
      return newToken
    } catch {
      // Refresh failed — session expired, clear state
      setToken(null)
      setUser(null)
      return null
    }
  }, [setToken])

  // ---------------------------------------------------------------------------
  // On mount: try silent refresh to restore session
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      try {
        const token = await refreshApi()
        if (cancelled) return
        const loadedUser = await meApi(token)
        if (cancelled) return
        setToken(token)
        setUser(loadedUser)
      } catch {
        // No valid session — user must log in
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    restoreSession()
    return () => { cancelled = true }
  }, [setToken])

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const { accessToken: token, user: loggedInUser } = await loginApi({ email, password })
    setToken(token)
    setUser(loggedInUser)
  }, [setToken])

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------

  const logout = useCallback(async (): Promise<void> => {
    const token = accessTokenRef.current
    try {
      if (token) await logoutApi(token)
    } finally {
      setToken(null)
      setUser(null)
    }
  }, [setToken])

  // ---------------------------------------------------------------------------
  // hasPermission
  // ---------------------------------------------------------------------------

  const hasPermission = useCallback((key: string): boolean => {
    return user?.permissions.includes(key) ?? false
  }, [user])

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    logout,
    refreshAccessToken,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
