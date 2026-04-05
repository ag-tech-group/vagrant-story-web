import { useQueryClient } from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { api, setOnUnauthorized } from "@/api/api"

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  email: string | null
  userId: string | null
  displayName: string | null
  avatarUrl: string | null
  login: (email: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const clearState = useCallback(() => {
    setIsAuthenticated(false)
    setEmail(null)
    setUserId(null)
    setDisplayName(null)
    setAvatarUrl(null)
    queryClient.clear()
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      await api.post("auth/jwt/logout")
    } catch {
      // Clear state regardless of fetch success
    }
    clearState()
  }, [clearState])

  const login = useCallback((newEmail: string) => {
    setEmail(newEmail)
    setIsAuthenticated(true)
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      const user = await api.get("auth/me").json<{
        id: string
        email: string
        display_name: string | null
        avatar_url: string | null
      }>()
      setIsAuthenticated(true)
      setEmail(user.email)
      setUserId(user.id)
      setDisplayName(user.display_name)
      setAvatarUrl(user.avatar_url)
    } catch {
      clearState()
    } finally {
      setIsLoading(false)
    }
  }, [clearState])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    setOnUnauthorized(() => {
      clearState()
    })
  }, [clearState])

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      email,
      userId,
      displayName,
      avatarUrl,
      login,
      logout,
      checkAuth,
    }),
    [
      isAuthenticated,
      isLoading,
      email,
      userId,
      displayName,
      avatarUrl,
      login,
      logout,
      checkAuth,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
