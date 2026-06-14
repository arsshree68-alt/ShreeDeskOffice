import type { PdfFileInfo } from '../../tools/pdf/engine/types'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'
import { FiRotateCw, FiCopy, FiPlusSquare, FiTrash2 } from 'react-icons/fi'

interface PdfPagePreviewProps {
  files: PdfFileInfo[]
  selectedPages: Record<string, number[]>
  pageOrders?: Record<string, number[]>
  pageRotations?: Record<string, Record<number, number>>
  onTogglePage: (fileId: string, pageNumber: number) => void
  onRotatePage?: (fileId: string, pageNumber: number) => void
  onReorderFiles?: (draggedId: string, targetId: string) => void
  onMoveFile: (fileId: string, direction: 'up' | 'down') => void
  onRemoveFile?: (fileId: string) => void
  onReorderPages?: (fileId: string, fromIndex: number, toIndex: number) => void
  onDuplicatePage?: (fileId: string, pageIndex: number) => void
  onInsertBlankPage?: (fileId: string, afterIndex: number) => void
  onDeletePage?: (fileId: string, pageIndex: number) => void
}

const PdfPagePreview = ({ files, selectedPages, pageOrders, pageRotations, onTogglePage, onRotatePage, onReorderFiles, onMoveFile, onRemoveFile, onReorderPages, onDuplicatePage, onInsertBlankPage, onDeletePage }: PdfPagePreviewProps) => {
  if (files.length === 0) return null

  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  const handleDragStart = (event: React.DragEvent, fileId: string) => {
    event.dataTransfer.setData('text/plain', fileId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handlePageDragStart = (event: React.DragEvent, fileId: string, pageIndex: number) => {
    event.dataTransfer.setData('application/x-pdf-page', JSON.stringify({ fileId, pageIndex }))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handlePageDropOn = (event: React.DragEvent, fileId: string, targetIndex: number) => {
    event.preventDefault()
    const payload = event.dataTransfer.getData('application/x-pdf-page')
    if (!payload) return
    try {
      const { fileId: srcId, pageIndex: fromIndex } = JSON.parse(payload)
      if (srcId === fileId && fromIndex !== undefined) {
        onReorderPages?.(fileId, fromIndex, targetIndex)
      }
    } catch (e) {
      // ignore
    }
  }

  const handleDropOn = (event: React.DragEvent, targetId: string) => {
    event.preventDefault()
    const draggedId = event.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== targetId) {
      onReorderFiles?.(draggedId, targetId)
    }
  }

  return (
    <section className="pdf-preview-panel">
      <div className="pdf-preview-summary">
        <div>
          <span className="summary-label">Files</span>
          <strong>{files.length}</strong>
        </div>
        <div>
          <span className="summary-label">Pages</span>
          <strong>{totalPages}</strong>
        </div>
        <div>
          <span className="summary-label">Size</span>
          <strong>{formatFileSize(totalSize)}</strong>
        </div>
      </div>

      {files.map((file, fileIndex) => (
        <div
          key={file.id}
          className="pdf-file-preview"
          draggable
          onDragStart={(e) => handleDragStart(e, file.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDropOn(e, file.id)}
        >
          <div className="pdf-file-preview-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem' }}>{file.name}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{file.pageCount} page{file.pageCount === 1 ? '' : 's'} · {formatFileSize(file.size)}</p>
            </div>
            <div className="pdf-file-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <button aria-label="Move up" onClick={() => onMoveFile(file.id, 'up')} disabled={fileIndex === 0} className="btn-secondary" style={{ padding: '0.5rem' }}>↑</button>
              <button aria-label="Move down" onClick={() => onMoveFile(file.id, 'down')} disabled={fileIndex === files.length - 1} className="btn-secondary" style={{ padding: '0.5rem' }}>↓</button>
              {onRemoveFile && (
                <button aria-label="Remove file" onClick={() => onRemoveFile(file.id)} className="btn-secondary" style={{ padding: '0.5rem 1rem', color: 'var(--danger)' }}>Remove</button>
              )}
            </div>
          </div>
          <div className="pdf-thumbnail-grid">
            {(pageOrders?.[file.id] ?? file.thumbnails.map((t) => t.pageNumber)).map((pageNumber, idx) => {
              const thumbnail = file.thumbnails.find((t) => t.pageNumber === pageNumber)
              const selected = (selectedPages[file.id] ?? []).includes(pageNumber)
              const rotation = pageRotations?.[file.id]?.[pageNumber] ?? 0
              const rotationClass = rotation ? `rot-${rotation}` : ''
              
              if (!thumbnail) {
                return (
                  <figure key={`${file.id}-${pageNumber}-${idx}`} className={`pdf-thumbnail-card ${selected ? 'selected' : ''}`}> 
                    <div className="thumbnail-missing" style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--panel-bg)', borderRadius: '0.5rem' }}>
                      {pageNumber === -1 ? 'Blank Page' : `Page ${pageNumber}`}
                    </div>
                    <div className="thumbnail-actions-overlay">
                       {onDeletePage && <button className="thumbnail-action-btn" title="Delete" onClick={() => onDeletePage(file.id, idx)}><FiTrash2 size={14}/></button>}
                    </div>
                    <figcaption className="thumbnail-footer">
                      <label>
                        <input type="checkbox" checked={selected} onChange={() => onTogglePage(file.id, pageNumber)} />
                        <span>{pageNumber === -1 ? 'Blank' : `Page ${pageNumber}`}</span>
                      </label>
                    </figcaption>
                  </figure>
                )
              }
              return (
                <figure
                  key={`${file.id}-${pageNumber}-${idx}`}
                  className={`pdf-thumbnail-card ${selected ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => handlePageDragStart(e, file.id, idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handlePageDropOn(e, file.id, idx)}
                >
                  <img className={rotationClass} src={thumbnail.dataUrl} alt={`${file.name} page ${thumbnail.pageNumber}`} />
                  
                  <div className="thumbnail-actions-overlay">
                    {onRotatePage && <button className="thumbnail-action-btn" title="Rotate" onClick={() => onRotatePage(file.id, pageNumber)}><FiRotateCw size={14}/></button>}
                    {onDuplicatePage && <button className="thumbnail-action-btn" title="Duplicate" onClick={() => onDuplicatePage(file.id, idx)}><FiCopy size={14}/></button>}
                    {onInsertBlankPage && <button className="thumbnail-action-btn" title="Insert Blank" onClick={() => onInsertBlankPage(file.id, idx)}><FiPlusSquare size={14}/></button>}
                    {onDeletePage && <button className="thumbnail-action-btn" title="Delete" onClick={() => onDeletePage(file.id, idx)}><FiTrash2 size={14}/></button>}
                  </div>

                  <figcaption className="thumbnail-footer">
                    <label>
                      <input type="checkbox" checked={selected} onChange={() => onTogglePage(file.id, pageNumber)} />
                      <span>Page {thumbnail.pageNumber}</span>
                    </label>
                    {rotation !== 0 && (
                      <span className="rotation-badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}>{rotation}°</span>
                    )}
                  </figcaption>
                </figure>
              )
            })}
            {file.pageCount > file.thumbnails.length && (
              <div className="pdf-thumbnail-more" style={{ display: 'grid', placeItems: 'center', background: 'var(--panel-bg)', color: 'var(--text-muted)' }}>
                +{file.pageCount - file.thumbnails.length} more pages
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

export default PdfPagePreview
