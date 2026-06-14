import React, { useState, useEffect } from 'react'
import { FiX, FiCheck, FiKey, FiInfo, FiDatabase, FiHelpCircle, FiCheckCircle } from 'react-icons/fi'
import { motion as m, AnimatePresence as Ap } from 'framer-motion'
import { getClientId, setClientId, getGoogleToken, getGoogleProfile } from '../utils/googleDrive'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
  category: 'Global' | 'Editor' | 'File System' | 'Integration'
}

const shortcutList: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], description: 'Open Universal Search & Command Palette', category: 'Global' },
  { keys: ['Esc'], description: 'Close active modals, overlays, or palettes', category: 'Global' },
  { keys: ['Ctrl', 'Shift', 'L'], description: 'Toggle between Light & Dark interface themes', category: 'Global' },
  { keys: ['Ctrl', 'S'], description: 'Save current active document or note outline', category: 'Editor' },
  { keys: ['Ctrl', 'Enter'], description: 'Submit prompt or query in AI Chat Workspace', category: 'Integration' },
  { keys: ['Drag & Drop'], description: 'Drop any document anywhere on screen to route it to active suite', category: 'File System' },
]

type ActiveTab = 'api' | 'auth' | 'drive' | 'shortcuts' | 'about'

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('api')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  
  // Custom Supabase/DB credentials
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')

  // Google OAuth Client ID & Sandbox Mode
  const [googleClientId, setGoogleClientId] = useState('')
  const [useSandbox, setUseSandbox] = useState(false)

  const [isSaved, setIsSaved] = useState(false)
  const [shortcutSearch, setShortcutSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('shreedesk-gemini-key') || '')
      setOpenaiKey(localStorage.getItem('shreedesk-openai-key') || '')
      setAnthropicKey(localStorage.getItem('shreedesk-anthropic-key') || '')
      
      setSupabaseUrl(localStorage.getItem('shreedesk-supabase-url') || '')
      setSupabaseKey(localStorage.getItem('shreedesk-supabase-key') || '')
      
      setGoogleClientId(getClientId())
      setUseSandbox(localStorage.getItem('shreedesk-google-use-sandbox') === 'true')
      setIsSaved(false)
    }
  }, [isOpen])

  const handleSave = () => {
    localStorage.setItem('shreedesk-gemini-key', geminiKey.trim())
    localStorage.setItem('shreedesk-openai-key', openaiKey.trim())
    localStorage.setItem('shreedesk-anthropic-key', anthropicKey.trim())
    
    localStorage.setItem('shreedesk-supabase-url', supabaseUrl.trim())
    localStorage.setItem('shreedesk-supabase-key', supabaseKey.trim())
    
    setClientId(googleClientId)
    localStorage.setItem('shreedesk-google-use-sandbox', useSandbox ? 'true' : 'false')

    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 800)
  }

  const handleClear = () => {
    localStorage.removeItem('shreedesk-gemini-key')
    localStorage.removeItem('shreedesk-openai-key')
    localStorage.removeItem('shreedesk-anthropic-key')
    localStorage.removeItem('shreedesk-supabase-url')
    localStorage.removeItem('shreedesk-supabase-key')
    localStorage.removeItem('shreedesk-google-use-sandbox')
    
    setGeminiKey('')
    setOpenaiKey('')
    setAnthropicKey('')
    setSupabaseUrl('')
    setSupabaseKey('')
    setGoogleClientId('')
    setUseSandbox(false)

    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 800)
  }

  if (!isOpen) return null

  const googleProfile = getGoogleProfile()
  const hasGoogleToken = !!getGoogleToken()

  const filteredShortcuts = shortcutList.filter(item => {
    return item.description.toLowerCase().includes(shortcutSearch.toLowerCase()) || 
      item.keys.some(k => k.toLowerCase().includes(shortcutSearch.toLowerCase()))
  })

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
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '1.25rem',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
          className="glass"
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <span>⚙️</span> System Settings
            </h3>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FiX size={22} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--panel-bg)', padding: '0.5rem 2rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {([
              { id: 'api', label: 'AI Keys', icon: <FiKey /> },
              { id: 'auth', label: 'Auth & DB', icon: <FiDatabase /> },
              { id: 'drive', label: 'Google Drive', icon: '📂' },
              { id: 'shortcuts', label: 'Shortcuts', icon: <FiHelpCircle /> },
              { id: 'about', label: 'About', icon: <FiCheckCircle /> }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--accent-soft)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
            
            {/* API Keys Tab */}
            {activeTab === 'api' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--accent-soft)', padding: '0.75rem 1rem', borderRadius: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.825rem', lineHeight: 1.5 }}>
                  <FiInfo size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
                  <span>
                    Configure AI credentials to run Translation, Document summarizing, and Slide generators. Keys are securely cached in your local browser sandbox.
                  </span>
                </div>

                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Google Gemini API Key</span>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                </label>

                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>OpenAI API Key (Optional)</span>
                  <input
                    type="password"
                    placeholder="sk-proj-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                </label>

                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Anthropic Claude API Key (Optional)</span>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                </label>
              </div>
            )}

            {/* Auth & Database Tab */}
            {activeTab === 'auth' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700 }}>Google User Profile</h4>
                  {googleProfile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                      <img src={googleProfile.picture} alt="User Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{googleProfile.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{googleProfile.email}</span>
                      </div>
                      <span style={{ marginLeft: 'auto', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px' }}>
                        {hasGoogleToken ? 'Google Drive Connected' : 'Google Authed'}
                      </span>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No active Google Session (Logged in Sandbox Offline Mode).
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700 }}>Remote Database Sync (Optional)</h4>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Sync notes and workspace activity timelines to your own Supabase instance. Leave empty for local-first sandbox mode.
                  </p>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Supabase Project URL</span>
                      <input
                        type="text"
                        placeholder="https://your-project.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                      />
                    </label>

                    <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Supabase Anon API Key</span>
                      <input
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Google Drive Tab */}
            {activeTab === 'drive' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--accent-soft)', padding: '0.75rem 1rem', borderRadius: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  <span>
                    📂 <strong>Master Directory Folder Structure:</strong> All file downloads are systematically routed to specific subfolders inside your main Google Drive: <strong>ShreeDeskOffice/</strong>.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>MASTER ROOT</span>
                    <strong style={{ fontSize: '0.9rem' }}>ShreeDeskOffice</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TARGET SUBFOLDERS</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      PDFs, Notes, Word Documents, Excel Files, PowerPoints, Images, Reports, Merged Files, Converted Files, Backups
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Google Developer Console Config</h4>
                  
                  <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Google Client ID (OAuth 2.0)</span>
                    <input
                      type="text"
                      placeholder="Enter your Google Client ID"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={useSandbox}
                      onChange={(e) => setUseSandbox(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Force Sandbox Mode (Uses mockup tokens for testing/offline bypass)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <input
                  type="text"
                  placeholder="Filter shortcuts..."
                  value={shortcutSearch}
                  onChange={(e) => setShortcutSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-bg)',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' }}>
                  {filteredShortcuts.length > 0 ? (
                    filteredShortcuts.map((item, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          paddingBottom: idx === filteredShortcuts.length - 1 ? '0' : '0.75rem',
                          borderBottom: idx === filteredShortcuts.length - 1 ? 'none' : '1px solid var(--border)' 
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.description}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>{item.category}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          {item.keys.map((key, kIdx) => (
                            <span key={kIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <kbd style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {key}
                              </kbd>
                              {kIdx < item.keys.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No hotkeys matching query.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About & Version Tab */}
            {activeTab === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem' }}>🏛️</div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: 700 }}>ShreeDeskOffice</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>Version v3.0.0</span>
                </div>
                
                <p style={{ margin: '0 auto', maxWidth: '400px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  A production-grade, local-first office suite. Created for secure, high-speed document operations including PDF merging, Excel pivot generation, PowerPoint outline builders, and Notion-style Rich Notes.
                </p>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
                  © 2026 ShreeDeskOffice Inc. All rights reserved.
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--panel-bg)', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              className="btn-secondary"
              style={{ padding: '0.5rem 1.2rem', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Clear All Config
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ padding: '0.5rem 1.2rem', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isSaved ? <FiCheck /> : 'Save & Close'}
            </button>
          </div>
        </m.div>
      </div>
    </Ap>
  )
}

export default SettingsModal
