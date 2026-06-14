import React, { useState, useEffect } from 'react'
import { FiX, FiCheck, FiKey, FiInfo } from 'react-icons/fi'
import { motion as m, AnimatePresence as Ap } from 'framer-motion'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('shreedesk-gemini-key') || '')
      setOpenaiKey(localStorage.getItem('shreedesk-openai-key') || '')
      setAnthropicKey(localStorage.getItem('shreedesk-anthropic-key') || '')
      setIsSaved(false)
    }
  }, [isOpen])

  const handleSave = () => {
    localStorage.setItem('shreedesk-gemini-key', geminiKey.trim())
    localStorage.setItem('shreedesk-openai-key', openaiKey.trim())
    localStorage.setItem('shreedesk-anthropic-key', anthropicKey.trim())
    setIsSaved(true)
    setTimeout(() => {
      onClose()
    }, 800)
  }

  const handleClear = () => {
    localStorage.removeItem('shreedesk-gemini-key')
    localStorage.removeItem('shreedesk-openai-key')
    localStorage.removeItem('shreedesk-anthropic-key')
    setGeminiKey('')
    setOpenaiKey('')
    setAnthropicKey('')
    setIsSaved(true)
    setTimeout(() => {
      onClose()
    }, 800)
  }

  if (!isOpen) return null

  return (
    <Ap>
      <div
        className="settings-modal-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10005,
          background: 'rgba(15, 12, 10, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '480px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '1.25rem',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
          }}
          className="glass"
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiKey style={{ color: 'var(--accent)' }} /> Configuration Settings
            </h3>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <FiX size={20} />
            </button>
          </div>

          <div 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--text)', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.75rem', 
              fontSize: '0.825rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
              lineHeight: 1.5
            }}
          >
            <FiInfo size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
            <span>
              <strong>Local-First API Keys:</strong> Keys are stored directly in your browser's local cache and are never transmitted to any external servers (other than direct API calls to AI providers).
            </span>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Google Gemini API Key (Recommended)</span>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-bg)',
                  color: 'var(--text)',
                }}
              />
            </label>

            <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>OpenAI API Key (Optional)</span>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-bg)',
                  color: 'var(--text)',
                }}
              />
            </label>

            <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Anthropic Claude API Key (Optional)</span>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-bg)',
                  color: 'var(--text)',
                }}
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              className="btn-secondary"
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Clear Keys
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              {isSaved ? <FiCheck /> : 'Save Keys'}
            </button>
          </div>
        </m.div>
      </div>
    </Ap>
  )
}

export default SettingsModal
