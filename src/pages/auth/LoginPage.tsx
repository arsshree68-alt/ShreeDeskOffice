import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCloud, FiInfo, FiArrowLeft } from 'react-icons/fi'
import { loginWithGoogle, getGoogleToken, getClientId, setClientId } from '../../utils/googleDrive'
import { useAuth } from '../../context/AuthContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientId, setLocalClientId] = useState('')

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = getGoogleToken()
    if (token) {
      navigate('/')
      return
    }

    // Load saved Client ID (if user previously configured it)
    const savedId = getClientId()
    if (savedId) {
      setLocalClientId(savedId)
    }
  }, [navigate])

  const handleGoogleLogin = () => {
    setLoading(true)
    setError('')

    if (!clientId.trim()) {
      setLoading(false)
      setError(
        'Please enter your Google OAuth Client ID to continue. You can get this from the Google Cloud Console → APIs & Services → Credentials.'
      )
      return
    }

    setClientId(clientId.trim())

    loginWithGoogle(
      (token, profile) => {
        setLoading(false)
        login(token, profile)
        navigate('/')
      },
      (err) => {
        setLoading(false)
        console.error('Google SSO Login Error:', err)
        setError(
          typeof err === 'string'
            ? err
            : 'Google Authentication failed. Verify your Client ID and authorized JavaScript origins.'
        )
      }
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative gradient background */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '40%',
          height: '40%',
          background: 'var(--accent-soft)',
          filter: 'blur(120px)',
          borderRadius: '50%',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '40%',
          height: '40%',
          background: 'var(--accent-soft)',
          opacity: 0.8,
          filter: 'blur(120px)',
          borderRadius: '50%',
          zIndex: 0
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: '440px',
          width: '100%',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '1.5rem',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}
        className="glass"
      >
        {/* Logo */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '1.25rem',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 800,
            boxShadow: 'var(--shadow)'
          }}
        >
          🏛️
        </div>

        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text)',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em'
            }}
          >
            Connect Google Drive
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Sign in to automatically sync your exported files to a{' '}
            <strong>ShreeDeskOffice</strong> folder in your Google Drive.
          </p>
        </div>

        {error && (
          <div
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: 'var(--text)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              fontSize: '0.8rem',
              textAlign: 'left',
              display: 'flex',
              gap: '6px'
            }}
          >
            <FiInfo style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Client ID Input */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
          <label
            htmlFor="client-id"
            style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}
          >
            Google OAuth Client ID
          </label>
          <input
            id="client-id"
            type="text"
            placeholder="xxxx.apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setLocalClientId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoogleLogin()}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Get this from{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              Google Cloud Console
            </a>{' '}
            → APIs &amp; Services → Credentials
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            id="btn-google-signin"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '0.75rem',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <span>Connecting to Google...</span>
            ) : (
              <>
                <svg style={{ width: '18px', height: '18px', fill: 'currentColor' }} viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.94 5.94 0 018 12.571a5.96 5.96 0 015.99-5.943c1.528 0 2.91.564 3.978 1.49l3.12-3.07C19.123 3.327 16.744 2 13.99 2 8.163 2 3.5 6.643 3.5 12.571s4.663 10.572 10.49 10.572c6.07 0 10.077-4.244 10.077-10.237 0-.693-.082-1.218-.184-1.621H12.24z" />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              fontSize: '0.9rem',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
          >
            <FiArrowLeft size={16} />
            Continue without signing in
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <FiCloud />
          <span>All your files stay in your browser. Drive sync is optional.</span>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage
