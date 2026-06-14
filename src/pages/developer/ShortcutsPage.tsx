import { useState } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiSearch } from 'react-icons/fi'

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

const ShortcutsPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'All' | 'Global' | 'Editor' | 'File System' | 'Integration'>('All')

  const filteredShortcuts = shortcutList.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.keys.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = activeTab === 'All' || item.category === activeTab
    return matchesSearch && matchesCategory
  })

  return (
    <ToolPageShell
      title="Keyboard Shortcuts Guide"
      description="Increase your productivity with built-in hotkeys. Work faster across PDF tools, spreadsheets, and document builders."
      suiteLabel="Developer Suite"
      suiteRoute="/developer"
      icon="⌨️"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Search & Tabs Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.75rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--panel-bg)',
                color: 'var(--text)',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {(['All', 'Global', 'Editor', 'File System', 'Integration'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: activeTab === tab ? 'var(--accent)' : 'var(--card-bg)',
                  color: activeTab === tab ? 'white' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts list */}
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.5rem' }} className="glass">
          {filteredShortcuts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredShortcuts.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingBottom: idx === filteredShortcuts.length - 1 ? '0' : '1rem',
                    borderBottom: idx === filteredShortcuts.length - 1 ? 'none' : '1px solid var(--border)' 
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{item.description}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>{item.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    {item.keys.map((key, kIdx) => (
                      <span key={kIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <kbd 
                          style={{ 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border)', 
                            color: 'var(--text)', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '6px', 
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          {key}
                        </kbd>
                        {kIdx < item.keys.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No shortcuts found matching search query.
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  )
}

export default ShortcutsPage
