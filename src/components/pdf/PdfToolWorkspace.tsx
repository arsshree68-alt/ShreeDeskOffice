import { useCallback, useEffect, useMemo, useState } from 'react'
import PdfFileDropzone from './PdfFileDropzone'
import PdfPagePreview from './PdfPagePreview'
import PdfProgressBar from './PdfProgressBar'
import { createDownload, formatFileSize } from '../../tools/pdf/engine/fileUtils'
import {
  compressPdfFile,
  deletePdfPages,
  extractPdfPages,
  imagesToPdf,
  loadPdfFileInfo,
  mergePdfFiles,
  pdfToImages,
  reorderPdfPages,
  rotatePdfFile,
  splitPdfFile,
} from '../../tools/pdf/engine/pdfEngine'
import { parsePageOrder, parsePageSelection } from '../../tools/pdf/engine/pageRanges'
import type { PdfFileInfo, PdfOutput, PdfProgress, PdfToolDefinition } from '../../tools/pdf/engine/types'

interface PdfToolWorkspaceProps {
  tool: PdfToolDefinition
}

const getInitialRangeHint = (toolId: PdfToolDefinition['id']) => {
  if (toolId === 'reorder') return 'Example: 3,1,2,4'
  if (toolId === 'delete') return 'Example: 2,5-7'
  if (toolId === 'extract') return 'Example: 1-3,8'
  if (toolId === 'rotate') return 'Leave blank to rotate every page, or enter 1,3-5'
  return ''
}

