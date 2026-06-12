import type { PdfFileInfo } from '../../tools/pdf/engine/types'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'

interface PdfPagePreviewProps {
  files: PdfFileInfo[]
}

const PdfPagePreview = ({ files }: PdfPagePreviewProps) => {
  if (files.length === 0) return null

  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

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

      {files.map((file) => (
        <div key={file.id} className="pdf-file-preview">
          <div className="pdf-file-preview-heading">
            <div>
              <h3>{file.name}</h3>
              <p>{file.pageCount} page{file.pageCount === 1 ? '' : 's'} · {formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="pdf-thumbnail-grid">
            {file.thumbnails.map((thumbnail) => (
              <figure key={`${file.id}-${thumbnail.pageNumber}`} className="pdf-thumbnail-card">
                <img src={thumbnail.dataUrl} alt={`${file.name} page ${thumbnail.pageNumber}`} />
                <figcaption>Page {thumbnail.pageNumber}</figcaption>
              </figure>
            ))}
            {file.pageCount > file.thumbnails.length && (
              <div className="pdf-thumbnail-more">
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
