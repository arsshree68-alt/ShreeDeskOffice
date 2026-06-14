import { useCallback, useMemo, useState } from 'react'
import type { PdfToolMode } from '../../tools/pdf/engine/types'

interface PdfFileDropzoneProps {
  mode: PdfToolMode
  multiple: boolean
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
}

const acceptedTypes: Record<PdfToolMode, string> = {
  pdf: '.pdf,application/pdf',
  image: '.jpg,.jpeg,.png,image/jpeg,image/png',
}

const isAcceptedFile = (file: File, mode: PdfToolMode) => {
  if (mode === 'pdf') return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  return ['image/jpeg', 'image/png'].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name)
}

const PdfFileDropzone = ({ mode, multiple, disabled = false, onFilesSelected }: PdfFileDropzoneProps) => {
  const [dragging, setDragging] = useState(false)
  const helperText = useMemo(
    () => mode === 'pdf' ? 'Drop PDF files here or browse from your device.' : 'Drop JPG/PNG images here or browse from your device.',
    [mode],
  )

  const emitFiles = useCallback((incomingFiles: FileList | File[]) => {
    const files = Array.from(incomingFiles).filter((file) => isAcceptedFile(file, mode))
    onFilesSelected(multiple ? files : files.slice(0, 1))
  }, [mode, multiple, onFilesSelected])

  return (
    <label
      className={`pdf-dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      style={{ border: dragging ? '2px dashed #f97316' : '2px dashed #cbd5e1', backgroundColor: dragging ? '#fff7ed' : '#ffffff', transition: 'all 0.2s ease', cursor: disabled ? 'not-allowed' : 'pointer' }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) emitFiles(event.dataTransfer.files)
      }}
    >
      <input
        type="file"
        accept={acceptedTypes[mode]}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) emitFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <span className="pdf-dropzone-icon">⬆️</span>
      <strong>{helperText}</strong>
      <small>{multiple ? 'Multi-file upload enabled' : 'Single file workspace'}</small>
    </label>
  )
}

export default PdfFileDropzone
