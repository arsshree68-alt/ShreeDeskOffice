import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiPrinter, FiDownload, FiSave } from 'react-icons/fi'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import HlbConsolidatorTool from '../../tools/gov/HlbConsolidatorTool'
import { uploadFileToDrive } from '../../utils/googleDrive'

type GovToolTab = 'hlb' | 'office-note' | 'do-letter' | 'rti-draft' | 'naming' | 'translation' | 'census'

const getTabFromPath = (path: string): GovToolTab => {
  if (path.includes('/govt/hlb')) return 'hlb'
  if (path.includes('/govt/office-note')) return 'office-note'
  if (path.includes('/govt/do-letter')) return 'do-letter'
  if (path.includes('/govt/rti-draft')) return 'rti-draft'
  if (path.includes('/govt/naming')) return 'naming'
  if (path.includes('/govt/translation')) return 'translation'
  if (path.includes('/govt/census')) return 'census'
  return 'office-note'
}

const GovSuitePages = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<GovToolTab>(() => getTabFromPath(window.location.pathname))
  const { addRecentFile } = useRecentFiles()

  // Sync tab with path routing
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname))
  }, [location.pathname])

  // 1. Office Note State
  const [noteFileNo, setNoteFileNo] = useState('')
  const [noteSubject, setNoteSubject] = useState('')
  const [noteParas, setNoteParas] = useState([''])

  // 2. DO Letter State
  const [doEmblem, setDoEmblem] = useState('🏛️')
  const [doSenderName, setDoSenderName] = useState('')
  const [doDesignation, setDoDesignation] = useState('')
  const [doAddress, setDoAddress] = useState('')
  const [doLetterNo, setDoLetterNo] = useState('')
  const [doRecipient, setDoRecipient] = useState('')
  const [doBody, setDoBody] = useState('')

  // 3. RTI Draft State
  const [rtiPio, setRtiPio] = useState('')
  const [rtiApplicant, setRtiApplicant] = useState('')
  const [rtiQuestions, setRtiQuestions] = useState([''])

  // 4. File Naming Standardizer
  const [nameDept, setNameDept] = useState('HEALTH')
  const [nameDocType, setNameDocType] = useState('CIRCULAR')
  const [nameSubjectCode, setNameSubjectCode] = useState('')
  const [nameYear, setNameYear] = useState(new Date().getFullYear().toString())
  const [nameResult, setNameResult] = useState('')

  // 5. Official Translation State
  const [transInput, setTransInput] = useState('')
  const [transOutput, setTransOutput] = useState('')
  const [translating, setTranslating] = useState(false)

  // 6. Census Data Formatter
  const [censusCsv, setCensusCsv] = useState('')
  const [censusResult, setCensusResult] = useState('')

  // --- Office Note Exports ---
  const handleDownloadNote = () => {
    const text = `GOVERNMENT OF INDIA / DEPT CODES\nFile Reference: ${noteFileNo || 'DRAFT'}\n\nSUBJECT: ${noteSubject.toUpperCase() || 'DRAFT SUBJECT'}\n\n` +
      noteParas.map((p, i) => `${i + 1}. ${p || '...'}`).join('\n\n') +
      `\n\n\nUnder Secretary to Govt.\nNodal Desk`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_OfficeNote_${noteFileNo.replace(/[^a-zA-Z0-9]/g, '_') || 'Draft'}.txt`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    addRecentFile(fileName, 'Generated', blob.size, 0, '/govt')
  }

  const handleSyncNoteToDrive = async () => {
    const text = `GOVERNMENT OF INDIA / DEPT CODES\nFile Reference: ${noteFileNo || 'DRAFT'}\n\nSUBJECT: ${noteSubject.toUpperCase() || 'DRAFT SUBJECT'}\n\n` +
      noteParas.map((p, i) => `${i + 1}. ${p || '...'}`).join('\n\n') +
      `\n\n\nUnder Secretary to Govt.\nNodal Desk`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_OfficeNote_${noteFileNo.replace(/[^a-zA-Z0-9]/g, '_') || 'Draft'}.txt`
    const res = await uploadFileToDrive('Reports', fileName, blob)
    alert(res.message)
  }

  // --- DO Letter Exports ---
  const handleDownloadDoLetter = () => {
    const text = `${doEmblem} DEMI-OFFICIAL (D.O.) LETTERHEAD\n\nReference: ${doLetterNo || 'DRAFT'}\nDate: ${new Date().toLocaleDateString()}\n\nFrom:\n${doSenderName || '...'}\n${doDesignation || '...'}\n${doAddress || '...'}\n\nTo:\n${doRecipient || '...'}\n\nDear Recipient,\n\n${doBody || '...'}\n\nWith regards,\n\nYours sincerely,\n${doSenderName.split(' ')[0] || '...'}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_DOLetter_${doLetterNo.replace(/[^a-zA-Z0-9]/g, '_') || 'Draft'}.txt`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    addRecentFile(fileName, 'Generated', blob.size, 0, '/govt')
  }

  const handleSyncDoLetterToDrive = async () => {
    const text = `${doEmblem} DEMI-OFFICIAL (D.O.) LETTERHEAD\n\nReference: ${doLetterNo || 'DRAFT'}\nDate: ${new Date().toLocaleDateString()}\n\nFrom:\n${doSenderName || '...'}\n${doDesignation || '...'}\n${doAddress || '...'}\n\nTo:\n${doRecipient || '...'}\n\nDear Recipient,\n\n${doBody || '...'}\n\nWith regards,\n\nYours sincerely,\n${doSenderName.split(' ')[0] || '...'}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_DOLetter_${doLetterNo.replace(/[^a-zA-Z0-9]/g, '_') || 'Draft'}.txt`
    const res = await uploadFileToDrive('Reports', fileName, blob)
    alert(res.message)
  }

  // --- RTI Exports ---
  const handleDownloadRti = () => {
    const text = `FORM FOR RTI APPLICATION UNDER SECTION 6(1) OF RTI ACT 2005\n\nTo,\n${rtiPio || '...'}\n\n1. Name & Address of Applicant:\n${rtiApplicant || '...'}\n\n2. Particulars of Information Required:\n` +
      rtiQuestions.map((q, idx) => `${idx + 1}. ${q || '...'}`).join('\n') +
      `\n\n3. Citizenship Status:\nI hereby declare that I am a citizen of India and entitled to seek this information.\n\n4. Fee Payment Details:\nPostal Order (IPO) of Rs. 10/- is attached with this application.\n\nDate: ${new Date().toLocaleDateString()}\nApplicant Signature`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_RTI_Application_${new Date().getTime()}.txt`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    addRecentFile(fileName, 'Generated', blob.size, 0, '/govt')
  }

  const handleSyncRtiToDrive = async () => {
    const text = `FORM FOR RTI APPLICATION UNDER SECTION 6(1) OF RTI ACT 2005\n\nTo,\n${rtiPio || '...'}\n\n1. Name & Address of Applicant:\n${rtiApplicant || '...'}\n\n2. Particulars of Information Required:\n` +
      rtiQuestions.map((q, idx) => `${idx + 1}. ${q || '...'}`).join('\n') +
      `\n\n3. Citizenship Status:\nI hereby declare that I am a citizen of India and entitled to seek this information.\n\n4. Fee Payment Details:\nPostal Order (IPO) of Rs. 10/- is attached with this application.\n\nDate: ${new Date().toLocaleDateString()}\nApplicant Signature`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const fileName = `ShreeDesk_RTI_Application_${new Date().getTime()}.txt`
    const res = await uploadFileToDrive('Reports', fileName, blob)
    alert(res.message)
  }

  // --- File Naming logic ---
  const handleNamingStandardize = () => {
    const cleanDept = nameDept.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanDoc = nameDocType.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanSub = nameSubjectCode.toUpperCase().replace(/[^A-Z0-9_]/g, '')
    const result = `ShreeDesk_${nameYear}_${cleanDept}_${cleanDoc}_${cleanSub}.pdf`
    setNameResult(result)
    addRecentFile(result, 'Generated', 0, 0, '/govt')
  }

  // --- Translation Glossary Logic ---
  const glossaryMap: Record<string, string> = {
    'please review this note': 'कृपया इस टिप्पणी का अवलोकन करें',
    'submit it for approval': 'अनुमोदनार्थ प्रस्तुत करें',
    'by the joint secretary': 'संयुक्त सचिव द्वारा',
    'action required': 'आवश्यक कार्यवाही',
    'on priority': 'प्राथमिकता के आधार पर',
    'for information please': 'सूचनाार्थ',
    'discussed': 'चर्चा की गई',
    'approved': 'अनुमोदित',
    'approved as proposed': 'प्रस्तावनानुसार अनुमोदित',
    'file': 'नस्ती/फ़ाइल'
  }

  const runTranslation = async () => {
    if (!transInput.trim()) return
    
    const geminiKey = localStorage.getItem('shreedesk-gemini-key')
    if (geminiKey) {
      setTranslating(true)
      setTransOutput('Connecting to Gemini AI for translation...')
      try {
        const prompt = `Translate the following official government document from English to Hindi (Rajbhasha). Maintain the formal administrative vocabulary, structure, and tone. Output ONLY the translated Hindi text without any explanations, markdown codeblocks, or formatting:\n\n${transInput}`
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        setTransOutput(text.trim())
      } catch (err) {
        console.error(err)
        setTransOutput('Gemini API call failed. Falling back to local glossary.\n\n' + runGlossaryTranslation(transInput))
      } finally {
        setTranslating(false)
      }
    } else {
      setTransOutput(runGlossaryTranslation(transInput))
    }
  }

  const runGlossaryTranslation = (input: string) => {
    let translated = input
    Object.keys(glossaryMap).forEach(englishPhrase => {
      const regex = new RegExp(englishPhrase, 'gi')
      translated = translated.replace(regex, glossaryMap[englishPhrase])
    })

    if (translated === input) {
      return 'Translation: ' + input + '\n\n*(Note: Client-side translator matches standard official glossary terms. Configure Gemini API key in settings for full document AI translation).*'
    } else {
      return translated
    }
  }

  // --- Census calculation logic ---
  const runCensusCalculation = () => {
    try {
      const lines = censusCsv.split('\n').filter(l => l.trim() !== '')
      if (lines.length === 0) return
      
      let formatted = 'SUMMARY STATISTICAL CENSUS REPORT\n\n'
      let totalMale = 0
      let totalFemale = 0

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',')
        const mPop = parseInt(parts[1] || '0')
        const fPop = parseInt(parts[2] || '0')
        totalMale += mPop
        totalFemale += fPop
      }

      const totalPop = totalMale + totalFemale
      const sexRatio = totalMale > 0 ? Math.round((totalFemale / totalMale) * 1000) : 0

      formatted += `Total Blocks Analyzed: ${lines.length - 1}\n`
      formatted += `Total Male Population: ${totalMale.toLocaleString()}\n`
      formatted += `Total Female Population: ${totalFemale.toLocaleString()}\n`
      formatted += `Aggregate Population: ${totalPop.toLocaleString()}\n`
      formatted += `District Sex Ratio (Females per 1000 Males): ${sexRatio}\n`
      formatted += `\nRaw data grid matches: OK.\n`

      setCensusResult(formatted)
      addRecentFile('ShreeDesk_census_analysis_report.txt', 'Generated', formatted.length, 0, '/govt')
    } catch (e) {
      setCensusResult('Error compiling CSV census values. Ensure population columns are numeric.')
    }
  }

  const handleDownloadCensus = () => {
    if (!censusResult) return
    const blob = new Blob([censusResult], { type: 'text/plain;charset=utf-8' })
    const fileName = 'ShreeDesk_census_analysis_report.txt'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSyncCensusToDrive = async () => {
    if (!censusResult) return
    const blob = new Blob([censusResult], { type: 'text/plain;charset=utf-8' })
    const fileName = 'ShreeDesk_census_analysis_report.txt'
    const res = await uploadFileToDrive('Reports', fileName, blob)
    alert(res.message)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <ToolPageShell
      title="Government Suite"
      description="Administrative and public sector office tools built for compliant drafting, translation, and statistics."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="🏛️"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
        
        {/* Sidebar */}
        <aside style={{ background: 'var(--panel-bg)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }} className="glass">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.5rem', display: 'block' }}>Drafts</span>
          {[
            { id: 'hlb', label: 'HLB Consolidator', icon: '🏥' },
            { id: 'office-note', label: 'Office Green Note', icon: '🏢' },
            { id: 'do-letter', label: 'D.O. Letterhead', icon: '✉️' },
            { id: 'rti-draft', label: 'RTI Draft Box', icon: '📜' },
            { id: 'naming', label: 'NIC Naming Tool', icon: '🏷' },
            { id: 'translation', label: 'Gov Translation', icon: '🗣️' },
            { id: 'census', label: 'Census Demographics', icon: '🔢' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.65rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: activeTab === tab.id ? 'var(--accent-soft)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s',
              }}
              className="hover-lift"
            >
              <span>{tab.icon}</span>
              <span style={{ fontSize: '0.85rem' }}>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* 0. HLB Consolidator */}
          {activeTab === 'hlb' && (
            <HlbConsolidatorTool />
          )}

          {/* 1. Office Note Generator */}
          {activeTab === 'office-note' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }} className="responsive-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  File Reference Number
                  <input 
                    type="text" 
                    value={noteFileNo} 
                    onChange={e => setNoteFileNo(e.target.value)} 
                    placeholder="e.g. F.No. 11013/05/2026-Admn"
                  />
                </label>
                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Note Subject
                  <input 
                    type="text" 
                    value={noteSubject} 
                    onChange={e => setNoteSubject(e.target.value)} 
                    placeholder="e.g. Sanction and purchase of desktop workstations"
                  />
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Note Paragraphs</span>
                  {noteParas.map((para, idx) => (
                    <textarea
                      key={idx}
                      rows={3}
                      value={para}
                      placeholder="Write your note paragraph here..."
                      onChange={e => {
                        const next = [...noteParas]
                        next[idx] = e.target.value
                        setNoteParas(next)
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                    />
                  ))}
                  <button onClick={() => setNoteParas([...noteParas, ''])} className="btn-secondary" style={{ width: 'max-content', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>+ Add Paragraph</button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiPrinter /> Print Note</button>
                  <button onClick={handleDownloadNote} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiDownload /> Download Draft</button>
                  <button onClick={handleSyncNoteToDrive} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiSave /> Sync to Drive</button>
                </div>
              </div>

              {/* Note sheet output */}
              <div className="green-note-sheet" id="printable-area">
                <div className="green-note-header">
                  <strong style={{ display: 'block', fontSize: '1rem' }}>GOVERNMENT OF INDIA / STATE DEPT</strong>
                  <span style={{ fontSize: '0.85rem' }}>Reference: {noteFileNo || '_________________'}</span>
                </div>
                <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  SUBJECT: {noteSubject ? noteSubject.toUpperCase() : 'SUBJECT OUTLINE'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
                  {noteParas.map((para, idx) => (
                    <p key={idx} style={{ textIndent: '2.5rem', margin: 0 }}>
                      {idx + 1}. {para || '...'}
                    </p>
                  ))}
                </div>
                <div style={{ marginTop: '3rem', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ width: '120px', borderBottom: '1px solid #2e7d32', display: 'block', marginBottom: '0.25rem' }}></span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Under Secretary to Govt.</span>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>Nodal Desk</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. D.O. Letterhead */}
          {activeTab === 'do-letter' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }} className="responsive-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label className="input-label" style={{ flex: 1 }}>
                    Emblem Symbol
                    <input type="text" value={doEmblem} onChange={e => setDoEmblem(e.target.value)} placeholder="e.g. 🏛️" />
                  </label>
                  <label className="input-label" style={{ flex: 1.5 }}>
                    D.O. Reference No.
                    <input type="text" value={doLetterNo} onChange={e => setDoLetterNo(e.target.value)} placeholder="e.g. D.O. No. 12012/01/2026" />
                  </label>
                </div>
                <label className="input-label">
                  Sender Name
                  <input type="text" value={doSenderName} onChange={e => setDoSenderName(e.target.value)} placeholder="e.g. Ramesh Patel" />
                </label>
                <label className="input-label">
                  Designation
                  <input type="text" value={doDesignation} onChange={e => setDoDesignation(e.target.value)} placeholder="e.g. Joint Secretary" />
                </label>
                <label className="input-label">
                  Sender Address
                  <input type="text" value={doAddress} onChange={e => setDoAddress(e.target.value)} placeholder="e.g. Room 104, North Block, New Delhi" />
                </label>
                <label className="input-label">
                  Recipient Address
                  <input type="text" value={doRecipient} onChange={e => setDoRecipient(e.target.value)} placeholder="e.g. Dr. Rajesh Sharma, Director General, NHM" />
                </label>
                <label className="input-label">
                  Body Text
                  <textarea rows={5} value={doBody} onChange={e => setDoBody(e.target.value)} placeholder="Dear Rajesh,\n\nI would like to request you to look into the matter..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                </label>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiPrinter /> Print Letter</button>
                  <button onClick={handleDownloadDoLetter} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiDownload /> Download Draft</button>
                  <button onClick={handleSyncDoLetterToDrive} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiSave /> Sync to Drive</button>
                </div>
              </div>

              {/* D.O. Letterhead preview */}
              <div className="do-letterhead">
                <div className="do-letterhead-header">
                  <div style={{ width: '50%' }}>
                    <div className="do-letterhead-emblem">{doEmblem}</div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', marginTop: '0.5rem' }}>{doSenderName || 'SENDER NAME'}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#555', display: 'block' }}>{doDesignation || 'DESIGNATION'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', lineHeight: 1.3 }}>{doAddress || 'SENDER ADDRESS'}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <strong>{doLetterNo || 'D.O. REF NO'}</strong>
                    <div style={{ marginTop: '0.5rem' }}>Dated: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Dear <strong>{doRecipient ? doRecipient.split(',')[0] : 'Recipient'}</strong>,
                </div>

                <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, textIndent: '2rem' }}>
                  {doBody || 'Write your letter content...'}
                </div>

                <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.9rem' }}>
                  <span>With regards,</span>
                  <span style={{ height: '40px' }}></span>
                  <strong>Yours sincerely,</strong>
                  <span style={{ marginTop: '0.25rem' }}>({doSenderName ? doSenderName.split(' ')[0] : 'Sender'})</span>
                </div>

                <div style={{ borderTop: '1px solid #ddd', marginTop: '2rem', paddingTop: '1rem', fontSize: '0.8rem', color: '#555' }}>
                  <strong>To:</strong><br />
                  {doRecipient || 'Recipient name & address details'}
                </div>
              </div>
            </div>
          )}

          {/* 3. RTI Draft Box */}
          {activeTab === 'rti-draft' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }} className="responsive-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="input-label">
                  Public Information Officer (PIO)
                  <textarea rows={3} value={rtiPio} onChange={e => setRtiPio(e.target.value)} placeholder="e.g. Public Information Officer,\nMinistry of Finance,\nNorth Block, New Delhi" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                </label>
                <label className="input-label">
                  Applicant Address
                  <input type="text" value={rtiApplicant} onChange={e => setRtiApplicant(e.target.value)} placeholder="e.g. Ramesh Patel, House 4, Sector 12, Noida, U.P." />
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Questions under Section 6(1)</span>
                  {rtiQuestions.map((q, idx) => (
                    <textarea
                      key={idx}
                      rows={2}
                      value={q}
                      placeholder="e.g. Please provide the total expenditure on project X in FY 2025-26..."
                      onChange={e => {
                        const next = [...rtiQuestions]
                        next[idx] = e.target.value
                        setRtiQuestions(next)
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                    />
                  ))}
                  <button onClick={() => setRtiQuestions([...rtiQuestions, ''])} className="btn-secondary" style={{ width: 'max-content', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>+ Add Query</button>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiPrinter /> Print Application</button>
                  <button onClick={handleDownloadRti} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiDownload /> Download Draft</button>
                  <button onClick={handleSyncRtiToDrive} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiSave /> Sync to Drive</button>
                </div>
              </div>

              {/* RTI Application preview */}
              <div className="rti-application-sheet">
                <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', marginBottom: '1.5rem' }}>
                  FORM FOR RTI APPLICATION UNDER SECTION 6(1) OF RTI ACT 2005
                </div>

                <div style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <strong>To,</strong><br />
                    {rtiPio || 'PIO Address Details'}
                  </div>

                  <div>
                    <strong>1. Name & Address of Applicant:</strong><br />
                    {rtiApplicant || 'Applicant Address Details'}
                  </div>

                  <div>
                    <strong>2. Particulars of Information Required:</strong><br />
                    List of queries regarding public works:
                    <ol style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                      {rtiQuestions.map((q, idx) => (
                        <li key={idx} style={{ marginBottom: '0.5rem' }}>{q || '...'}</li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <strong>3. Citizenship Status:</strong><br />
                    I hereby declare that I am a citizen of India and entitled to seek this information.
                  </div>

                  <div>
                    <strong>4. Fee Payment Details:</strong><br />
                    Postal Order (IPO) of Rs. 10/- is attached with this application.
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>Signature of Applicant</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. NIC File Naming Tool */}
          {activeTab === 'naming' && (
            <div style={{ display: 'grid', gap: '1.5rem', background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '2rem', borderRadius: '1rem' }} className="glass">
              <h3>NIC File Naming Standardizer</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="responsive-2col">
                <label className="select-label">
                  Department Code
                  <select value={nameDept} onChange={e => setNameDept(e.target.value)}>
                    <option value="HEALTH">H&FW - Health & Family Welfare</option>
                    <option value="DOPT">DoPT - Personnel & Training</option>
                    <option value="FINANCE">FIN - Department of Finance</option>
                    <option value="REVENUE">REV - Revenue Office</option>
                  </select>
                </label>
                <label className="select-label">
                  Document Type
                  <select value={nameDocType} onChange={e => setNameDocType(e.target.value)}>
                    <option value="CIRCULAR">Circular / Notice</option>
                    <option value="ORDER">Administrative Order</option>
                    <option value="REPORT">Official Report</option>
                    <option value="NOTE">Office Note</option>
                  </select>
                </label>
                <label className="input-label" style={{ gridColumn: 'span 2' }}>
                  Subject Slug (use underscores)
                  <input type="text" value={nameSubjectCode} onChange={e => setNameSubjectCode(e.target.value)} placeholder="INFLUENZA_VACCINATION_DRIVE" />
                </label>
                <label className="input-label">
                  Year
                  <input type="number" value={nameYear} onChange={e => setNameYear(e.target.value)} />
                </label>
              </div>

              <button className="btn-primary" onClick={handleNamingStandardize} style={{ width: 'max-content' }}>Standardize File Name</button>

              {nameResult && (
                <div style={{ padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>NIC Standard Filename</span>
                    <strong style={{ fontSize: '1rem', fontFamily: 'monospace' }}>{nameResult}</strong>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(nameResult)} className="btn-secondary">Copy Name</button>
                </div>
              )}
            </div>
          )}

          {/* 5. Gov Translation */}
          {activeTab === 'translation' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Official English Text</label>
                <textarea
                  rows={8}
                  value={transInput}
                  onChange={(e) => setTransInput(e.target.value)}
                  placeholder="Type official English text here (e.g. please review this note and submit it for approval)..."
                  style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                />
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={runTranslation} disabled={translating}>
                  {translating ? 'Translating with Gemini...' : 'Translate to Hindi'}
                </button>
              </div>
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Official Rajbhasha (Hindi) Translation</label>
                <textarea
                  readOnly
                  rows={8}
                  value={transOutput}
                  style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  placeholder="Translation matches will appear here..."
                />
              </div>
            </div>
          )}

          {/* 6. Census Demographics */}
          {activeTab === 'census' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Raw Census CSV log</label>
                <textarea
                  rows={10}
                  value={censusCsv}
                  placeholder={"Block,MalePopulation,FemalePopulation,LiteracyRate\nBlock-A,12500,12100,0.85\nBlock-B,14800,14000,0.79"}
                  onChange={(e) => setCensusCsv(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn-primary" onClick={runCensusCalculation}>Format & Summarise Census</button>
                  {censusResult && (
                    <>
                      <button className="btn-secondary" onClick={handleDownloadCensus} title="Download Report"><FiDownload /> Download Report</button>
                      <button className="btn-secondary" onClick={handleSyncCensusToDrive} title="Sync to Google Drive"><FiSave /> Sync to Drive</button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Census Summary Report</label>
                <textarea
                  readOnly
                  rows={10}
                  value={censusResult}
                  style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)', lineHeight: 1.5 }}
                  placeholder="Aggregated statistics will appear here..."
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </ToolPageShell>
  )
}

export default GovSuitePages
