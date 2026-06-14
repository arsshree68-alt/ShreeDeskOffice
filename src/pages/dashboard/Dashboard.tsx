import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FiZap, FiFile, FiShield, FiStar, FiActivity, 
  FiClock, FiCpu, FiLayers, FiSliders, 
  FiCheckCircle, FiChevronRight, FiFolderPlus, FiDownload 
} from 'react-icons/fi'
import { useFavorites } from '../../hooks/useFavorites'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import { toolRegistry } from '../../tools/toolRegistry'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'
import { getGoogleToken, getGoogleProfile, logoutGoogle, type GoogleProfile } from '../../utils/googleDrive'

// Categories registry for display
const suiteCategories = [
  { name: 'AI Suite', path: '/ai', icon: <FiCpu />, desc: 'Chat with documents & write reports', color: '#8b5cf6' },
  { name: 'Government Suite', path: '/govt', icon: <FiShield />, desc: 'Compliance & official templates', color: '#10b981' },
  { name: 'PDF Suite', path: '/pdf', icon: <FiFile />, desc: 'Merge, split, and optimize files', color: '#ef4444' },
  { name: 'Excel Suite', path: '/excel', icon: <FiLayers />, desc: 'Aggregation & data cleaning', color: '#3b82f6' },
  { name: 'Developer Suite', path: '/developer', icon: <FiSliders />, desc: 'Formatters, validators, API testers', color: '#f59e0b' },
]

