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
            ShreeDeskOffice <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--accent-soft)', color: 'var(--accent)', verticalAlign: 'middle', marginLeft: '0.25rem' }}>v3.0.0</span>
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
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Google SSO Status */}
        {googleToken ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.2rem 0.5rem 0.2rem 0.25rem', borderRadius: '20px', background: 'var(--panel-bg)' }}>
            {googleUser?.picture ? (
              <img
                src={googleUser.picture}
                alt={googleUser.name || 'User profile'}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                title={googleUser?.name}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
                title={googleUser?.name || 'Signed in'}
              >
                {googleUser?.name ? googleUser.name.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {googleUser?.name?.split(' ')[0] || 'Signed In'}
            </span>
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
                color: 'var(--text-muted)',
                fontWeight: 600,
                padding: '0 0.25rem'
              }}
              title="Sign out"
            >
              ✕
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hover-lift"
          >
            <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.94 5.94 0 018 12.571a5.96 5.96 0 015.99-5.943c1.528 0 2.91.564 3.978 1.49l3.12-3.07C19.123 3.327 16.744 2 13.99 2 8.163 2 3.5 6.643 3.5 12.571s4.663 10.572 10.49 10.572c6.07 0 10.077-4.244 10.077-10.237 0-.693-.082-1.218-.184-1.621H12.24z" />
            </svg>
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
