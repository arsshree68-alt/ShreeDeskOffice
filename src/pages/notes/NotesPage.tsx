import { useState, useEffect, useMemo, useRef } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { 
  FiPlus, FiTrash2, FiCloud, FiCloudOff, FiFolder, 
  FiBold, FiItalic, FiUnderline, FiList, FiCheckSquare, 
  FiCode, FiGrid, FiEye, FiEdit3, FiTag, FiArchive, 
  FiRotateCcw, FiSearch, FiStar 
} from 'react-icons/fi'
import { getGoogleToken, getGoogleProfile, uploadFileToDrive } from '../../utils/googleDrive'

interface Note {
  id: string
  title: string
  content: string
  folder: string // 'Work' | 'Personal' | 'Ideas' | 'General'
  tags: string[]
  isPinned: boolean
  isArchived: boolean
  isTrashed: boolean
  updatedAt: string
}

const DEFAULT_FOLDERS = ['All Notes', 'Pinned', 'Work', 'Personal', 'Ideas', 'Archive', 'Trash']

const NotesPage = () => {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  
  // Editor States
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [noteFolder, setNoteFolder] = useState('General')
  const [tagsInput, setTagsInput] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  
  // Navigation & Filtering States
  const [activeSidebarFolder, setActiveSidebarFolder] = useState('All Notes')
  const [searchQuery, setSearchQuery] = useState('')
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write')

  const [isDriveConnected, setIsDriveConnected] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get localized user-specific localStorage key
  const getNotesStorageKey = () => {
    const profile = getGoogleProfile()
    return profile && profile.email ? `shreedesk-user-${profile.email}-notes` : 'shreedesk-notes'
  }

  // Load notes from local storage on mount/login status change
  useEffect(() => {
    const key = getNotesStorageKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setNotes(parsed)
        if (parsed.length > 0) {
          const first = parsed[0]
          setActiveNoteId(first.id)
          setTitle(first.title)
          setContent(first.content)
          setNoteFolder(first.folder || 'General')
          setTagsInput(first.tags ? first.tags.join(', ') : '')
          setIsPinned(first.isPinned || false)
        }
      } catch (e) {
        setNotes([])
      }
    } else {
      setNotes([])
      setActiveNoteId(null)
    }

    const token = getGoogleToken()
    setIsDriveConnected(!!token)
  }, [])

  // Auto-save active note content changes
  const saveNotesToLocal = (updatedNotes: Note[]) => {
    setNotes(updatedNotes)
    const key = getNotesStorageKey()
    localStorage.setItem(key, JSON.stringify(updatedNotes))
  }

  const handleCreateNote = () => {
    // Determine target folder if creating inside a folder
    let initialFolder = 'General'
    if (['Work', 'Personal', 'Ideas'].includes(activeSidebarFolder)) {
      initialFolder = activeSidebarFolder
    }

    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'Untitled Note',
      content: '',
      folder: initialFolder,
      tags: [],
      isPinned: activeSidebarFolder === 'Pinned',
      isArchived: false,
      isTrashed: false,
      updatedAt: new Date().toISOString()
    }
    const updated = [newNote, ...notes]
    saveNotesToLocal(updated)
    setActiveNoteId(newNote.id)
    setTitle(newNote.title)
    setContent(newNote.content)
    setNoteFolder(newNote.folder)
    setTagsInput('')
    setIsPinned(newNote.isPinned)
    setEditorTab('write')
  }

  // Auto-save effect
  const triggerAutoSave = (updatedTitle: string, updatedContent: string, updatedFolder: string, updatedTags: string[], pinStatus: boolean) => {
    if (!activeNoteId) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

    autoSaveTimerRef.current = setTimeout(() => {
      const updated = notes.map(n => {
        if (n.id === activeNoteId) {
          return {
            ...n,
            title: updatedTitle,
            content: updatedContent,
            folder: updatedFolder,
            tags: updatedTags,
            isPinned: pinStatus,
            updatedAt: new Date().toISOString()
          }
        }
        return n
      })
      saveNotesToLocal(updated)
    }, 400) // 400ms debounce auto-save
  }

  const handleEditorChange = (field: 'title' | 'content' | 'folder' | 'tags' | 'pin', val: any) => {
    let nextTitle = title
    let nextContent = content
    let nextFolder = noteFolder
    let nextTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    let nextPin = isPinned

    if (field === 'title') {
      setTitle(val)
      nextTitle = val
    } else if (field === 'content') {
      setContent(val)
      nextContent = val
    } else if (field === 'folder') {
      setNoteFolder(val)
      nextFolder = val
    } else if (field === 'tags') {
      setTagsInput(val)
      nextTags = val.split(',').map((t: string) => t.trim()).filter(Boolean)
    } else if (field === 'pin') {
      setIsPinned(val)
      nextPin = val
    }

    triggerAutoSave(nextTitle, nextContent, nextFolder, nextTags, nextPin)
  }

  // Selection change
  const handleSelectNote = (id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) {
      setActiveNoteId(note.id)
      setTitle(note.title)
      setContent(note.content)
      setNoteFolder(note.folder || 'General')
      setTagsInput(note.tags ? note.tags.join(', ') : '')
      setIsPinned(note.isPinned || false)
      setEditorTab('write')
      setSyncMessage('')
    }
  }

  // Delete note (move to trash, or delete permanently if already in trash)
  const handleDeleteNote = (id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note) return

    let updated: Note[]
    if (note.isTrashed) {
      // Delete permanently
      updated = notes.filter(n => n.id !== id)
    } else {
      // Move to trash
      updated = notes.map(n => n.id === id ? { ...n, isTrashed: true, isPinned: false } : n)
    }

    saveNotesToLocal(updated)
    if (activeNoteId === id) {
      const remaining = updated.filter(n => {
        if (activeSidebarFolder === 'Trash') return n.isTrashed
        if (activeSidebarFolder === 'Archive') return n.isArchived && !n.isTrashed
        return !n.isArchived && !n.isTrashed
      })
      if (remaining.length > 0) {
        handleSelectNote(remaining[0].id)
      } else {
        setActiveNoteId(null)
      }
    }
  }

  const handleRestoreNote = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, isTrashed: false } : n)
    saveNotesToLocal(updated)
    handleSelectNote(id)
  }

  const handleArchiveToggle = () => {
    if (!activeNoteId) return
    const note = notes.find(n => n.id === activeNoteId)
    if (!note) return
    
    const nextArchived = !note.isArchived
    const updated = notes.map(n => n.id === activeNoteId ? { ...n, isArchived: nextArchived, isPinned: false } : n)
    saveNotesToLocal(updated)
    
    // Select another note from active category
    const remaining = updated.filter(n => {
      if (activeSidebarFolder === 'Archive') return n.isArchived && !n.isTrashed
      return !n.isArchived && !n.isTrashed
    })
    if (remaining.length > 0) {
      handleSelectNote(remaining[0].id)
    } else {
      setActiveNoteId(null)
    }
  }

  // Filter notes based on sidebar category and search query
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Trash check
      if (activeSidebarFolder === 'Trash') {
        if (!n.isTrashed) return false
      } else {
        if (n.isTrashed) return false
      }

      // Archive check
      if (activeSidebarFolder === 'Archive') {
        if (!n.isArchived) return false
      } else if (activeSidebarFolder !== 'Trash') {
        if (n.isArchived) return false
      }

      // Pinned check
      if (activeSidebarFolder === 'Pinned') {
        if (!n.isPinned) return false
      }

      // Specific folder check
      if (['Work', 'Personal', 'Ideas'].includes(activeSidebarFolder)) {
        if (n.folder !== activeSidebarFolder) return false
      }

      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = n.title.toLowerCase().includes(q)
        const matchContent = n.content.toLowerCase().includes(q)
        const matchTags = n.tags.some(t => t.toLowerCase().includes(q))
        return matchTitle || matchContent || matchTags
      }

      return true
    })
  }, [notes, activeSidebarFolder, searchQuery])

  // Editor formatting functions
  const insertFormat = (before: string, after = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    const replacement = before + (selected || 'text') + after
    const newContent = text.substring(0, start) + replacement + text.substring(end)
    
    handleEditorChange('content', newContent)
    
    // Reset focus and selection range
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || 'text').length)
    }, 0)
  }

  // Statistics
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0
  }, [content])

  const charCount = useMemo(() => content.length, [content])
  const readingTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 200)), [wordCount])

  // Google Drive Sync
  const handleSyncToDrive = async () => {
    if (!activeNoteId) return
    const token = getGoogleToken()
    if (!token) {
      setSyncMessage('Connect to Google Drive on the dashboard settings first!')
      return
    }

    setSyncing(true)
    setSyncMessage('Syncing to Google Drive folder: ShreeDeskOffice/Notes...')

    try {
      const fileBlob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const safeTitle = title.trim() || 'Untitled_Note'
      const fileName = `ShreeDesk_${safeTitle.replace(/\s+/g, '_')}.txt`
      
      const res = await uploadFileToDrive('Notes', fileName, fileBlob)
      if (res.success) {
        setSyncMessage(`Successfully synced note to Google Drive: ShreeDeskOffice/Notes/${fileName}`)
      } else {
        setSyncMessage(`Sync failed: ${res.message}`)
      }
    } catch (err) {
      setSyncMessage('Error uploading file to Drive.')
    } finally {
      setSyncing(false)
    }
  }

  // Export handlers
  const handleExport = (type: 'txt' | 'md' | 'docx' | 'pdf') => {
    const safeTitle = title.trim() || 'Untitled_Note'
    const fileName = `ShreeDesk_${safeTitle.replace(/\s+/g, '_')}`

    if (type === 'txt') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      downloadFile(blob, `${fileName}.txt`)
    } else if (type === 'md') {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      downloadFile(blob, `${fileName}.md`)
    } else if (type === 'docx') {
      // Basic HTML wrapper that MS Word parses easily as docx
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${title}</title><style>body { font-family: Arial; line-height: 1.6; }</style></head>
        <body>
          <h1>${title}</h1>
          <div>${renderMarkdown(content)}</div>
        </body>
        </html>
      `
      const blob = new Blob([htmlContent], { type: 'application/msword' })
      downloadFile(blob, `${fileName}.docx`)
    } else if (type === 'pdf') {
      window.print()
    }
  }

  const downloadFile = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Markdown translation helper for Preview Mode
  const renderMarkdown = (md: string) => {
    if (!md.trim()) return '<p style="color: var(--text-muted); font-style: italic;">Start typing to see the Markdown preview rendering here...</p>'
    
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Bold, Italic, Underline
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/_((.|\n)*?)_/g, '<u>$1</u>')

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: var(--panel-bg); border: 1px solid var(--border); padding: 0.75rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.875rem; overflow-x: auto; margin: 1rem 0; white-space: pre-wrap;"><code>$1</code></pre>')

    // Checkboxes
    html = html.replace(/^- \[ \] (.*$)/gim, '<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 0.25rem;"><input type="checkbox" disabled /> <span>$1</span></div>')
    html = html.replace(/^- \[x\] (.*$)/gim, '<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 0.25rem;"><input type="checkbox" checked disabled /> <span style="text-decoration: line-through; color: var(--text-muted)">$1</span></div>')

    // Lists
    html = html.replace(/^- (.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.25rem; list-style-type: disc;">$1</li>')
    html = html.replace(/^\d+\. (.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.25rem; list-style-type: decimal;">$1</li>')

    // Tables
    const lines = html.split('\n')
    let inTable = false
    let tableRows: string[] = []
    
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim()
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true
          tableRows = []
        }
        const cells = line.split('|').slice(1, -1).map(c => c.trim())
        const isHeaderDivider = cells.every(c => c.match(/^:-*-?:*$/) || c.match(/^-+$/))
        
        if (isHeaderDivider) continue
        
        const rowHtml = cells.map(c => `<td style="border: 1px solid var(--border); padding: 0.4rem 0.75rem;">${c}</td>`).join('')
        tableRows.push(`<tr>${rowHtml}</tr>`)
        lines[idx] = ''
      } else {
        if (inTable) {
          inTable = false
          lines[idx - 1] = `<table style="width:100%; border-collapse:collapse; margin:1rem 0; border: 1px solid var(--border); font-size:0.9rem;"><tbody>${tableRows.join('')}</tbody></table>`
        }
      }
    }
    html = lines.join('\n')

    // Paragraph blocks
    html = html.split('\n\n').map(p => {
      if (p.trim().startsWith('<h') || p.trim().startsWith('<pre') || p.trim().startsWith('<li') || p.trim().startsWith('<div') || p.trim().startsWith('<table')) {
        return p
      }
      return `<p style="margin-bottom: 0.75rem; line-height: 1.6;">${p.replace(/\n/g, '<br />')}</p>`
    }).join('\n')

    return html
  }

  const selectedNote = notes.find(n => n.id === activeNoteId)

  return (
    <ToolPageShell
      title="Notes Workspace"
      description="Create, structure, and tag notes in browser local storage. Synchronize document drafts instantly to your Google Drive subfolder tree."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="📝"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
        
        {/* Left Sidebar */}
        <aside 
          style={{ 
            background: 'var(--panel-bg)', 
            borderRadius: '1rem', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem', 
            border: '1px solid var(--border)',
            maxHeight: '75vh',
            overflowY: 'auto'
          }} 
          className="glass"
        >
          <button 
            className="btn-primary" 
            onClick={handleCreateNote}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
          >
            <FiPlus /> New Note
          </button>

          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.5rem 0.4rem 2rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Categories/Folders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.25rem', display: 'block' }}>Categories</span>
            {DEFAULT_FOLDERS.map((folder) => {
              let icon = '📁'
              if (folder === 'All Notes') icon = '📓'
              else if (folder === 'Pinned') icon = '⭐'
              else if (folder === 'Archive') icon = '🗄️'
              else if (folder === 'Trash') icon = '🗑️'

              return (
                <button
                  key={folder}
                  onClick={() => {
                    setActiveSidebarFolder(folder)
                    setSearchQuery('')
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: activeSidebarFolder === folder ? 'var(--accent-soft)' : 'transparent',
                    color: activeSidebarFolder === folder ? 'var(--accent)' : 'var(--text)',
                    fontWeight: activeSidebarFolder === folder ? 700 : 500,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{icon}</span>
                  <span>{folder}</span>
                </button>
              )
            })}
          </div>

          {/* Active Folder Notes list */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', display: 'block' }}>
              Notes ({filteredNotes.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '25vh', overflowY: 'auto' }}>
              {filteredNotes.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No matches.
                </div>
              ) : (
                filteredNotes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNote(n.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: activeNoteId === n.id ? 'var(--accent-soft)' : 'var(--card-bg)',
                      border: activeNoteId === n.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.1s'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: activeNoteId === n.id ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.title || 'Untitled Note'}
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                      title={n.isTrashed ? 'Delete permanently' : 'Move to Trash'}
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Note Editor Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeNoteId && selectedNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem 2rem' }} className="glass">
              
              {/* Sync Message banner */}
              {syncMessage && (
                <div 
                  style={{ 
                    padding: '0.65rem 1rem', 
                    borderRadius: '0.5rem', 
                    background: syncMessage.includes('Successfully') ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-bg)', 
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                    color: syncMessage.includes('Successfully') ? 'var(--success)' : 'var(--text)'
                  }}
                >
                  {syncMessage}
                </div>
              )}

              {/* Top Control Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setEditorTab('write')}
                    className={editorTab === 'write' ? 'btn-primary' : 'btn-secondary'}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    <FiEdit3 size={14} /> Write
                  </button>
                  <button 
                    onClick={() => setEditorTab('preview')}
                    className={editorTab === 'preview' ? 'btn-primary' : 'btn-secondary'}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    <FiEye size={14} /> Preview
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Pin status */}
                  <button
                    onClick={() => handleEditorChange('pin', !isPinned)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isPinned ? 'var(--warning)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: '0.4rem',
                      alignItems: 'center',
                    }}
                    title={isPinned ? 'Unpin Note' : 'Pin Note'}
                  >
                    <FiStar size={18} style={{ fill: isPinned ? 'var(--warning)' : 'none' }} />
                  </button>

                  {/* Archive */}
                  <button
                    onClick={handleArchiveToggle}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    title={selectedNote.isArchived ? 'Move to Active Notes' : 'Move to Archive'}
                  >
                    <FiArchive size={14} />
                    <span>{selectedNote.isArchived ? 'Activate' : 'Archive'}</span>
                  </button>

                  {/* Drive Sync */}
                  <button
                    className="btn-primary"
                    onClick={handleSyncToDrive}
                    disabled={syncing || selectedNote.isTrashed}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    {isDriveConnected ? <FiCloud size={14} /> : <FiCloudOff size={14} />}
                    <span>Sync to Drive</span>
                  </button>

                  {/* Export dropdown */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleExport(e.target.value as any)
                          e.target.value = '' // reset
                        }
                      }}
                      style={{
                        padding: '0.35rem 1.5rem 0.35rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">💾 Export note...</option>
                      <option value="txt">Export as Plain Text (.txt)</option>
                      <option value="md">Export as Markdown (.md)</option>
                      <option value="docx">Export as MS Word (.docx)</option>
                      <option value="pdf">Print / PDF (.pdf)</option>
                    </select>
                  </div>
                </div>
              </div>

              {selectedNote.isTrashed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>This note is in the Trash. Restore it to resume editing.</span>
                  <button onClick={() => handleRestoreNote(selectedNote.id)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', border: '1px solid #fca5a5', background: 'white' }}><FiRotateCcw size={14} /> Restore</button>
                  <button onClick={() => handleDeleteNote(selectedNote.id)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#b91c1c', color: 'white' }}><FiTrash2 size={14} /> Delete Forever</button>
                </div>
              ) : (
                <>
                  {/* Folders & Tags Input Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', flexWrap: 'wrap' }} className="responsive-2col">
                    <label className="select-label" style={{ width: '100%' }}>
                      Folder
                      <select 
                        value={noteFolder} 
                        onChange={(e) => handleEditorChange('folder', e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      >
                        <option value="General">📂 General</option>
                        <option value="Work">🏢 Work</option>
                        <option value="Personal">🏠 Personal</option>
                        <option value="Ideas">💡 Ideas</option>
                      </select>
                    </label>

                    <label className="input-label" style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><FiTag size={12} /> Tags (comma separated)</span>
                      <input
                        type="text"
                        placeholder="e.g. project, finance, drafts"
                        value={tagsInput}
                        onChange={(e) => handleEditorChange('tags', e.target.value)}
                        style={{ padding: '0.45rem', fontSize: '0.85rem', borderRadius: '0.5rem' }}
                      />
                    </label>
                  </div>

                  {editorTab === 'write' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Editor Formatting Toolbar */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', padding: '0.25rem', background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                        <button onClick={() => insertFormat('**', '**')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Bold (Ctrl+B)"><FiBold size={14} /></button>
                        <button onClick={() => insertFormat('*', '*')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Italic (Ctrl+I)"><FiItalic size={14} /></button>
                        <button onClick={() => insertFormat('<u>', '</u>')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Underline"><FiUnderline size={14} /></button>
                        <span style={{ width: '1px', background: 'var(--border)', margin: '0.25rem' }}></span>
                        <button onClick={() => insertFormat('# ')} className="btn-secondary" style={{ padding: '0.4rem 0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 700 }} title="H1">H1</button>
                        <button onClick={() => insertFormat('## ')} className="btn-secondary" style={{ padding: '0.4rem 0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 700 }} title="H2">H2</button>
                        <button onClick={() => insertFormat('### ')} className="btn-secondary" style={{ padding: '0.4rem 0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 700 }} title="H3">H3</button>
                        <span style={{ width: '1px', background: 'var(--border)', margin: '0.25rem' }}></span>
                        <button onClick={() => insertFormat('- ')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Bullet List"><FiList size={14} /></button>
                        <button onClick={() => insertFormat('- [ ] ')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Task Checklist"><FiCheckSquare size={14} /></button>
                        <button onClick={() => insertFormat('```\n', '\n```')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Code Block"><FiCode size={14} /></button>
                        <button onClick={() => insertFormat('\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n')} className="btn-secondary" style={{ padding: '0.4rem', border: 'none', minWidth: '32px' }} title="Insert Table"><FiGrid size={14} /></button>
                      </div>

                      {/* Title Input */}
                      <input
                        type="text"
                        placeholder="Note Title"
                        value={title}
                        onChange={(e) => handleEditorChange('title', e.target.value)}
                        style={{
                          fontSize: '1.75rem',
                          fontWeight: 800,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text)',
                          borderBottom: '2px solid var(--border)',
                          paddingBottom: '0.25rem',
                          width: '100%',
                          outline: 'none'
                        }}
                      />

                      {/* Text editor content */}
                      <textarea
                        id="note-textarea"
                        placeholder="Start typing note content in Markdown format..."
                        value={content}
                        onChange={(e) => handleEditorChange('content', e.target.value)}
                        style={{
                          minHeight: '350px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text)',
                          fontSize: '1.05rem',
                          lineHeight: 1.6,
                          width: '100%',
                          outline: 'none',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', margin: 0 }}>
                        {title || 'Untitled Note'}
                      </h1>
                      
                      {/* Markdown Preview container */}
                      <div 
                        className="markdown-preview-body"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                        style={{
                          minHeight: '380px',
                          color: 'var(--text)',
                          fontSize: '1.05rem',
                          lineHeight: 1.6,
                          overflowY: 'auto'
                        }}
                      />
                    </div>
                  )}

                  {/* Character/Word/Time Stats bar */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>🔤 <strong>{charCount.toLocaleString()}</strong> characters</span>
                    <span>📝 <strong>{wordCount.toLocaleString()}</strong> words</span>
                    <span>⏱️ <strong>{readingTime}</strong> min read</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 600 }}>✓ Auto-saved locally</span>
                  </div>
                </>
              )}

            </div>
          ) : (
            <div 
              style={{ 
                height: '100%', 
                minHeight: '450px',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '1rem',
                border: '2px dashed var(--border)',
                borderRadius: '1rem',
                color: 'var(--text-muted)',
                background: 'var(--panel-bg)',
                padding: '2rem'
              }}
              className="glass"
            >
              <FiFolder size={48} style={{ color: 'var(--accent)' }} />
              <h4 style={{ margin: 0 }}>No Active Note Selected</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '280px', lineHeight: 1.4 }}>Select a note from the sidebar list or click the button below to start drafting.</p>
              <button className="btn-secondary" onClick={handleCreateNote}>Create Note</button>
            </div>
          )}
        </div>

      </div>
    </ToolPageShell>
  )
}

export default NotesPage