const PdfToolWorkspace = ({ tool }: PdfToolWorkspaceProps) => {
  const [pdfInfos, setPdfInfos] = useState<PdfFileInfo[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [pageInput, setPageInput] = useState('')
  const [rotation, setRotation] = useState(90)
  const [progress, setProgress] = useState<PdfProgress | null>(null)
  const [output, setOutput] = useState<PdfOutput | null>(null)
  const [feedback, setFeedback] = useState('Upload files to begin local processing.')
  const [processing, setProcessing] = useState(false)

  const primaryPdf = pdfInfos[0]
  const imageSize = useMemo(() => imageFiles.reduce((sum, file) => sum + file.size, 0), [imageFiles])
  const imagePreviews = useMemo(
    () => imageFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
    })),
    [imageFiles],
  )

  useEffect(() => () => {
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [imagePreviews])

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setOutput(null)
    setFeedback('Preparing previews...')
    setProgress({ label: 'Starting preview generation', value: 5 })

    if (tool.mode === 'image') {
      setImageFiles(files)
      setPdfInfos([])
      setProgress({ label: 'Images ready', value: 100 })
      setFeedback(`${files.length} image file${files.length === 1 ? '' : 's'} ready for PDF conversion.`)
      return
    }

    try {
      const infos: PdfFileInfo[] = []
      for (const [index, file] of files.entries()) {
        const info = await loadPdfFileInfo(file, (nextProgress) => {
          const base = Math.round((index / files.length) * 100)
          const weighted = Math.min(100, base + Math.round(nextProgress.value / files.length))
          setProgress({ label: nextProgress.label, value: weighted })
        })
        infos.push(info)
      }
      setPdfInfos(infos)
      setImageFiles([])
      setProgress({ label: 'Workspace ready', value: 100 })
      setFeedback(`${infos.length} PDF file${infos.length === 1 ? '' : 's'} loaded successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read the selected PDF file.'
      setFeedback(message)
      setProgress(null)
    }
  }, [tool.mode])

  const runTool = async () => {
    setProcessing(true)
    setOutput(null)
    setProgress({ label: 'Processing started', value: 5 })

    try {
      let result: PdfOutput

      if (tool.id === 'imageToPdf') {
        if (imageFiles.length === 0) throw new Error('Upload at least one JPG or PNG image.')
        result = await imagesToPdf(imageFiles, setProgress)
      } else {
        if (!primaryPdf) throw new Error('Upload a PDF file first.')

        if (tool.id === 'merge') {
          if (pdfInfos.length < 2) throw new Error('Upload at least two PDF files to merge.')
          result = await mergePdfFiles(pdfInfos.map((info) => info.file), setProgress)
        } else if (tool.id === 'split') {
          result = await splitPdfFile(primaryPdf.file, setProgress)
        } else if (tool.id === 'compress') {
          result = await compressPdfFile(primaryPdf.file, setProgress)
        } else if (tool.id === 'rotate') {
          const pages = parsePageSelection(pageInput, primaryPdf.pageCount)
          result = await rotatePdfFile(primaryPdf.file, pages, rotation, setProgress)
        } else if (tool.id === 'delete') {
          const pages = parsePageSelection(pageInput, primaryPdf.pageCount)
          result = await deletePdfPages(primaryPdf.file, pages, setProgress)
        } else if (tool.id === 'extract') {
          const pages = parsePageSelection(pageInput, primaryPdf.pageCount)
          result = await extractPdfPages(primaryPdf.file, pages, setProgress)
        } else if (tool.id === 'reorder') {
          const pages = parsePageOrder(pageInput, primaryPdf.pageCount)
          result = await reorderPdfPages(primaryPdf.file, pages, setProgress)
        } else {
          result = await pdfToImages(primaryPdf.file, setProgress)
        }
      }

      setOutput(result)
      setProgress({ label: 'Finished', value: 100 })
      setFeedback(`Ready to download ${result.fileName} (${formatFileSize(result.blob.size)}).`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed.'
      setFeedback(message)
      setProgress(null)
    } finally {
      setProcessing(false)
    }
  }

  const requiresPageInput = ['rotate', 'delete', 'extract', 'reorder'].includes(tool.id)

  return (
    <section className="pdf-workspace">
      <div className="pdf-workspace-header">
        <div>
          <span className="pdf-workspace-kicker">Dedicated workspace</span>
          <h2>{tool.icon} {tool.title}</h2>
          <p>{tool.description}</p>
        </div>
        <span className="pdf-local-badge">Local only</span>
      </div>

      <PdfFileDropzone
        mode={tool.mode}
        multiple={tool.acceptsMultiple}
        disabled={processing}
        onFilesSelected={handleFilesSelected}
      />

      {tool.mode === 'image' && imageFiles.length > 0 && (
        <div className="pdf-image-list">
          <div className="pdf-preview-summary">
            <div>
              <span className="summary-label">Images</span>
              <strong>{imageFiles.length}</strong>
            </div>
            <div>
              <span className="summary-label">Size</span>
              <strong>{formatFileSize(imageSize)}</strong>
            </div>
          </div>
          <div className="pdf-image-grid">
            {imagePreviews.map((preview) => (
              <figure key={preview.id} className="pdf-image-card">
                <img src={preview.url} alt={preview.name} />
                <figcaption>{preview.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <PdfPagePreview files={pdfInfos} />

      {requiresPageInput && primaryPdf && (
        <div className="pdf-option-panel">
          <label className="select-label">
            Page selection
            <input
              className="pdf-text-input"
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              placeholder={getInitialRangeHint(tool.id)}
            />
          </label>
          {tool.id === 'rotate' && (
            <label className="select-label">
              Rotation
              <select value={rotation} onChange={(event) => setRotation(Number(event.target.value))}>
                <option value={90}>90° clockwise</option>
                <option value={180}>180°</option>
                <option value={270}>270° clockwise</option>
              </select>
            </label>
          )}
        </div>
      )}

      <PdfProgressBar progress={progress} />

      <div className="pdf-action-row">
        <button type="button" className="btn-primary" disabled={processing} onClick={runTool}>
          {processing ? 'Processing...' : `Run ${tool.title}`}
        </button>
        {output && (
          <button type="button" className="btn-secondary" onClick={() => createDownload(output.blob, output.fileName)}>
            Download Result
          </button>
        )}
      </div>

      <p className="tool-feedback">{feedback}</p>
    </section>
  )
}

export default PdfToolWorkspace
