import React, { createContext, useContext, useState, useEffect } from 'react'

export interface UserProfile {
  name: string
  email: string
  picture: string
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  loading: boolean
  login: (token: string, profile: UserProfile) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore Google session on mount
    const savedProfile = localStorage.getItem('shreedesk-google-profile')
    const savedToken = sessionStorage.getItem('shreedesk-google-token')

    if (savedProfile && savedToken) {
      try {
        setUser(JSON.parse(savedProfile))
        setToken(savedToken)
      } catch (e) {
        // Corrupted profile — clear it
        localStorage.removeItem('shreedesk-google-profile')
      }
    }
    setLoading(false)
  }, [])

  const login = (googleToken: string, profile: UserProfile) => {
    sessionStorage.setItem('shreedesk-google-token', googleToken)
    localStorage.setItem('shreedesk-google-profile', JSON.stringify(profile))
    setToken(googleToken)
    setUser(profile)
  }

  const logout = () => {
    sessionStorage.removeItem('shreedesk-google-token')
    localStorage.removeItem('shreedesk-google-profile')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
