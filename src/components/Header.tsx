import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiMenu, FiDownload, FiSun, FiMoon, FiSettings } from 'react-icons/fi'
import { SearchBar } from './ui'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useTheme } from '../context/ThemeContext'
import { getGoogleToken, getGoogleProfile, logoutGoogle, type GoogleProfile } from '../utils/googleDrive'

interface HeaderProps {
  toggleSidebar?: () => void
  onSearchClick?: () => void
  onSettingsClick?: () => void
}

const Header = ({ toggleSidebar, onSearchClick, onSettingsClick }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [googleUser, setGoogleUser] = useState<GoogleProfile | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(null)

  useEffect(() => {
    setGoogleUser(getGoogleProfile())
    setGoogleToken(getGoogleToken())
  }, [])

  return (
    <header className="app-header glass" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="header-brand-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {toggleSidebar && (
          <button
            className="icon-btn"
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text)',
              minHeight: '40px',
              minWidth: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FiMenu size={20} aria-hidden="true" />
          </button>
        )}
        <Link to="/" className="header-left" style={{ textDecoration: 'none' }}>
          <div className="brand" style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            ShreeDeskOffice <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--accent-soft)', color: 'var(--accent)', verticalAlign: 'middle', marginLeft: '0.25rem' }}>v3.0</span>
          </div>
        </Link>
      </div>

      {/* Global search entry that triggers the Ctrl+K palette */}
      <div 
        className="header-center search-bar-container" 
        style={{ flex: 1, maxWidth: '480px', margin: '0 1.5rem', cursor: 'pointer' }}
        onClick={onSearchClick}
      >
        <div style={{ pointerEvents: 'none', position: 'relative' }}>
          <SearchBar
            placeholder="Search tools..."
            value=""
            onChange={() => {}}
          />
          <span 
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.7rem',
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            Ctrl K
          </span>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Google SSO Status */}
        {googleToken ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'var(--panel-bg)' }}>
            <img 
              src={googleUser?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&h=40'} 
              alt="Profile" 
              style={{ width: '28px', height: '28px', borderRadius: '50%' }}
              title={googleUser?.name || 'Google Account Connected'}
            />
            <button
              onClick={() => {
                logoutGoogle()
                setGoogleUser(null)
                setGoogleToken(null)
                window.location.reload()
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--accent)',
                fontWeight: 600,
                padding: '0 0.25rem'
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link 
            to="/login"
            style={{
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--accent)',
              border: '1.5px solid var(--accent)',
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              transition: 'all 0.2s',
            }}
            className="hover-lift"
          >
            Sign In
          </Link>
        )}
        {/* PWA Install App Button */}
        {canInstall && (
          <button 
            className="install-app-btn" 
            onClick={promptInstall} 
            aria-label="Install ShreeDeskOffice app" 
            style={{ 
              minHeight: '38px', 
              padding: '0 12px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'var(--accent)', 
              color: 'white', 
              fontWeight: 600, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <FiDownload size={14} aria-hidden="true" />
            <span className="install-app-btn-label">Install</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{
            border: '1px solid var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text)',
            height: '38px',
            width: '38px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} style={{ color: 'var(--warning)' }} />}
        </button>

        {/* API Settings Modal Trigger */}
        <button
          className="icon-btn"
          onClick={onSettingsClick}
          aria-label="AI API Settings"
          style={{
            border: '1px solid var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text)',
            height: '38px',
            width: '38px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="Configure API Keys"
        >
          <FiSettings size={18} />
        </button>
      </div>
    </header>
  )
}

export default Header
