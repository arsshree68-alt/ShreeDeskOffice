import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiStar, FiArrowRight, FiX } from 'react-icons/fi'
import { toolRegistry, type ToolRegistryEntry } from '../tools/toolRegistry'
import { useFavorites } from '../hooks/useFavorites'
import { useRecentFiles } from '../hooks/useRecentFiles'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { favorites } = useFavorites()
  const { recentFiles } = useRecentFiles()

  // Reset selected item on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Filter tools based on query and keywords
  const filteredList = useMemo<ToolRegistryEntry[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // If empty query, show pinned favorites first, then rest
      const favTools = toolRegistry.filter((t) => favorites.includes(t.id))
      const popular = toolRegistry.filter((t) => !favorites.includes(t.id)).slice(0, 5)
      return [...favTools, ...popular]
    }

    return toolRegistry.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchDesc = t.description.toLowerCase().includes(q)
      const matchCat = t.category.toLowerCase().includes(q)
      const matchKeywords = t.keywords.some((k) => k.toLowerCase().includes(q))
      return matchTitle || matchDesc || matchCat || matchKeywords
    })
  }, [query, favorites])

  const handleSelect = useCallback((tool: ToolRegistryEntry) => {
    // Save to recents (simulate file action or navigation)
    // For now we just route to it
    navigate(tool.route)
    onClose()
  }, [navigate, onClose])

  // Handle global key binds (Escape to close, arrows to select, Enter to run)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredList.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredList.length) % filteredList.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredList[selectedIndex]) {
          handleSelect(filteredList[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, query, favorites, recentFiles, filteredList, handleSelect, onClose])

  // Handle clicking overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="palette-overlay" 
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 12, 10, 0.4)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '10vh',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          ref={containerRef}
          style={{
            width: '100%',
            maxWidth: '640px',
            height: 'fit-content',
            maxHeight: '480px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '1.25rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          className="palette-window glass"
        >
          {/* Header Search Field */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.25rem',
              borderBottom: '1px solid var(--border)',
              gap: '0.75rem',
            }}
          >
            <FiSearch size={22} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tools, formulas, dashboards... (e.g. merge, base64)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '1.1rem',
                color: 'var(--text)',
              }}
            />
            <button 
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Results List */}
          <div 
            style={{
              overflowY: 'auto',
              maxHeight: '360px',
              padding: '0.5rem',
            }}
          >
            {filteredList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No tools found for "{query}"
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.5rem 0.75rem', letterSpacing: '0.05em' }}>
                  {query ? 'Search Results' : 'Favorites & Popular Suggestions'}
                </div>
                {filteredList.map((tool, idx) => {
                  const isFav = favorites.includes(tool.id)
                  const isHighlighted = idx === selectedIndex
                  return (
                    <div
                      key={tool.id}
                      onClick={() => handleSelect(tool)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        background: isHighlighted ? 'var(--accent-soft)' : 'transparent',
                        transition: 'background 0.1s ease',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem' }}>{tool.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: isHighlighted ? 'var(--accent)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {tool.title}
                          {isFav && <FiStar size={12} fill="var(--warning)" color="var(--warning)" />}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tool.description}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', background: 'var(--panel-bg)', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {tool.category}
                        </span>
                        {isHighlighted && <FiArrowRight size={16} style={{ color: 'var(--accent)' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div 
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--panel-bg)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              Use <kbd style={{ padding: '0.1rem 0.3rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>↑</kbd> <kbd style={{ padding: '0.1rem 0.3rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>↓</kbd> to navigate, <kbd style={{ padding: '0.1rem 0.3rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>Enter</kbd> to select
            </div>
            <div>
              <kbd style={{ padding: '0.1rem 0.3rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>ESC</kbd> to close
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default CommandPalette
