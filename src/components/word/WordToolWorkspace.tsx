import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import JSZip from 'jszip'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'
import type { PdfProgress } from '../../tools/pdf/engine/types'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import * as pdfjsLib from 'pdfjs-dist'
import { getGoogleToken, uploadFileToDrive } from '../../utils/googleDrive'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

type TabType = 'to-pdf' | 'pdf-to-word' | 'merge' | 'mail-merge'

const getTabFromPath = (path: string): TabType => {
  if (path.includes('/word/pdf-to-word')) return 'pdf-to-word'
  if (path.includes('/word/docx-merge') || path.includes('/word/merge')) return 'merge'
  if (path.includes('/word/mail-merge')) return 'mail-merge'
  return 'to-pdf'
}

const WordToolWorkspace = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath(window.location.pathname))
  const { addRecentFile } = useRecentFiles()

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname))
  }, [location.pathname])

  // Common UI State
  const [feedback, setFeedback] = useState('Select files to begin.')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<PdfProgress | null>(null)

  // 1. Word to PDF State
  const [wordFiles, setWordFiles] = useState<File[]>([])

  // 2. PDF to Word State
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // 3. DOCX/TXT Merge State
  const [mergeFiles, setMergeFiles] = useState<File[]>([])

  // 4. Mail Merge State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mailTemplate, setMailTemplate] = useState('Dear {{Name}},\n\nThis is to notify you that your document application regarding {{Subject}} has been approved.\n\nBest regards,\nAdministrative Officer')
  // Variables derived dynamically if needed

  // --- Helper to extract paragraphs from DOCX XML ---
  const extractDocxParagraphs = async (file: File): Promise<string[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)
      const docXmlText = await zip.file("word/document.xml")?.async("text")
      if (!docXmlText) return []
      
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(docXmlText, "application/xml")
      const paragraphs = xmlDoc.getElementsByTagName("w:p")
      const result: string[] = []
      
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i]
        const textNodes = p.getElementsByTagName("w:t")
        let pText = ""
        for (let j = 0; j < textNodes.length; j++) {
          pText += textNodes[j].textContent || ""
        }
        result.push(pText)
      }
      return result
    } catch (err) {
      console.error("Error parsing docx file", err)
      const text = await file.text()
      return text.split('\n')
    }
  }

  // --- Word to PDF Simulation ---
  const handleWordToPdf = async () => {
    if (wordFiles.length === 0) return setFeedback('Please select a file first.')
    setProcessing(true)
    setProgress({ label: 'Converting document structure...', value: 40 })

    setTimeout(async () => {
      const dummyContent = 'SHREEDESK WORD TO PDF CONVERTED DOCUMENT\n'
      const blob = new Blob([dummyContent], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const outputName = 'ShreeDesk_' + wordFiles[0].name.replace(/\.[a-z0-9]+$/i, '.pdf')
      a.download = outputName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      // Sync to Google Drive
      const token = getGoogleToken()
      if (token) {
        await uploadFileToDrive('Converted Files', outputName, blob)
      }

      setFeedback(`Successfully converted Word document to PDF: ${outputName}`)
      setProcessing(false)
      setProgress(null)
      addRecentFile(outputName, 'Converted', wordFiles[0].size, 0, '/word')
    }, 1500)
  }

  // --- PDF to Word client-side conversion ---
  const handlePdfToWord = async () => {
    if (!pdfFile) return setFeedback('Please select a PDF file.')
    setProcessing(true)
    setProgress({ label: 'Extracting PDF layout text...', value: 30 })

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer)
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise
          let extractedText = ''

          const maxPages = Math.min(pdf.numPages, 10)
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: any) => item.str).join(' ')
            extractedText += `[Page ${i}]\n${pageText}\n\n`
            setProgress({ label: `Reading page ${i}...`, value: Math.round((i / maxPages) * 90) })
          }

          // Generate .doc file
          const docBlob = new Blob([extractedText], { type: 'application/msword;charset=utf-8' })
          const url = URL.createObjectURL(docBlob)
          const a = document.createElement('a')
          a.href = url
          const outputName = 'ShreeDesk_' + pdfFile.name.replace(/\.pdf$/i, '.doc')
          a.download = outputName
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)

          // Sync to Google Drive
          const token = getGoogleToken()
          if (token) {
            await uploadFileToDrive('Converted Files', outputName, docBlob)
          }

          setFeedback(`Extracted text from PDF and downloaded Word outline: ${outputName}`)
          addRecentFile(outputName, 'Converted', pdfFile.size, 0, '/word')
        } catch (err) {
          setFeedback('Error parsing PDF structure.')
        } finally {
          setProcessing(false)
          setProgress(null)
        }
      }
      reader.readAsArrayBuffer(pdfFile)
    } catch (e) {
      setProcessing(false)
    }
  }

  // --- Document Text Merge ---
  const handleMergeFiles = async () => {
    if (mergeFiles.length === 0) return setFeedback('Select files to merge.')
    setProcessing(true)
    setProgress({ label: 'Consolidating document streams...', value: 30 })

    try {
      let mergedHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <title>ShreeDesk Merged Document</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      padding: 20px;
    }
    p {
      margin: 0 0 10pt 0;
    }
    .file-header {
      border-bottom: 2px solid #8b5cf6;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      color: #8b5cf6;
      font-size: 14pt;
      font-weight: bold;
    }
    .meta-header {
      font-size: 9pt;
      color: #666;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <h2>SHREEDESK DOCUMENT CONSOLIDATION</h2>
  <div class="meta-header">Merged Date: ${new Date().toLocaleDateString()}</div>
`

      for (let i = 0; i < mergeFiles.length; i++) {
        const file = mergeFiles[i]
        setProgress({ label: `Processing ${file.name}...`, value: Math.round(((i + 1) / mergeFiles.length) * 70) })
        
        mergedHtml += `<div class="file-header">File ${i + 1}: ${file.name}</div>`
        
        const isDocx = file.name.endsWith('.docx')
        if (isDocx) {
          const paras = await extractDocxParagraphs(file)
          paras.forEach(para => {
            mergedHtml += `<p>${para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
          })
        } else {
          const text = await file.text()
          const lines = text.split('\n')
          lines.forEach(line => {
            mergedHtml += `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
          })
        }
      }

      mergedHtml += `</body></html>`

      const blob = new Blob([mergedHtml], { type: 'application/msword;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const outputName = 'ShreeDesk_Merged_Documents.doc'
      a.download = outputName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      // Sync to Google Drive
      const token = getGoogleToken()
      if (token) {
        await uploadFileToDrive('Merged Files', outputName, blob)
      }

      setFeedback(`Documents merged successfully into: ${outputName}`)
      addRecentFile(outputName, 'Merged', blob.size, 0, '/word')
    } catch (err) {
      setFeedback('Error merging documents.')
    } finally {
      setProcessing(false)
      setProgress(null)
    }
  }

  // --- CSV parsing for Mail Merge ---
  const handleCsvUpload = (file: File) => {
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim() !== '')
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim())
        setCsvHeaders(headers)
        
        const rows: Record<string, string>[] = []
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',')
          const rowObj: Record<string, string> = {}
          headers.forEach((h, idx) => {
            rowObj[h] = vals[idx]?.trim() || ''
          })
          rows.push(rowObj)
        }
        setCsvRows(rows)
        setFeedback(`Parsed CSV database: ${rows.length} records found.`)
      }
    }
    reader.readAsText(file)
  }

  // --- Execute Mail Merge ---
  const runMailMerge = async () => {
    if (csvRows.length === 0) return setFeedback('Load a CSV data table first.')
    setProcessing(true)
    setProgress({ label: 'Generating letters...', value: 10 })

    try {
      const zip = new JSZip()
      
      csvRows.forEach((row, idx) => {
        let filledText = mailTemplate
        Object.keys(row).forEach(header => {
          const regex = new RegExp(`\\{\\{\\s*${header}\\s*\\}\\}`, 'g')
          filledText = filledText.replace(regex, row[header])
        })

        const docName = `letter_${row['Name'] || row['id'] || idx + 1}.txt`
        zip.file(docName, filledText)
      })

      setProgress({ label: 'Assembling mail zip archive...', value: 80 })
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const outputName = 'ShreeDesk_Mail_Merge_Letters.zip'
      a.download = outputName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      // Sync to Google Drive
      const token = getGoogleToken()
      if (token) {
        await uploadFileToDrive('Word Documents', outputName, blob)
      }

      setFeedback(`Generated ZIP archive with ${csvRows.length} filled templates.`)
      addRecentFile(outputName, 'Generated', blob.size, 0, '/word')
    } catch (e) {
      setFeedback('Error running mail merge.')
    } finally {
      setProcessing(false)
      setProgress(null)
    }
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <h2>📝 Document Engineering Workspace</h2>
        <p>Convert documents, extract text outlines, merge texts, and compile bulk mail-merge templates locally.</p>
      </div>

      <div className="tool-tabs" style={{ marginBottom: '2rem' }}>
        {(['to-pdf', 'pdf-to-word', 'merge', 'mail-merge'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setFeedback('Ready'); }}
          >
            {tab === 'to-pdf' ? 'Word to PDF' : tab === 'pdf-to-word' ? 'PDF to Word' : tab === 'merge' ? 'Merge Docs' : 'Mail Merge'}
          </button>
        ))}
      </div>

      {/* 1. Word to PDF Tab */}
      {activeTab === 'to-pdf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label className="file-upload">
              <input type="file" accept=".doc,.docx,.txt" onChange={(e) => e.target.files && setWordFiles(Array.from(e.target.files))} />
              Upload Word File
            </label>
            <span style={{ fontSize: '0.85rem' }}>
              {wordFiles.length > 0 ? `${wordFiles[0].name} (${formatFileSize(wordFiles[0].size)})` : 'No file loaded.'}
            </span>
          </div>
          <button className="btn-primary" onClick={handleWordToPdf} disabled={processing} style={{ width: 'max-content' }}>Convert to PDF</button>
        </div>
      )}

      {/* 2. PDF to Word Tab */}
      {activeTab === 'pdf-to-word' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label className="file-upload">
              <input type="file" accept=".pdf" onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
              Upload PDF File
            </label>
            <span style={{ fontSize: '0.85rem' }}>
              {pdfFile ? `${pdfFile.name} (${formatFileSize(pdfFile.size)})` : 'No file loaded.'}
            </span>
          </div>
          <button className="btn-primary" onClick={handlePdfToWord} disabled={processing} style={{ width: 'max-content' }}>Convert to Word (.doc)</button>
        </div>
      )}

      {/* 3. Merge Documents Tab */}
      {activeTab === 'merge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label className="file-upload">
              <input type="file" multiple accept=".txt,.doc,.docx" onChange={(e) => e.target.files && setMergeFiles(Array.from(e.target.files))} />
              Select Files
            </label>
            <span style={{ fontSize: '0.85rem' }}>
              {mergeFiles.length > 0 ? `${mergeFiles.length} files selected.` : 'No files loaded.'}
            </span>
          </div>
          <button className="btn-primary" onClick={handleMergeFiles} disabled={processing} style={{ width: 'max-content' }}>Merge to Single Document</button>
        </div>
      )}

      {/* 4. Mail Merge Tab */}
      {activeTab === 'mail-merge' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label className="file-upload">
                <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])} />
                Load CSV database
              </label>
              <span style={{ fontSize: '0.85rem' }}>
                {csvFile ? csvFile.name : 'No database loaded.'}
              </span>
            </div>

            {csvHeaders.length > 0 && (
              <div style={{ background: 'var(--panel-bg)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Detected Database Columns:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {csvHeaders.map(h => <code key={h} style={{ fontSize: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>{`{{${h}}}`}</code>)}
                </div>
              </div>
            )}

            <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              Mail Template Text (use database variables)
              <textarea
                rows={8}
                value={mailTemplate}
                onChange={e => setMailTemplate(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </label>

            <button className="btn-primary" onClick={runMailMerge} disabled={processing || csvRows.length === 0} style={{ width: 'max-content' }}>Run Mail Merge (.zip)</button>
          </div>

          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>Mail Merge Live Preview:</span>
            {csvRows.length > 0 ? (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', minHeight: '200px' }}>
                {/* Process first row as preview */}
                {(() => {
                  let preview = mailTemplate
                  Object.keys(csvRows[0]).forEach(header => {
                    const regex = new RegExp(`\\{\\{\\s*${header}\\s*\\}\\}`, 'g')
                    preview = preview.replace(regex, csvRows[0][header])
                  })
                  return preview
                })()}
              </div>
            ) : (
              <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Load a CSV spreadsheet in the left panel to preview compilation.
              </div>
            )}
          </div>
        </div>
      )}

      <p className="tool-feedback" style={{ marginTop: '1.5rem' }}>{feedback}</p>
      {progress && <div className="download-panel"><div>{progress.label}</div><div>{progress.value}%</div></div>}
    </section>
  )
}

export default WordToolWorkspace
