import React, { createContext, useContext, useState, useEffect } from 'react'

export interface UserProfile {
  name: string
  email: string
  picture: string
  offline?: boolean
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  loading: boolean
  login: (token: string, profile: UserProfile) => void
  logout: () => void
  continueOffline: () => void
  isOffline: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local session on mount
    const savedProfile = localStorage.getItem('shreedesk-google-profile')
    const savedToken = sessionStorage.getItem('shreedesk-google-token')
    const offlineState = localStorage.getItem('shreedesk-session-offline') === 'true'

    if (savedProfile && savedToken) {
      try {
        setUser(JSON.parse(savedProfile))
        setToken(savedToken)
        setIsOffline(false)
      } catch (e) {
        console.error('Failed to parse saved user profile', e)
      }
    } else if (offlineState) {
      setIsOffline(true)
      setUser({
        name: 'Offline Operator',
        email: 'local-operator@shreedesk.office',
        picture: '',
        offline: true
      })
    }
    setLoading(false)
  }, [])

  const login = (googleToken: string, profile: UserProfile) => {
    sessionStorage.setItem('shreedesk-google-token', googleToken)
    localStorage.setItem('shreedesk-google-profile', JSON.stringify(profile))
    localStorage.removeItem('shreedesk-session-offline')
    
    setToken(googleToken)
    setUser(profile)
    setIsOffline(false)
  }

  const logout = () => {
    sessionStorage.removeItem('shreedesk-google-token')
    localStorage.removeItem('shreedesk-google-profile')
    localStorage.removeItem('shreedesk-session-offline')
    
    setToken(null)
    setUser(null)
    setIsOffline(false)
  }

  const continueOffline = () => {
    localStorage.setItem('shreedesk-session-offline', 'true')
    sessionStorage.removeItem('shreedesk-google-token')
    localStorage.removeItem('shreedesk-google-profile')
    
    setIsOffline(true)
    setToken(null)
    setUser({
      name: 'Offline Operator',
      email: 'local-operator@shreedesk.office',
      picture: '',
      offline: true
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, continueOffline, isOffline }}>
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
