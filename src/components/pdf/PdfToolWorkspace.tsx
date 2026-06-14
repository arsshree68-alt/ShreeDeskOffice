import { useCallback, useEffect, useMemo, useState } from 'react'
import PdfFileDropzone from './PdfFileDropzone'
import PdfPagePreview from './PdfPagePreview'
import PdfProgressBar from './PdfProgressBar'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'
import { loadPdfFileInfo } from '../../tools/pdf/engine/pdfEngine'
import { parsePageOrder, parsePageSelection } from '../../tools/pdf/engine/pageRanges'
import type { PdfFileInfo, PdfOutput, PdfProgress, PdfToolDefinition } from '../../tools/pdf/engine/types'
import ResultSummaryCard from '../ui/ResultSummaryCard'
import { getGoogleToken, uploadFileToDrive } from '../../utils/googleDrive'

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
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeTakenMs, setTimeTakenMs] = useState<number | null>(null)
  const [selectedPages, setSelectedPages] = useState<Record<string, number[]>>({})
  const [pageRotations, setPageRotations] = useState<Record<string, Record<number, number>>>({})
  const [pageOrders, setPageOrders] = useState<Record<string, number[]>>({})
  const [includeRotations, setIncludeRotations] = useState(true)
  const [includeOnlySelectedPages, setIncludeOnlySelectedPages] = useState(true)
  const [outputFileName, setOutputFileName] = useState(tool.outputLabel || 'ShreeDesk_Merged_PDF.pdf')
  const [compressPreset, setCompressPreset] = useState<'maximum' | 'recommended' | 'high' | 'custom'>('recommended')
  const [customCompression, setCustomCompression] = useState(100)
  const [splitMode, setSplitMode] = useState<'range' | 'pages' | 'size'>('pages')
  const [splitRangeFrom, setSplitRangeFrom] = useState(1)
  const [splitRangeTo, setSplitRangeTo] = useState(1)
  const [splitChunkSize, setSplitChunkSize] = useState(1)
  const [splitMaxSizeMB, setSplitMaxSizeMB] = useState(6)
  const [pdfToImageFormat, setPdfToImageFormat] = useState<'png' | 'jpeg' | 'webp'>('png')
  const [pdfToImageQuality, setPdfToImageQuality] = useState(0.92)

  const estimatedCompressionRatio = useMemo(() => {
    if (compressPreset === 'maximum') return 0.3
    if (compressPreset === 'high') return 0.9
    if (compressPreset === 'recommended') return 0.6
    // custom
    if (customCompression >= 100) return 1 // no shrink, no growth applied
    // below 100%: roughly proportional, with a floor so quality isn't destroyed
    return Math.max(0.15, customCompression / 100)
  }, [compressPreset, customCompression])

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

  useEffect(() => {
    let defaultName = 'ShreeDesk_Document.pdf'
    if (tool.id === 'merge') defaultName = 'ShreeDesk_Merged.pdf'
    else if (tool.id === 'split') defaultName = 'ShreeDesk_Split.zip'
    else if (tool.id === 'compress') defaultName = 'ShreeDesk_Compressed.pdf'
    else if (primaryPdf) {
      const ext = tool.id === 'pdfToImage' ? 'zip' : 'pdf'
      const baseName = primaryPdf.file.name.replace(/\.[^/.]+$/, "")
      defaultName = `ShreeDesk_${baseName}_${tool.id}.${ext}`
    } else {
      defaultName = `ShreeDesk_${tool.id}.pdf`
    }
    setOutputFileName(defaultName)
  }, [tool, primaryPdf])

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
      // initialize pageOrders for each file (0-based indexes)
      const orders: Record<string, number[]> = {}
      infos.forEach((info) => {
        orders[info.id] = Array.from({ length: info.pageCount }, (_, i) => i + 1)
      })
      setPageOrders(orders)
      // reset any previous page selections when new files are loaded
      setSelectedPages({})
      setImageFiles([])
      if (infos[0]) setSplitRangeTo(infos[0].pageCount)
      setProgress({ label: 'Workspace ready', value: 100 })
      setFeedback(`${infos.length} PDF file${infos.length === 1 ? '' : 's'} loaded successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read the selected PDF file.'
      setFeedback(message)
      setProgress(null)
    }
  }, [tool.mode])

  const runTool = async () => {
    setStartTime(Date.now())
    setProcessing(true)
    setOutput(null)
    setProgress({ label: '⬆ Uploading & Validating files...', value: 10 })

    try {
      let result: PdfOutput

      if (tool.id === 'imageToPdf') {
        if (imageFiles.length === 0) throw new Error('Upload at least one JPG or PNG image.')
        const engine = await import('../../tools/pdf/engine/pdfEngine')
        result = await engine.imagesToPdf(imageFiles, setProgress)
      } else {
        if (!primaryPdf) throw new Error('Upload a PDF file first.')

        if (tool.id === 'merge') {
          if (pdfInfos.length < 2) throw new Error('Upload at least two PDF files to merge.')

          // If the user selected individual pages, build a filesWithPages structure
          const hasSelections = Object.values(selectedPages).some((arr) => arr && arr.length > 0)
          if (hasSelections && includeOnlySelectedPages) {
            const engine = await import('../../tools/pdf/engine/pdfEngine')
            const filesWithPages = pdfInfos.map((info) => ({
              file: info.file,
              // convert 1-based UI page numbers to 0-based indexes expected by engine
              pageIndexes: (selectedPages[info.id] ?? []).map((p) => Math.max(0, p - 1)),
              pageRotations: includeRotations && pageRotations[info.id]
                ? Object.fromEntries(Object.entries(pageRotations[info.id]).map(([k, v]) => [Number(k), v]))
                : undefined,
            }))
            result = await engine.mergeSelectedPages(filesWithPages, setProgress)
          } else if (includeRotations) {
            // include full files but apply rotations if requested
            const engine = await import('../../tools/pdf/engine/pdfEngine')
            const filesWithPages = pdfInfos.map((info) => ({
              file: info.file,
              pageIndexes: Array.from({ length: info.pageCount }, (_, i) => i),
              pageRotations: includeRotations && pageRotations[info.id]
                ? Object.fromEntries(Object.entries(pageRotations[info.id]).map(([k, v]) => [Number(k), v]))
                : undefined,
            }))
            result = await engine.mergeSelectedPages(filesWithPages, setProgress)
          } else {
            const engine = await import('../../tools/pdf/engine/pdfEngine')
            result = await engine.mergePdfFiles(pdfInfos.map((info) => info.file), setProgress)
          }
        } else if (tool.id === 'split') {
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          if (splitMode === 'range') {
            const from = Math.max(1, Math.min(splitRangeFrom, primaryPdf.pageCount))
            const to = Math.max(from, Math.min(splitRangeTo, primaryPdf.pageCount))
            result = await engine.splitPdfFileWithOptions(primaryPdf.file, { mode: 'ranges', ranges: [[from - 1, to - 1]] }, setProgress)
          } else if (splitMode === 'size') {
            result = await engine.splitPdfFileBySize(primaryPdf.file, splitMaxSizeMB * 1024 * 1024, setProgress)
          } else if (splitChunkSize > 1) {
            result = await engine.splitPdfFileWithOptions(primaryPdf.file, { mode: 'chunks', chunkSize: splitChunkSize }, setProgress)
          } else {
            result = await engine.splitPdfFileWithOptions(primaryPdf.file, { mode: 'every' }, setProgress)
          }
        } else if (tool.id === 'compress') {
            const engine = await import('../../tools/pdf/engine/pdfEngine')
            result = await engine.compressPdfFileEnhanced(primaryPdf.file, compressPreset, customCompression, setProgress)
        } else if (tool.id === 'rotate') {
          const pages = parsePageSelection(pageInput, primaryPdf.pageCount)
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          result = await engine.rotatePdfFile(primaryPdf.file, pages, rotation, setProgress)
        } else if (tool.id === 'delete') {
          const pages = parsePageSelection(pageInput, primaryPdf.pageCount)
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          result = await engine.deletePdfPages(primaryPdf.file, pages, setProgress)
        } else if (tool.id === 'extract') {
          const pages = parsePageSelection(pageInput, primaryPdf.pageCount)
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          result = await engine.extractPdfPages(primaryPdf.file, pages, setProgress)
        } else if (tool.id === 'reorder') {
          const pages = parsePageOrder(pageInput, primaryPdf.pageCount)
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          result = await engine.reorderPdfPages(primaryPdf.file, pages, undefined, setProgress)
        } else if (tool.id === 'organize') {
          // Organize uses a page order input (e.g., 3,1,2) and supports rotations
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          // if the user manipulated the visual page order, prefer that
          const order = pageOrders[primaryPdf.id]
          let pages: number[] = []
          if (order && order.length > 0) {
            // convert to zero-based and support -1 (blank)
            pages = order.map((p) => (p === -1 ? -1 : Math.max(0, p - 1)))
          } else {
            pages = parsePageOrder(pageInput, primaryPdf.pageCount)
          }
          const rotations = includeRotations && pageRotations[primaryPdf.id]
            ? Object.fromEntries(Object.entries(pageRotations[primaryPdf.id]).map(([k, v]) => [Number(k), v]))
            : undefined
          result = await engine.organizePdfFile(primaryPdf.file, pages, rotations, setProgress)
        } else if (tool.id === 'wordToPdf') {
          // prefer server-side converter if configured
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          const w = window as unknown as { __SHREEDESK_DOC_CONVERTER_URL?: string }
          if (w.__SHREEDESK_DOC_CONVERTER_URL) {
            const conv = await import('../../tools/pdf/engine/documentConverter')
            result = await conv.convertDocxWithServer(w.__SHREEDESK_DOC_CONVERTER_URL, primaryPdf.file, setProgress)
          } else {
            result = await engine.convertWordToPdf(primaryPdf.file, setProgress)
          }
        } else if (tool.id === 'pdfToImage') {
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          result = await engine.pdfToImages(primaryPdf.file, pdfToImageFormat, pdfToImageQuality, setProgress)
        } else {
          const engine = await import('../../tools/pdf/engine/pdfEngine')
          result = await engine.pdfToImages(primaryPdf.file, pdfToImageFormat, pdfToImageQuality, setProgress)
        }
      }

      setOutput(result)
      setTimeTakenMs(startTime ? Date.now() - startTime : null)
      setProgress({ label: 'Task Completed Successfully', value: 100 })
      
      // Auto-download the file immediately after processing
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFileName || result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Google Drive sync
      const token = getGoogleToken()
      if (token) {
        const isZip = (outputFileName || result.fileName).endsWith('.zip')
        const category = isZip ? 'Word' : 'PDF'
        await uploadFileToDrive(category, outputFileName || result.fileName, result.blob)
      }

      setFeedback('')
    } catch (error) {
      let message = error instanceof Error ? error.message : 'An unexpected error occurred during processing.'
      // Make error messages more human-readable
      if (message.includes('corrupted') || message.includes('invalid')) {
        message = 'One or more files appear to be corrupted or invalid. Please re-upload the affected file and try again.'
      } else if (message.includes('at least two')) {
        message = 'Please upload at least two PDF files before merging.'
      } else if (message.includes('at least one')) {
        message = 'Please upload at least one file to continue.'
      } else if (message.includes('password') || message.includes('encrypted')) {
        message = 'This PDF is password-protected. Please unlock it before processing.'
      }
      setFeedback(`❌ ${message}`)
      setProgress(null)
    } finally {
      setProcessing(false)
    }
  }

  const requiresPageInput = ['rotate', 'delete', 'extract', 'reorder'].includes(tool.id)
  const isReady = pdfInfos.length > 0 || imageFiles.length > 0

  return (
    <>
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    <section className="pdf-workspace" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      
      {/* Top Header */}
      <div className="pdf-workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: '#ffffff', border: '1px solid #e2e8f0', marginBottom: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>{tool.icon} {tool.title}</h2>
        <span className="pdf-local-badge" style={{ background: '#fff7ed', color: '#ea580c', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>🔒 Local Process</span>
      </div>

      {!isReady ? (
        <PdfFileDropzone
          mode={tool.mode}
          multiple={tool.acceptsMultiple}
          disabled={processing}
          onFilesSelected={handleFilesSelected}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Wizard Steps */}
          <div className="wizard-steps hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '1rem', paddingBottom: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <div className={`wizard-step active`}>
              <span className="wizard-step-num">1</span>
              Upload
            </div>
            <div className={`wizard-step active`}>
              <span className="wizard-step-num">2</span>
              Preview & Edit
            </div>
            <div className={`wizard-step ${output ? 'active' : ''}`}>
              <span className="wizard-step-num">3</span>
              Process
            </div>
            <div className={`wizard-step ${output ? 'active' : ''}`}>
              <span className="wizard-step-num">4</span>
              Export
            </div>
          </div>

          <div className="pdf-workspace-grid">
            
            {/* Left: Preview */}
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E4E0D9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1F1B16' }}>Document Preview</h3>
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.85rem', border: '1px solid #E4E0D9' }}>
                  <input type="file" multiple={tool.acceptsMultiple} accept={tool.mode === 'image' ? 'image/png,image/jpeg,image/webp' : 'application/pdf'} style={{ display: 'none' }} onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(Array.from(e.target.files))
                    }
                  }} />
                  <span>+ Add {tool.mode === 'image' ? 'Images' : 'PDF'}</span>
                </label>
              </div>
              
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

              <PdfPagePreview
                files={pdfInfos}
                selectedPages={selectedPages}
                pageOrders={pageOrders}
                pageRotations={pageRotations}
                onTogglePage={(fileId, pageNumber) => {
                  setSelectedPages((prev) => {
                    const existing = new Set(prev[fileId] ?? [])
                    if (existing.has(pageNumber)) {
                      existing.delete(pageNumber)
                    } else {
                      existing.add(pageNumber)
                    }
                    return { ...prev, [fileId]: Array.from(existing).sort((a, b) => a - b) }
                  })
                }}
                onRotatePage={(fileId, pageNumber) => {
                  setPageRotations((prev) => {
                    const fileRotations = { ...(prev[fileId] ?? {}) }
                    const current = fileRotations[pageNumber] ?? 0
                    const next = (current + 90) % 360
                    if (next === 0) {
                      delete fileRotations[pageNumber]
                    } else {
                      fileRotations[pageNumber] = next
                    }
                    return { ...prev, [fileId]: fileRotations }
                  })
                }}
                onMoveFile={(fileId, direction) => {
                  setPdfInfos((prev) => {
                    const index = prev.findIndex((f) => f.id === fileId)
                    if (index === -1) return prev
                    const newArr = prev.slice()
                    const swapWith = direction === 'up' ? index - 1 : index + 1
                    if (swapWith < 0 || swapWith >= newArr.length) return prev
                    const tmp = newArr[swapWith]
                    newArr[swapWith] = newArr[index]
                    newArr[index] = tmp
                    return newArr
                  })
                }}
                onReorderFiles={(draggedId, targetId) => {
                  setPdfInfos((prev) => {
                    const from = prev.findIndex((f) => f.id === draggedId)
                    const to = prev.findIndex((f) => f.id === targetId)
                    if (from === -1 || to === -1) return prev
                    const copy = prev.slice()
                    const [item] = copy.splice(from, 1)
                    copy.splice(to, 0, item)
                    return copy
                  })
                }}
                onRemoveFile={(fileId) => {
                  setPdfInfos((prev) => prev.filter((f) => f.id !== fileId))
                  setSelectedPages((prev) => {
                    const copy = { ...prev }
                    delete copy[fileId]
                    return copy
                  })
                }}
                onReorderPages={(fileId, fromIndex, toIndex) => {
                  setPageOrders((prev) => {
                    const copy = { ...prev }
                    const order = copy[fileId] ? copy[fileId].slice() : []
                    if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length || toIndex >= order.length) return prev
                    const [item] = order.splice(fromIndex, 1)
                    order.splice(toIndex, 0, item)
                    copy[fileId] = order
                    return copy
                  })
                }}
                onDuplicatePage={(fileId, pageIndex) => {
                  setPageOrders((prev) => {
                    const copy = { ...prev }
                    const order = copy[fileId] ? copy[fileId].slice() : []
                    if (pageIndex < 0 || pageIndex >= order.length) return prev
                    const item = order[pageIndex]
                    order.splice(pageIndex + 1, 0, item)
                    copy[fileId] = order
                    return copy
                  })
                }}
                onInsertBlankPage={(fileId, afterIndex) => {
                  setPageOrders((prev) => {
                    const copy = { ...prev }
                    const order = copy[fileId] ? copy[fileId].slice() : []
                    const insertAt = Math.min(order.length, Math.max(0, afterIndex + 1))
                    order.splice(insertAt, 0, -1)
                    copy[fileId] = order
                    return copy
                  })
                }}
                onDeletePage={(fileId, pageIndex) => {
                  setPageOrders((prev) => {
                    const copy = { ...prev }
                    const order = copy[fileId] ? copy[fileId].slice() : []
                    if (pageIndex < 0 || pageIndex >= order.length) return prev
                    order.splice(pageIndex, 1)
                    copy[fileId] = order
                    return copy
                  })
                }}
              />
            </div>

            {/* Right: Actions & Settings */}
            <div className="pdf-workspace-options" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E4E0D9' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600, color: '#1F1B16' }}>Options</h3>
              
              {tool.id === 'merge' && pdfInfos.length > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#c2410c', fontSize: '0.95rem', fontWeight: 600 }}>Merge Summary</h4>
                    <span style={{ color: '#ea580c', fontSize: '0.85rem' }}>{pdfInfos.length} files · {pdfInfos.reduce((s, f) => s + f.pageCount, 0)} pages</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#c2410c', fontWeight: 600, fontSize: '0.95rem' }}>{formatFileSize(pdfInfos.reduce((s, f) => s + f.size, 0))}</span>
                  </div>
                </div>
              )}

              {tool.id === 'pdfToImage' && primaryPdf && (
                <div className="pdf-tool-settings" style={{ display: 'grid', gap: '1rem' }}>
                  <label className="select-label" style={{ width: '100%' }}>
                    Output format
                    <select value={pdfToImageFormat} onChange={(e) => setPdfToImageFormat(e.target.value as 'png' | 'jpeg' | 'webp')}>
                      <option value="png">PNG</option>
                      <option value="jpeg">JPG</option>
                      <option value="webp">WEBP</option>
                    </select>
                  </label>
                  <label className="select-label" style={{ width: '100%' }}>
                    Quality: {Math.round(pdfToImageQuality * 100)}%
                    <input type="range" min={0.1} max={1} step={0.05} value={pdfToImageQuality} onChange={(e) => setPdfToImageQuality(Number(e.target.value))} style={{ width: '100%' }} />
                  </label>
                </div>
              )}

              {tool.id === 'merge' && (
                <div className="merge-settings" style={{ display: 'grid', gap: '1rem' }}>
                  <label className="select-label" style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <input type="checkbox" checked={includeOnlySelectedPages} onChange={(e) => setIncludeOnlySelectedPages(e.target.checked)} /> 
                    <span>Include only selected pages</span>
                  </label>
                  <label className="select-label" style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <input type="checkbox" checked={includeRotations} onChange={(e) => setIncludeRotations(e.target.checked)} /> 
                    <span>Apply per-page rotations</span>
                  </label>
                  <label className="select-label" style={{ width: '100%' }}>
                    Output filename
                    <input className="pdf-text-input" value={outputFileName} onChange={(e) => setOutputFileName(e.target.value)} />
                  </label>
                </div>
              )}

              {tool.id === 'compress' && primaryPdf && (
                <div className="compress-settings" style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {([
                      { key: 'high', label: 'Low Compression (High Quality)' },
                      { key: 'recommended', label: 'Medium Compression (Recommended)' },
                      { key: 'maximum', label: 'High Compression (Lowest Quality)' },
                    ] as const).map((opt) => (
                      <label
                        key={opt.key}
                        className="select-label"
                        style={{
                          width: '100%',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: '0.5rem',
                          opacity: compressPreset === 'custom' ? 0.45 : 1,
                          cursor: compressPreset === 'custom' ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="compress-preset"
                          checked={compressPreset === opt.key}
                          disabled={compressPreset === 'custom'}
                          onChange={() => setCompressPreset(opt.key)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                    <label
                      className="select-label"
                      style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="compress-preset"
                        checked={compressPreset === 'custom'}
                        onChange={() => setCompressPreset('custom')}
                      />
                      <span>Custom</span>
                    </label>
                  </div>

                  {compressPreset === 'custom' && (
                    <label className="select-label" style={{ width: '100%' }}>
                      Custom size ({customCompression}% of original)
                      <input type="range" min={10} max={150} value={customCompression} onChange={(e) => setCustomCompression(Number(e.target.value))} style={{ width: '100%' }} />
                      <span style={{ fontSize: '0.8rem', color: '#6B6459' }}>
                        Below 100% compresses (smaller file, slight quality reduction). Above 100% keeps original quality (no further size increase is produced).
                      </span>
                    </label>
                  )}

                  <div style={{ background: '#F0EDE8', border: '1px solid #E4E0D9', borderRadius: '8px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#6B6459' }}>Original Size</span>
                      <strong style={{ color: '#1F1B16' }}>{formatFileSize(primaryPdf.size)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #E4E0D9' }}>
                      <span style={{ color: '#4A4438' }}>Estimated Output</span>
                      <strong style={{ color: '#059669' }}>
                        {formatFileSize(Math.round(primaryPdf.size * estimatedCompressionRatio))}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                      {estimatedCompressionRatio <= 1
                        ? `~${Math.round((1 - estimatedCompressionRatio) * 100)}% reduction`
                        : `~${Math.round((estimatedCompressionRatio - 1) * 100)}% larger (no further reduction applied)`}
                    </div>
                  </div>
                </div>
              )}

              {tool.id === 'split' && primaryPdf && (
                <div className="split-settings" style={{ display: 'grid', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {([
                      { key: 'range', label: 'Range' },
                      { key: 'pages', label: 'Pages' },
                      { key: 'size', label: 'Size' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSplitMode(opt.key)}
                        style={{
                          flex: '1 1 0',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: `1px solid ${splitMode === opt.key ? '#f97316' : '#E4E0D9'}`,
                          background: splitMode === opt.key ? '#fff7ed' : '#ffffff',
                          color: splitMode === opt.key ? '#ea580c' : '#4A4438',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {splitMode === 'range' && (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <p style={{ margin: 0, color: '#6B6459', fontSize: '0.9rem' }}>
                        Extract a continuous range of pages into a single PDF file.
                      </p>
                      <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label className="select-label" style={{ width: '100%' }}>
                          From page
                          <input
                            type="number"
                            className="pdf-text-input"
                            min={1}
                            max={primaryPdf.pageCount}
                            value={splitRangeFrom}
                            onChange={(e) => setSplitRangeFrom(Math.max(1, Math.min(primaryPdf.pageCount, Number(e.target.value))))}
                          />
                        </label>
                        <label className="select-label" style={{ width: '100%' }}>
                          To page
                          <input
                            type="number"
                            className="pdf-text-input"
                            min={1}
                            max={primaryPdf.pageCount}
                            value={splitRangeTo}
                            onChange={(e) => setSplitRangeTo(Math.max(1, Math.min(primaryPdf.pageCount, Number(e.target.value))))}
                          />
                        </label>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#6B6459' }}>
                        Document has {primaryPdf.pageCount} pages. 1 PDF will be created (pages {Math.min(splitRangeFrom, splitRangeTo)}–{Math.max(splitRangeFrom, splitRangeTo)}).
                      </span>
                    </div>
                  )}

                  {splitMode === 'pages' && (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <p style={{ margin: 0, color: '#6B6459', fontSize: '0.9rem' }}>
                        Split into separate PDF files, grouped by a fixed number of pages.
                      </p>
                      <label className="select-label" style={{ width: '100%' }}>
                        Pages per file
                        <input
                          type="number"
                          className="pdf-text-input"
                          min={1}
                          max={primaryPdf.pageCount}
                          value={splitChunkSize}
                          onChange={(e) => setSplitChunkSize(Math.max(1, Math.min(primaryPdf.pageCount, Number(e.target.value))))}
                        />
                      </label>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#1e3a8a' }}>
                        Selected pages will be converted into separate PDF files. {Math.ceil(primaryPdf.pageCount / Math.max(1, splitChunkSize))} PDF{Math.ceil(primaryPdf.pageCount / Math.max(1, splitChunkSize)) === 1 ? '' : 's'} will be created.
                      </div>
                    </div>
                  )}

                  {splitMode === 'size' && (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <p style={{ margin: 0, color: '#6B6459', fontSize: '0.9rem' }}>
                        Split into files no larger than the specified size.
                      </p>
                      <label className="select-label" style={{ width: '100%' }}>
                        Maximum size per file (MB)
                        <input
                          type="number"
                          className="pdf-text-input"
                          min={1}
                          step={0.5}
                          value={splitMaxSizeMB}
                          onChange={(e) => setSplitMaxSizeMB(Math.max(0.5, Number(e.target.value)))}
                        />
                      </label>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#1e3a8a' }}>
                        This PDF will be split into files no larger than {splitMaxSizeMB} MB each.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {requiresPageInput && primaryPdf && (
                <div className="pdf-option-panel" style={{ display: 'grid', gap: '1rem' }}>
                  <label className="select-label" style={{ width: '100%' }}>
                    Page selection
                    <input
                      className="pdf-text-input"
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      placeholder={getInitialRangeHint(tool.id)}
                    />
                  </label>
                  {tool.id === 'rotate' && (
                    <label className="select-label" style={{ width: '100%' }}>
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

              <div style={{ marginTop: '2rem' }}>
                <PdfProgressBar progress={progress} />
                {feedback && (
                  <p className={`status-banner ${feedback.includes('❌') ? 'error' : 'info'}`} role={feedback.includes('❌') ? 'alert' : undefined} style={{ marginBottom: '1rem' }}>{feedback}</p>
                )}

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {!output && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={processing}
                      onClick={runTool}
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', fontWeight: 600, fontSize: '1.1rem', background: '#f97316', color: '#ffffff', border: 'none', cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3)' }}
                    >
                      {processing ? (
                        <>
                          <svg style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          {tool.title} &amp; Download
                        </>
                      )}
                    </button>
                  )}
                  
                  {output && (
                    <ResultSummaryCard
                      inputSize={primaryPdf?.size ?? imageSize}
                      outputSize={output.blob.size}
                      filesProcessed={pdfInfos.length || imageFiles.length}
                      timeTakenMs={timeTakenMs ?? undefined}
                      outputBlob={output.blob}
                      outputFileName={outputFileName || output.fileName}
                      onStartNew={() => {
                        setOutput(null)
                        setPdfInfos([])
                        setImageFiles([])
                        setProgress(null)
                        setFeedback('Upload files to begin local processing.')
                      }}
                      onReuseFiles={() => {
                        setOutput(null)
                        setProgress(null)
                        setFeedback('Files retained. Adjust settings and run again.')
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  )
}

export default PdfToolWorkspace
