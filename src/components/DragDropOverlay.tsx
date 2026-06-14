import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUploadCloud, FiFile } from 'react-icons/fi'

const DragDropOverlay = () => {
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState('')
  const [detectedFile, setDetectedFile] = useState<File | null>(null)

  // Drag counters to handle child elements dragenter/dragleave correctly
  useEffect(() => {
    let dragCounter = 0

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter++
      if (e.dataTransfer && e.dataTransfer.items.length > 0) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter === 0) {
        setIsDragging(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      dragCounter = 0

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        processDroppedFile(file)
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const processDroppedFile = (file: File) => {
    setDetectedFile(file)
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    setFileType(ext)
  }

  const getSuggestedActions = () => {
    switch (fileType) {
      case 'pdf':
        return [
          { label: 'Compress PDF', route: '/pdf/compress', icon: '🗜️' },
          { label: 'Split PDF', route: '/pdf/split', icon: '✂️' },
          { label: 'Merge PDF', route: '/pdf/merge', icon: '🧩' },
          { label: 'PDF to Image', route: '/pdf/pdf-to-image', icon: '🌄' },
          { label: 'Organize pages', route: '/pdf/organize', icon: '🧭' },
        ]
      case 'doc':
      case 'docx':
      case 'rtf':
      case 'txt':
        return [
          { label: 'Convert to PDF', route: '/pdf/word-to-pdf', icon: '📃' },
          { label: 'DOCX Merge', route: '/word/docx-merge', icon: '🗂️' },
          { label: 'Mail Merge template', route: '/word/mail-merge', icon: '✉️' },
        ]
      case 'xls':
      case 'xlsx':
        return [
          { label: 'Merge Spreadsheets', route: '/excel/merge', icon: '🧩' },
          { label: 'Remove Duplicates', route: '/excel/remove-duplicates', icon: '🧹' },
          { label: 'Convert XLSX → CSV', route: '/excel/xlsx-to-csv', icon: '📋' },
        ]
      case 'csv':
        return [
          { label: 'Convert CSV → XLSX', route: '/excel/csv-to-xlsx', icon: '🔄' },
          { label: 'Remove Duplicates', route: '/excel/remove-duplicates', icon: '🧹' },
          { label: 'Merge CSV logs', route: '/excel/merge', icon: '🧩' },
        ]
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return [
          { label: 'Compress Image', route: '/image/compress', icon: '🗜️' },
          { label: 'Resize & Crop', route: '/image/resize', icon: '📐' },
          { label: 'Passport Photo', route: '/image/passport-photo', icon: '🆔' },
          { label: 'Extract Signature', route: '/image/extract-signature', icon: '✒️' },
          { label: 'Document Scanner', route: '/image/scanner', icon: '🔍' },
          { label: 'Convert to PDF', route: '/pdf/image-to-pdf', icon: '🖼️' },
        ]
      case 'json':
        return [
          { label: 'JSON Formatter & Validator', route: '/developer/json', icon: '📁' },
          { label: 'CSV ⇆ JSON Converter', route: '/developer/csv-json', icon: '🔄' },
        ]
      case 'xml':
        return [
          { label: 'XML Formatter', route: '/developer/xml', icon: '💻' },
        ]
      default:
        // Generic fallback options
        return [
          { label: 'AI Document Assistant', route: '/ai/assistant', icon: '💬' },
          { label: 'File Naming Standardizer', route: '/govt/naming-standard', icon: '🏷️' },
        ]
    }
  }

  const handleActionClick = (route: string) => {
    if (detectedFile) {
      navigate(route, { state: { preloadedFile: detectedFile } })
    } else {
      navigate(route)
    }
    resetOverlay()
  }

  const resetOverlay = () => {
    setDetectedFile(null)
    setFileName('')
    setFileType('')
  }

  return (
    <>
      {/* Active Dragging Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(201, 100, 66, 0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              border: '6px dashed var(--accent)',
              margin: '1rem',
              borderRadius: '2rem',
              pointerEvents: 'none',
            }}
          >
            <FiUploadCloud size={80} style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Drop your file here</h2>
            <p style={{ fontSize: '1.2rem', marginTop: '0.5rem', color: 'var(--text)' }}>
              Automatically detect actions & suite options
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-Drop Action Suggestion Modal */}
      <AnimatePresence>
        {detectedFile && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10001,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={resetOverlay}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '500px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '1.5rem',
                padding: '2rem',
                boxShadow: 'var(--shadow-lg)',
                textAlign: 'center',
              }}
              className="glass"
            >
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  fontSize: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                <FiFile />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>File Received</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: '1.5rem' }}>
                "{fileName}" (detected: <strong style={{ textTransform: 'uppercase' }}>{fileType}</strong>)
              </p>

              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <span 
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '0.75rem',
                  }}
                >
                  Suggested OS Actions:
                </span>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {getSuggestedActions().map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleActionClick(action.route)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                        transition: 'all 0.2s',
                      }}
                      className="hover-lift"
                    >
                      <span style={{ fontSize: '1.25rem' }}>{action.icon}</span>
                      <span style={{ flex: 1 }}>{action.label}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>Open &rarr;</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={resetOverlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DragDropOverlay
