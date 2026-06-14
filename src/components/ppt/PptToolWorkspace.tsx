import { useCallback, useState } from 'react'
import JSZip from 'jszip'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'
import type { PdfProgress } from '../../tools/pdf/engine/types'
import { analyzePresentation, type PptAnalysis } from '../../tools/ppt/presentationAnalyzer'
import { extractImages, downloadExtractedImages, type PptImage } from '../../tools/ppt/slideExporter'

type TabType = 'to-pdf' | 'analyze' | 'export-images'

const PptToolWorkspace = () => {
  const [activeTab, setActiveTab] = useState<TabType>('to-pdf')
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState('Upload PPTX files to begin')
  const [progress, setProgress] = useState<PdfProgress | null>(null)

  // Analyze state
  const [analysisResult, setAnalysisResult] = useState<PptAnalysis | null>(null)
  
  // Export Images state
  const [extractedImages, setExtractedImages] = useState<PptImage[]>([])

  const totalSize = files.reduce((s, f) => s + f.size, 0)

  const onFiles = useCallback((fList: FileList | null) => {
    if (!fList) return
    setFiles(Array.from(fList))
    setFeedback(`${fList.length} file(s) selected`)
    setAnalysisResult(null)
    setExtractedImages([])
  }, [])

  const runPptToPdf = useCallback(async () => {
    if (files.length === 0) return setFeedback('Please add files')
    setProcessing(true)
    try {
      const outputs: Array<{ fileName: string; blob: Blob }> = []
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        setProgress({ label: `Converting ${file.name}`, value: Math.round((i / files.length) * 80) })
        if ((window as any).__SHREEDESK_PPT_CONVERTER_URL) {
          const url = (window as any).__SHREEDESK_PPT_CONVERTER_URL.replace(/\/$/, '') + '/convert'
          const form = new FormData()
          form.append('file', file)
          const resp = await fetch(url, { method: 'POST', body: form })
          if (!resp.ok) throw new Error(`Converter returned ${resp.status}`)
          const blob = await resp.blob()
          outputs.push({ fileName: file.name.replace(/\.[^/.]+$/, '') + '.pdf', blob })
        } else {
          throw new Error('PPT→PDF conversion requires a server-side converter. Configure __SHREEDESK_PPT_CONVERTER_URL to enable.')
        }
      }

      if (outputs.length === 1) {
        const o = outputs[0]
        const url = URL.createObjectURL(o.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = o.fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setFeedback(`Downloaded ${o.fileName}`)
      } else {
        const zip = new JSZip()
        outputs.forEach((out) => zip.file(out.fileName, out.blob))
        setProgress({ label: 'Creating ZIP', value: 90 })
        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ShreeDesk_PPT_To_PDF.zip'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setFeedback('Downloaded ZIP with converted PDFs')
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setProcessing(false)
      setProgress({ label: 'Done', value: 100 })
    }
  }, [files])

  const runAnalyze = useCallback(async () => {
    if (files.length === 0) return setFeedback('Please add a PPTX file')
    setProcessing(true)
    setProgress({ label: 'Analyzing Presentation', value: 50 })
    try {
      // Analyze the first file only for simplicity in this demo
      const result = await analyzePresentation(files[0])
      setAnalysisResult(result)
      setFeedback(`Analyzed ${files[0].name}`)
    } catch (err) {
      setFeedback('Failed to analyze PPTX. Ensure it is a valid .pptx file.')
    } finally {
      setProcessing(false)
      setProgress(null)
    }
  }, [files])

  const runExtractImages = useCallback(async () => {
    if (files.length === 0) return setFeedback('Please add a PPTX file')
    setProcessing(true)
    setProgress({ label: 'Extracting Images', value: 50 })
    try {
      let allImages: PptImage[] = []
      for (const file of files) {
         const images = await extractImages(file)
         allImages = [...allImages, ...images]
      }
      setExtractedImages(allImages)
      setFeedback(`Extracted ${allImages.length} image(s).`)
    } catch (err) {
      setFeedback('Failed to extract images.')
    } finally {
      setProcessing(false)
      setProgress(null)
    }
  }, [files])

  const handleDownloadImages = () => {
    downloadExtractedImages(extractedImages)
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <h2>📊 PowerPoint Suite</h2>
        <p>Convert PPTX to PDF, extract text summaries, and download presentation images directly in your browser.</p>
      </div>

      <div className="tool-tabs" style={{ marginBottom: '2rem' }}>
        {(['to-pdf', 'analyze', 'export-images'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setFeedback('Ready'); }}
          >
            {tab === 'to-pdf' ? 'Convert to PDF' : tab === 'analyze' ? 'Presentation Summary' : 'Extract Images'}
          </button>
        ))}
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          <input type="file" multiple accept=".ppt,.pptx,.pdf" onChange={(e) => onFiles(e.target.files)} />
          Select files
        </label>
        <div className="summary-card">
          <div className="summary-label">Files</div>
          <strong>{files.length}</strong>
          <div className="summary-label">Total size</div>
          <strong>{formatFileSize(totalSize)}</strong>
        </div>
      </div>

      {activeTab === 'to-pdf' && (
        <div className="spaced-action" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="tool-badge" style={{ marginBottom: '1rem' }}>Needs Server for PPTX parsing</span>
          <button className="btn-primary" onClick={runPptToPdf} disabled={processing || files.length === 0}>
            {processing ? 'Converting...' : 'Convert to PDF'}
          </button>
        </div>
      )}

      {activeTab === 'analyze' && (
        <div className="spaced-action" style={{ flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
          <button className="btn-primary" onClick={runAnalyze} disabled={processing || files.length === 0}>
            {processing ? 'Analyzing...' : 'Generate Summary'}
          </button>
          
          {analysisResult && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-md)', width: '100%', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>Analysis Report</h3>
              <p><strong>Total Slides:</strong> {analysisResult.slideCount}</p>
              <p style={{ marginTop: '1rem' }}><strong>Quick Summary:</strong></p>
              <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {analysisResult.summary}
              </div>
              
              <p style={{ marginTop: '1.5rem' }}><strong>Text Content by Slide:</strong></p>
              <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '0.5rem', paddingRight: '1rem' }}>
                {analysisResult.textBySlide.map((text, i) => (
                  <div key={i} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: '#94a3b8' }}>Slide {i + 1}</strong>
                    {text || <em>No text found on this slide.</em>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'export-images' && (
        <div className="spaced-action" style={{ flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
          <button className="btn-primary" onClick={runExtractImages} disabled={processing || files.length === 0}>
            {processing ? 'Extracting...' : 'Extract Media & Images'}
          </button>
          
          {extractedImages.length > 0 && (
            <div style={{ marginTop: '2rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Extracted Images ({extractedImages.length})</h3>
                <button className="btn-secondary" onClick={handleDownloadImages}>Download All as ZIP</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {extractedImages.map((img, i) => (
                  <div key={i} style={{ padding: '0.5rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100px', objectFit: 'contain', marginBottom: '0.5rem', borderRadius: '0.25rem' }} />
                    <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.name}>{img.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="tool-feedback">{feedback}</p>
      {progress && activeTab === 'to-pdf' && <div className="download-panel"><div>{progress.label}</div><div>{progress.value}%</div></div>}
    </section>
  )
}

export default PptToolWorkspace