const Dashboard = () => {
  const { favorites, toggleFavorite } = useFavorites()
  const { recentFiles, clearRecentFiles } = useRecentFiles()
  const [activeCategory, setActiveCategory] = useState<'All' | 'PDF' | 'Excel' | 'Word' | 'PPT' | 'Image' | 'AI' | 'Govt' | 'Developer'>('All')
  const [googleUser, setGoogleUser] = useState<GoogleProfile | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(null)

  useEffect(() => {
    setGoogleUser(getGoogleProfile())
    setGoogleToken(getGoogleToken())
  }, [])


  // Calculate statistics from local files
  const stats = useMemo(() => {
    const totalProcessed = recentFiles.length
    const storageSaved = recentFiles.reduce((sum, item) => sum + (item.sizeSaved || 0), 0)
    const exportsCreated = recentFiles.filter(item => 
      ['Merged', 'Compressed', 'Generated', 'Validated'].includes(item.action)
    ).length

    return {
      processed: totalProcessed,
      saved: formatFileSize(storageSaved),
      exports: exportsCreated
    }
  }, [recentFiles])

  // Get matching tools based on categories
  const filteredTools = useMemo(() => {
    if (activeCategory === 'All') {
      return toolRegistry.slice(0, 8) // Show top 8 tools by default
    }
    return toolRegistry.filter(t => t.category === activeCategory)
  }, [activeCategory])

  // Retrieve pinned favorite tools
  const pinnedTools = useMemo(() => {
    return toolRegistry.filter(t => favorites.includes(t.id))
  }, [favorites])

  return (
    <main className="homepage-shell bg-gradient-premium" style={{ gap: '3rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hero Section */}
      <section 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 1fr', 
          gap: '2.5rem', 
          alignItems: 'center', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          width: '100%',
          padding: '1rem 0'
        }}
        className="responsive-2col"
      >
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <div className="hero-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            <FiZap /> <span>SHREEDESK OFFICE OS v3.0</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)', lineHeight: 1.1, marginBottom: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'left' }}>
            The Premium <span className="gradient-text">Productivity Operating System</span> In Your Browser.
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6, textAlign: 'left', maxWidth: '560px' }}>
            Process PDFs, consolidate block statistics, clean datasets, write AI reports, and crop image signatures. 100% local, sandboxed inside your browser. No files ever touch our servers.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => {
                const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' })
                window.dispatchEvent(event)
              }} 
              className="btn-primary" 
              style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Start Working
            </button>
            <a href="#toolbox" className="btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Explore Tools
            </a>
          </div>
        </motion.div>

        {/* Animated Workspace Preview (Interactive SVG) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              aspectRatio: '4/3', 
              background: 'var(--panel-bg)', 
              borderRadius: '1.25rem', 
              border: '1px solid var(--border)', 
              padding: '1rem', 
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              overflow: 'hidden'
            }}
            className="glass"
          >
            {/* Mock Window Shell */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', display: 'block' }}></span>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', display: 'block' }}></span>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', display: 'block' }}></span>
            </div>
            {/* Mock Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', height: 'calc(100% - 2.5rem)' }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Security Check</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiCheckCircle size={18} /> Sandboxed
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--success)' }}></div>
                </div>
              </div>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Files Processed</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{stats.processed}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Local Cache Active</span>
              </div>
              <div style={{ gridColumn: 'span 2', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Statistical Indexing</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Live Analytics</span>
                </div>
                {/* Mock Chart representation */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, height: '30%', background: 'var(--accent-soft)', borderRadius: '2px' }}></div>
                  <div style={{ flex: 1, height: '70%', background: 'var(--accent-soft)', borderRadius: '2px' }}></div>
                  <div style={{ flex: 1, height: '45%', background: 'var(--accent-soft)', borderRadius: '2px' }}></div>
                  <div style={{ flex: 1, height: '90%', background: 'var(--accent)', borderRadius: '2px' }}></div>
                  <div style={{ flex: 1, height: '60%', background: 'var(--accent-soft)', borderRadius: '2px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Summary Panel */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }} className="glass hover-lift">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            <FiActivity />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Files Processed</div>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text)' }}>{stats.processed}</strong>
          </div>
        </div>
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }} className="glass hover-lift">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            <FiCheckCircle />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Local Space Saved</div>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text)' }}>{stats.saved}</strong>
          </div>
        </div>
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }} className="glass hover-lift">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            <FiDownload />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exports Generated</div>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text)' }}>{stats.exports}</strong>
          </div>
        </div>
      </section>

      {/* Government Categories */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text)' }}>Workspace Environments</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {suiteCategories.map((cat) => (
            <Link 
              key={cat.name} 
              to={cat.path} 
              style={{ 
                textDecoration: 'none', 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border)', 
                padding: '1.25rem', 
                borderRadius: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'all 0.2s'
              }}
              className="hover-lift"
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${cat.color}20`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {cat.icon}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{cat.name}</h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Main Workspace Layout (Two columns: Pinned & Popular, Recents) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.6fr 1fr', 
          gap: '2rem', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          width: '100%' 
        }} 
        className="responsive-2col"
      >
        {/* Left Column: Starred Favorites & Tool Categorization Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Pinned Favorites */}
          {pinnedTools.length > 0 && (
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.5rem' }} className="glass">
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiStar style={{ color: 'var(--warning)', fill: 'var(--warning)' }} /> Pinned Favorites ({pinnedTools.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="responsive-2col">
                {pinnedTools.map((tool) => (
                  <div 
                    key={tool.id}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{tool.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={tool.route} style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hover-lift">
                        {tool.title}
                      </Link>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tool.category} Suite</span>
                    </div>
                    <button 
                      onClick={() => toggleFavorite(tool.id)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warning)' }}
                      title="Unpin"
                    >
                      ★
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Interactive Toolbox Explorer */}
          <div id="toolbox" style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.5rem' }} className="glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Explore OS Suite Tools</h3>
              {/* Category selector tags */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', maxWidth: '100%' }}>
                {['All', 'PDF', 'Excel', 'Word', 'PPT', 'Image', 'AI', 'Govt', 'Developer'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat as any)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: activeCategory === cat ? 'var(--accent)' : 'var(--card-bg)',
                      color: activeCategory === cat ? 'white' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="responsive-2col">
              {filteredTools.map((tool) => {
                const isStarred = favorites.includes(tool.id)
                return (
                  <div
                    key={tool.id}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      position: 'relative'
                    }}
                    className="hover-lift"
                  >
                    <span style={{ fontSize: '1.5rem', marginTop: '2px' }}>{tool.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={tool.route} style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', display: 'block' }}>
                        {tool.title}
                      </Link>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {tool.description}
                      </p>
                    </div>
                    <button 
                      onClick={() => toggleFavorite(tool.id)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: isStarred ? 'var(--warning)' : 'var(--text-muted)', fontSize: '1rem' }}
                      title={isStarred ? 'Unpin from dashboard' : 'Pin to dashboard'}
                    >
                      {isStarred ? '★' : '☆'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Logs & Global Drag Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Google SSO & Drive Integration Card */}
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.5rem' }} className="glass">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>☁️</span> Google Drive Sync
            </h3>
            {googleToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                  <img 
                    src={googleUser?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'} 
                    alt="Profile" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--accent)' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {googleUser?.name || 'Google User'}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {googleUser?.email}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success)' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
                  Automatic Folder Sync Active
                </div>
                <button 
                  onClick={() => {
                    logoutGoogle();
                    setGoogleUser(null);
                    setGoogleToken(null);
                  }}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', border: '1px solid var(--border)' }}
                >
                  Disconnect Account
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'center', padding: '0.5rem 0' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Connect your Google account to automatically organize and save all exported PDFs, Sheets, presentations, and note drafts to Google Drive.
                </p>
                <Link 
                  to="/login"
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.94 5.94 0 018 12.571a5.96 5.96 0 015.99-5.943c1.528 0 2.91.564 3.978 1.49l3.12-3.07C19.123 3.327 16.744 2 13.99 2 8.163 2 3.5 6.643 3.5 12.571s4.663 10.572 10.49 10.572c6.07 0 10.077-4.244 10.077-10.237 0-.693-.082-1.218-.184-1.621H12.24z"/>
                  </svg>
                  Connect Google Drive
                </Link>
              </div>
            )}
          </div>

          {/* Recent Files Logs */}
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.5rem' }} className="glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiClock /> Recent Activity
              </h3>
              {recentFiles.length > 0 && (
                <button 
                  onClick={clearRecentFiles} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear log
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentFiles.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No recent documents processed. Drag & drop a file here to get started!
                </div>
              ) : (
                recentFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ padding: '0.5rem', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <FiFile size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span 
                        style={{ 
                          fontWeight: 600, 
                          fontSize: '0.85rem', 
                          color: 'var(--text)', 
                          display: 'block', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span>{file.action}</span>
                        <span>•</span>
                        <span>{new Date(file.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {file.sizeSaved && file.sizeSaved > 0 ? (
                          <>
                            <span>•</span>
                            <span style={{ color: 'var(--success)' }}>Saved {formatFileSize(file.sizeSaved)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {file.path && (
                      <Link 
                        to={file.path} 
                        style={{ 
                          padding: '0.25rem', 
                          borderRadius: '4px', 
                          background: 'var(--panel-bg)', 
                          color: 'var(--text)', 
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <FiChevronRight />
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Box representing the Global dropzone entry visually */}
          <div 
            style={{ 
              border: '2px dashed var(--border)', 
              borderRadius: '1.25rem', 
              padding: '2.5rem 1.5rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              background: 'var(--card-bg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            className="hover-lift"
          >
            <FiFolderPlus size={36} style={{ color: 'var(--accent)' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Drag and Drop Anywhere</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, maxWidth: '200px' }}>
              Drop files on this tab at any time to automatically route to processing suites.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Dashboard
