import { useState, useRef, useEffect } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiMessageSquare, FiFileText, FiBookOpen, FiSend, FiUpload, FiX } from 'react-icons/fi'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'
import { useRecentFiles } from '../../hooks/useRecentFiles'
// PDF.js imports for client-side PDF parsing
import * as pdfjsLib from 'pdfjs-dist'
import { uploadFileToDrive } from '../../utils/googleDrive'
import * as XLSX from 'xlsx'

// Set up worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

interface Message {
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
}

const AiWorkspace = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<'chat' | 'reports' | 'content'>('chat')
  const { addRecentFile } = useRecentFiles()

  // API Key Status
  const [hasApiKey, setHasApiKey] = useState(false)
  
  useEffect(() => {
    const gemini = localStorage.getItem('shreedesk-gemini-key')
    const openai = localStorage.getItem('shreedesk-openai-key')
    setHasApiKey(!!(gemini || openai))
  }, [])

  // --- Document Assistant State ---
  const [chatFile, setChatFile] = useState<File | null>(null)
  const [fileTextContent, setFileTextContent] = useState('')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hello! Upload any document (PDF, Excel, CSV, or Text) and I can help you summarize it, extract statistics, or answer questions about its content.', timestamp: new Date() }
  ])
  const [chatLoading, setChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Report Generator State ---
  const [reportType, setReportType] = useState<'office-note' | 'minutes' | 'statistical' | 'government'>('office-note')
  const [reportSubject, setReportSubject] = useState('')
  const [reportTopic, setReportTopic] = useState('')
  const [reportResult, setReportResult] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  // --- Content Generator State ---
  const [contentType, setContentType] = useState<'press-release' | 'article' | 'social-post' | 'caption'>('press-release')
  const [contentKeywords, setContentKeywords] = useState('')
  const contentLength = 'medium'
  const [contentResult, setContentResult] = useState('')
  const [contentLoading, setContentLoading] = useState(false)

  // --- Parse Dropped or Uploaded File ---
  const handleFileUpload = async (file: File) => {
    setChatFile(file)
    setIsParsingFile(true)
    setFileTextContent('')
    
    addRecentFile(file.name, 'Uploaded', file.size, 0, '/ai')

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension === 'pdf') {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const typedarray = new Uint8Array(e.target?.result as ArrayBuffer)
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise
            let extractedText = ''
            
            // Extract text page by page (cap at 15 pages for local memory safety)
            const maxPages = Math.min(pdf.numPages, 15)
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              const pageText = textContent.items.map((item: any) => item.str).join(' ')
              extractedText += `[Page ${i}]\n${pageText}\n\n`
            }
            
            setFileTextContent(extractedText)
            setChatMessages(prev => [
              ...prev,
              { sender: 'ai', text: `Successfully parsed "${file.name}" (${pdf.numPages} pages). Extracted ${formatFileSize(extractedText.length)} of text. Ask me anything about this file!`, timestamp: new Date() }
            ])
          } catch (err) {
            setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error extracting text from PDF file. Ensure it is not image-only.', timestamp: new Date() }])
          } finally {
            setIsParsingFile(false)
          }
        }
        reader.readAsArrayBuffer(file)
      } else if (['xlsx', 'xls'].includes(extension || '')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            let extractedText = ''
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName]
              const csv = XLSX.utils.sheet_to_csv(worksheet)
              extractedText += `[Sheet: ${sheetName}]\n${csv}\n\n`
            })
            setFileTextContent(extractedText)
            setChatMessages(prev => [
              ...prev,
              { sender: 'ai', text: `Successfully parsed Excel "${file.name}". Extracted ${workbook.SheetNames.length} sheet(s) of tabular data. Ask me anything about this file!`, timestamp: new Date() }
            ])
          } catch (err) {
            setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error extracting data from spreadsheet file.', timestamp: new Date() }])
          } finally {
            setIsParsingFile(false)
          }
        }
        reader.readAsArrayBuffer(file)
      } else if (['csv', 'txt', 'json'].includes(extension || '')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          setFileTextContent(text)
          setChatMessages(prev => [
            ...prev,
            { sender: 'ai', text: `Loaded "${file.name}". Size: ${formatFileSize(file.size)}. Ask me anything about the data.`, timestamp: new Date() }
          ])
          setIsParsingFile(false)
        }
        reader.readAsText(file)
      } else {
        // Fallback for Word files (metadata extraction)
        setTimeout(() => {
          const text = `Document Title: ${file.name}\nSize: ${formatFileSize(file.size)}\n`
          setFileTextContent(text)
          setChatMessages(prev => [
            ...prev,
            { sender: 'ai', text: `Loaded "${file.name}". Ready to query.`, timestamp: new Date() }
          ])
          setIsParsingFile(false)
        }, 1000)
      }
    } catch (e) {
      setIsParsingFile(false)
    }
  }

  // --- Send Message handler ---
  const sendMessage = async () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatInput('')

    const updatedMsgs = [...chatMessages, { sender: 'user' as const, text: userMsg, timestamp: new Date() }]
    setChatMessages(updatedMsgs)
    setChatLoading(true)

    const geminiKey = localStorage.getItem('shreedesk-gemini-key')

    if (geminiKey) {
      // Direct integration with Gemini API in browser
      try {
        const context = fileTextContent 
          ? `You are a helpful AI Assistant at ShreeDeskOS. Here is the context extracted from the uploaded document:\n\n${fileTextContent.substring(0, 30000)}\n\nQuery: ${userMsg}`
          : `You are a helpful AI Assistant at ShreeDeskOS. Query: ${userMsg}`

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: context }] }]
          })
        })

        const data = await response.json()
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned from model.'
        
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiText, timestamp: new Date() }])
      } catch (err) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to Gemini API. Check your internet connection or key.', timestamp: new Date() }])
      } finally {
        setChatLoading(false)
      }
    } else {
      setTimeout(() => {
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Please configure your Gemini API key in Settings to use the AI Workspace.', timestamp: new Date() }])
        setChatLoading(false)
      }, 500)
    }
  }

  // --- Generate Report Builder ---
  const handleGenerateReport = async () => {
    if (!reportSubject.trim()) return
    setReportLoading(true)
    setReportResult('')

    const geminiKey = localStorage.getItem('shreedesk-gemini-key')

    if (geminiKey) {
      try {
        const prompt = `Draft a formal government ${reportType.replace('-', ' ')} on: "${reportSubject}". Additional details: "${reportTopic}". Use official Indian administrative structure, clear headers, numbered paras, and green-note alignment values if applicable. Output clean text formatting.`
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        setReportResult(text)
        addRecentFile(`ShreeDesk_AI_${reportType}.doc`, 'Generated', text.length, 0, '/ai')
      } catch (err) {
        setReportResult('Error generating report.')
      } finally {
        setReportLoading(false)
      }
    } else {
      setTimeout(() => {
        setReportResult('Please configure your Gemini API key in Settings to use the AI Report Writer.')
        setReportLoading(false)
      }, 500)
    }
  }

  // --- Content Generator logic ---
  const handleGenerateContent = async () => {
    if (!contentKeywords.trim()) return
    setContentLoading(true)
    setContentResult('')

    const geminiKey = localStorage.getItem('shreedesk-gemini-key')

    if (geminiKey) {
      try {
        const prompt = `Write a ${contentType.replace('-', ' ')} about: "${contentKeywords}". Tone: professional. Length: ${contentLength}. Output only the content text.`
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        setContentResult(text)
      } catch (err) {
        setContentResult('Error generating content.')
      } finally {
        setContentLoading(false)
      }
    } else {
      setTimeout(() => {
        setContentResult('Please configure your Gemini API key in Settings to use the Content Creator.')
        setContentLoading(false)
      }, 500)
    }
  }

  const downloadReportFile = () => {
    if (!reportResult) return
    const blob = new Blob([reportResult], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ShreeDesk_AI_${reportType}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const syncReportToDrive = async () => {
    if (!reportResult) return
    const blob = new Blob([reportResult], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_AI_${reportType}.txt`
    const res = await uploadFileToDrive('Reports', fileName, blob)
    alert(res.message)
  }

  const downloadContentFile = () => {
    if (!contentResult) return
    const blob = new Blob([contentResult], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ShreeDesk_AI_${contentType}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const syncContentToDrive = async () => {
    if (!contentResult) return
    const blob = new Blob([contentResult], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_AI_${contentType}.txt`
    const res = await uploadFileToDrive('Reports', fileName, blob)
    alert(res.message)
  }

  return (
    <ToolPageShell
      title="AI Workspace"
      description="Smart document querying, statistical report writer, and administrative draft generator in a secure sandboxed environment."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="🤖"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
        
        {/* Inner Tabs Sidebar */}
        <aside style={{ background: 'var(--panel-bg)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }} className="glass">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.5rem', display: 'block' }}>Environments</span>
          <button
            onClick={() => setActiveWorkspace('chat')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.65rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeWorkspace === 'chat' ? 'var(--accent-soft)' : 'transparent',
              color: activeWorkspace === 'chat' ? 'var(--accent)' : 'var(--text)',
              fontWeight: activeWorkspace === 'chat' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <FiMessageSquare />
            <span style={{ fontSize: '0.85rem' }}>Document Chat</span>
          </button>

          <button
            onClick={() => setActiveWorkspace('reports')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.65rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeWorkspace === 'reports' ? 'var(--accent-soft)' : 'transparent',
              color: activeWorkspace === 'reports' ? 'var(--accent)' : 'var(--text)',
              fontWeight: activeWorkspace === 'reports' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <FiFileText />
            <span style={{ fontSize: '0.85rem' }}>AI Report Writer</span>
          </button>

          <button
            onClick={() => setActiveWorkspace('content')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.65rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeWorkspace === 'content' ? 'var(--accent-soft)' : 'transparent',
              color: activeWorkspace === 'content' ? 'var(--accent)' : 'var(--text)',
              fontWeight: activeWorkspace === 'content' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <FiBookOpen />
            <span style={{ fontSize: '0.85rem' }}>Content Creator</span>
          </button>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasApiKey ? 'var(--success)' : 'var(--warning)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: hasApiKey ? 'var(--success)' : 'var(--warning)' }}></span>
              {hasApiKey ? 'Pro LLM Mode Active' : 'Sandbox (Local Search)'}
            </div>
            <p style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>Paste a Gemini key in Settings for full LLM intelligence.</p>
          </div>
        </aside>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '520px' }}>
          
          {!hasApiKey && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '1rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="glass">
              <h4 style={{ margin: 0, color: 'var(--accent)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 Activating AI Workspace: Free Gemini API Key Guide
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                ShreeDeskOffice uses Google Gemini's lightning-fast models client-side to read documents, summarize data, and write reports. To protect your privacy, we don't route calls through our servers. Follow these quick steps to get your own <strong>100% free</strong> API key:
              </p>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-muted)' }}>
                <li>Go to <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Google AI Studio</a>.</li>
                <li>Sign in with any standard Google/Gmail account.</li>
                <li>Click the blue <strong>"Get API Key"</strong> button at the top left.</li>
                <li>Click <strong>"Create API Key"</strong> and copy the generated key.</li>
                <li>Click the <strong>Settings (Gear Icon)</strong> in the top header of ShreeDesk, paste your key, and click Save!</li>
              </ol>
            </div>
          )}

          {/* 1. Document Chat Workspace */}
          {activeWorkspace === 'chat' && (
            <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100%', gap: '1rem' }}>
              {/* File Dropzone Row */}
              <div 
                style={{ 
                  background: 'var(--panel-bg)', 
                  border: '1.5px dashed var(--border)', 
                  borderRadius: '1rem', 
                  padding: '1rem 1.5rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <FiUpload style={{ color: 'var(--accent)', fontSize: '1.5rem' }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                      {chatFile ? chatFile.name : 'Upload Document to Chat'}
                    </strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {chatFile ? `${formatFileSize(chatFile.size)} • Extracted ${fileTextContent.length} chars` : 'PDF, CSV, TXT files accepted'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {chatFile && (
                    <button 
                      onClick={() => { setChatFile(null); setFileTextContent(''); }} 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiX /> Remove
                    </button>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Select File
                  </button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".pdf,.csv,.txt,.json" 
                    style={{ display: 'none' }} 
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
                  />
                </div>
              </div>

              {/* Chat Thread Panel */}
              <div 
                style={{ 
                  background: 'var(--panel-bg)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '1rem', 
                  padding: '1.5rem', 
                  overflowY: 'auto', 
                  height: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      background: msg.sender === 'user' ? 'var(--accent)' : 'var(--card-bg)',
                      color: msg.sender === 'user' ? 'white' : 'var(--text)',
                      padding: '0.75rem 1rem',
                      borderRadius: msg.sender === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
                {isParsingFile && (
                  <div style={{ alignSelf: 'flex-start', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Reading document streams client-side...
                  </div>
                )}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    AI is processing response...
                  </div>
                )}
              </div>

              {/* Chat Send Row */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ask a question about the document... (e.g. summarize findings)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)'
                  }}
                />
                <button 
                  onClick={sendMessage} 
                  className="btn-primary" 
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FiSend /> Send
                </button>
              </div>
            </div>
          )}

          {/* 2. AI Report Writer Workspace */}
          {activeWorkspace === 'reports' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', height: '100%' }} className="responsive-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label className="select-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Report Template Format
                  <select value={reportType} onChange={e => setReportType(e.target.value as any)}>
                    <option value="office-note">Double-Spaced Green Note (GoI Format)</option>
                    <option value="minutes">Formal Council meeting minutes (M.O.M)</option>
                    <option value="statistical">Statistical Table Summarizer</option>
                    <option value="government">D.O. Reference Letter Outline</option>
                  </select>
                </label>

                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Document Subject / Title
                  <input 
                    type="text" 
                    value={reportSubject} 
                    onChange={e => setReportSubject(e.target.value)} 
                    placeholder="e.g. Health Sanitation infrastructure block-level budget" 
                  />
                </label>

                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Key details to include (One per line)
                  <textarea 
                    rows={6} 
                    value={reportTopic} 
                    onChange={e => setReportTopic(e.target.value)} 
                    placeholder="e.g. Budget allocation: 40 Lakhs. Block NHM clearance needed." 
                  />
                </label>

                <button 
                  onClick={handleGenerateReport} 
                  className="btn-primary" 
                  disabled={reportLoading}
                  style={{ width: 'max-content', padding: '0.75rem 1.5rem' }}
                >
                  {reportLoading ? 'Generating draft...' : 'Build AI Document'}
                </button>
              </div>

              {/* Draft Result Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" style={{ fontWeight: 600 }}>Draft Preview</label>
                  {reportResult && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => navigator.clipboard.writeText(reportResult)} className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Copy</button>
                      <button onClick={downloadReportFile} className="btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Download txt</button>
                      <button onClick={syncReportToDrive} className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Sync to Drive</button>
                    </div>
                  )}
                </div>
                <textarea
                  readOnly
                  rows={15}
                  value={reportResult}
                  placeholder="Output draft document will generate here..."
                  style={{ 
                    width: '100%', 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem', 
                    padding: '1rem', 
                    borderRadius: '0.75rem', 
                    border: '1px solid var(--border)', 
                    background: 'var(--panel-bg)', 
                    color: 'var(--text)',
                    lineHeight: 1.6
                  }}
                />
              </div>
            </div>
          )}

          {/* 3. Content Creator Workspace */}
          {activeWorkspace === 'content' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', height: '100%' }} className="responsive-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label className="select-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Social / Press Type
                  <select value={contentType} onChange={e => setContentType(e.target.value as any)}>
                    <option value="press-release">Department Press Release</option>
                    <option value="article">Archival Newsletter Article</option>
                    <option value="social-post">Platform Announcement (Twitter/LinkedIn)</option>
                  </select>
                </label>

                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Keywords / Announcement Details
                  <textarea 
                    rows={8} 
                    value={contentKeywords} 
                    onChange={e => setContentKeywords(e.target.value)} 
                    placeholder="e.g. District immunization schedule started. Target age: 0-5. Health units: 450." 
                  />
                </label>

                <button 
                  onClick={handleGenerateContent} 
                  className="btn-primary" 
                  disabled={contentLoading}
                  style={{ width: 'max-content', padding: '0.75rem 1.5rem' }}
                >
                  {contentLoading ? 'Creating content...' : 'Generate Text'}
                </button>
              </div>

              {/* Content Result Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" style={{ fontWeight: 600 }}>Draft Preview</label>
                  {contentResult && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => navigator.clipboard.writeText(contentResult)} className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Copy text</button>
                      <button onClick={downloadContentFile} className="btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Download txt</button>
                      <button onClick={syncContentToDrive} className="btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Sync to Drive</button>
                    </div>
                  )}
                </div>
                <textarea
                  readOnly
                  rows={15}
                  value={contentResult}
                  placeholder="Output copy will appear here..."
                  style={{ 
                    width: '100%', 
                    fontSize: '0.9rem', 
                    padding: '1rem', 
                    borderRadius: '0.75rem', 
                    border: '1px solid var(--border)', 
                    background: 'var(--panel-bg)', 
                    color: 'var(--text)',
                    lineHeight: 1.5
                  }}
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </ToolPageShell>
  )
}

export default AiWorkspace
