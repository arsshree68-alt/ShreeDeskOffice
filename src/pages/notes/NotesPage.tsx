import { useState, useEffect } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiPlus, FiSave, FiTrash2, FiCloud, FiCloudOff, FiFolder } from 'react-icons/fi'
import { getGoogleToken, uploadFileToDrive } from '../../utils/googleDrive'

interface Note {
  id: string
  title: string
  content: string
  updatedAt: string
}

const NotesPage = () => {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isDriveConnected, setIsDriveConnected] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  // Load notes from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('shreedesk-notes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setNotes(parsed)
        if (parsed.length > 0) {
          setActiveNoteId(parsed[0].id)
          setTitle(parsed[0].title)
          setContent(parsed[0].content)
        }
      } catch (e) {}
    }
    
    // Check Google Token
    const token = getGoogleToken()
    setIsDriveConnected(!!token)
  }, [])

  // Sync active note state when selection changes
  useEffect(() => {
    if (activeNoteId) {
      const active = notes.find(n => n.id === activeNoteId)
      if (active) {
        setTitle(active.title)
        setContent(active.content)
      }
    } else {
      setTitle('')
      setContent('')
    }
  }, [activeNoteId, notes])

  const saveNotesToLocal = (updatedNotes: Note[]) => {
    setNotes(updatedNotes)
    localStorage.setItem('shreedesk-notes', JSON.stringify(updatedNotes))
  }

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date().toISOString()
    }
    const updated = [newNote, ...notes]
    saveNotesToLocal(updated)
    setActiveNoteId(newNote.id)
  }

  const handleUpdateNote = (newTitle: string, newContent: string) => {
    if (!activeNoteId) return
    const updated = notes.map(n => {
      if (n.id === activeNoteId) {
        return {
          ...n,
          title: newTitle,
          content: newContent,
          updatedAt: new Date().toISOString()
        }
      }
      return n
    })
    saveNotesToLocal(updated)
  }

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    saveNotesToLocal(updated)
    if (activeNoteId === id) {
      if (updated.length > 0) {
        setActiveNoteId(updated[0].id)
      } else {
        setActiveNoteId(null)
      }
    }
  }

  const handleSyncToDrive = async () => {
    if (!activeNoteId) return
    const token = getGoogleToken()
    if (!token) {
      setSyncMessage('Connect to Google Drive on the dashboard first!')
      return
    }

    setSyncing(true)
    setSyncMessage('Uploading to Google Drive...')

    try {
      const fileBlob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const safeTitle = title.trim() || 'Untitled_Note'
      const fileName = `ShreeDesk_${safeTitle.replace(/\s+/g, '_')}.txt`
      
      const res = await uploadFileToDrive('Word', fileName, fileBlob)
      if (res.success) {
        setSyncMessage(`Successfully synced note to Google Drive: ShreeDeskOffice/Word/${fileName}`)
      } else {
        setSyncMessage(`Sync failed: ${res.message}`)
      }
    } catch (err) {
      setSyncMessage('Error uploading file to Drive.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <ToolPageShell
      title="Notes Workspace"
      description="Create, structure, and draft local notes. Link your Google account to sync all drafts instantly to your Google Drive folder structure."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="📝"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
        
        {/* Notes list Sidebar */}
        <aside 
          style={{ 
            background: 'var(--panel-bg)', 
            borderRadius: '1rem', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            border: '1px solid var(--border)',
            maxHeight: '600px'
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

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.25rem' }}>Your Notes ({notes.length})</span>
            {notes.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No notes created yet.
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveNoteId(n.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: activeNoteId === n.id ? 'var(--accent-soft)' : 'var(--card-bg)',
                    border: activeNoteId === n.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                  className="hover-lift"
                >
                  <strong 
                    style={{ 
                      display: 'block', 
                      fontSize: '0.85rem', 
                      color: activeNoteId === n.id ? 'var(--accent)' : 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '1.5rem'
                    }}
                  >
                    {n.title || 'Untitled Note'}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(n.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    title="Delete note"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Note Editor Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          {activeNoteId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              
              {/* Sync Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isDriveConnected ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiCloud /> Drive Connected
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiCloudOff /> Drive Offline
                    </span>
                  )}
                </div>

                <button
                  className="btn-primary"
                  onClick={handleSyncToDrive}
                  disabled={syncing}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  <FiSave /> Sync to Google Drive
                </button>
              </div>

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

              {/* Title Input */}
              <input
                type="text"
                placeholder="Note Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  handleUpdateNote(e.target.value, content)
                }}
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderBottom: '2px solid var(--border)',
                  paddingBottom: '0.5rem',
                  width: '100%'
                }}
              />

              {/* Content Textarea */}
              <textarea
                placeholder="Start drafting your document note here..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  handleUpdateNote(title, e.target.value)
                }}
                style={{
                  flex: 1,
                  minHeight: '400px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  width: '100%',
                  outline: 'none'
                }}
              />

            </div>
          ) : (
            <div 
              style={{ 
                height: '100%', 
                minHeight: '400px',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '1rem',
                border: '2px dashed var(--border)',
                borderRadius: '1rem',
                color: 'var(--text-muted)'
              }}
            >
              <FiFolder size={48} />
              <h4>No Active Note Selected</h4>
              <p style={{ fontSize: '0.85rem' }}>Select a note from the sidebar list or click the button below to create one.</p>
              <button className="btn-secondary" onClick={handleCreateNote}>Create Note</button>
            </div>
          )}
        </div>

      </div>
    </ToolPageShell>
  )
}

export default NotesPage
