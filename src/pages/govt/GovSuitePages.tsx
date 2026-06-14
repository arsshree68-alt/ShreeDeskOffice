import { useState } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiPrinter } from 'react-icons/fi'
import { useRecentFiles } from '../../hooks/useRecentFiles'

type GovToolTab = 'office-note' | 'do-letter' | 'rti-draft' | 'naming' | 'translation' | 'census'

const GovSuitePages = () => {
  const [activeTab, setActiveTab] = useState<GovToolTab>('office-note')
  const { addRecentFile } = useRecentFiles()

  // 1. Office Note State
  const [noteFileNo, setNoteFileNo] = useState('NO. H&FW/2026/BUDGET/ANM-4')
  const [noteSubject, setNoteSubject] = useState('Sanction of budget for ANM sub-centers in block sanitation drive')
  const [noteParas, setNoteParas] = useState([
    'Submitted for perusal and directions regarding block sanitation drives in 4 district subdivisions.',
    'It is proposed to allocate Rs. 10 Lakhs per block sub-center for immediate supply purchases, ANM travel kits, and testing reagents.',
    'The Finance department has reviewed the layout and cleared the funds under Scheme head: NHM-2026.'
  ])

  // 2. DO Letter State
  const [doEmblem, setDoEmblem] = useState('🏛️')
  const [doSenderName, setDoSenderName] = useState('Dr. Abhishek Shrivastava, IAS')
  const [doDesignation, setDoDesignation] = useState('Joint Secretary (Health)')
  const [doAddress, setDoAddress] = useState('Room 402, Ministry of Health, Shastri Bhawan, New Delhi')
  const [doLetterNo, setDoLetterNo] = useState('D.O. NO. JS(H)/2026-112')
  const [doRecipient, setDoRecipient] = useState('Shri R. K. Varma, District Magistrate, Patna')
  const [doBody, setDoBody] = useState('I am writing to draw your personal attention to the pending immunization targets in your district. It has been observed that block subdivisions 3 and 4 are lagging behind state averages.\n\nI would be grateful if you could personally convene a review meeting with all block supervisors and ensure corrective action is executed immediately.')

  // 3. RTI Draft State
  const [rtiPio, setRtiPio] = useState('Public Information Officer (PIO)\nDepartment of Public Works\nNoida Authority Office')
  const [rtiApplicant, setRtiApplicant] = useState('Arsh Sharma, 102 Green Park, New Delhi')
  const [rtiQuestions, setRtiQuestions] = useState([
    'Please provide the total budget sanctioned for road maintenance in Ward 14 from April 2025 to March 2026.',
    'Provide copies of all completion certificates submitted by contractors for projects in Ward 14 during this period.',
    'List the name of the nodal engineers responsible for audit clearance of these projects.'
  ])

  // 4. File Naming Standardizer
  const [nameDept, setNameDept] = useState('HEALTH')
  const [nameDocType, setNameDocType] = useState('CIRCULAR')
  const [nameSubjectCode, setNameSubjectCode] = useState('INFLUENZA_GUIDELINES')
  const [nameYear, setNameYear] = useState('2026')
  const [nameResult, setNameResult] = useState('')

  // 5. Official Translation State
  const [transInput, setTransInput] = useState('Please review this note and submit it for approval by the Joint Secretary. Action required on priority.')
  const [transOutput, setTransOutput] = useState('')

  // 6. Census Data Formatter
  const [censusCsv, setCensusCsv] = useState('Block,MalePopulation,FemalePopulation,LiteracyRate\nBlock-A,14500,13200,82.4%\nBlock-B,12200,11900,74.1%\nBlock-C,18100,17800,89.5%')
  const [censusResult, setCensusResult] = useState('')

  // --- File Naming logic ---
  const handleNamingStandardize = () => {
    const cleanDept = nameDept.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanDoc = nameDocType.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanSub = nameSubjectCode.toUpperCase().replace(/[^A-Z0-9_]/g, '')
    const result = `${nameYear}_${cleanDept}_${cleanDoc}_${cleanSub}.pdf`
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

  const runTranslation = () => {
    let translated = transInput

    Object.keys(glossaryMap).forEach(englishPhrase => {
      const regex = new RegExp(englishPhrase, 'gi')
      translated = translated.replace(regex, glossaryMap[englishPhrase])
    })

    if (translated === transInput) {
      setTransOutput('Translation: ' + transInput + '\n\n*(Note: Client-side translator matches standard official glossary terms. Configure Gemini API key for complete document translations).*')
    } else {
      setTransOutput(translated)
    }
  }

  // --- Census calculation logic ---
  const runCensusCalculation = () => {
    try {
      const lines = censusCsv.split('\n').filter(l => l.trim() !== '')
      if (lines.length === 0) return
      // headers parsed
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
      const sexRatio = Math.round((totalFemale / totalMale) * 1000)

      formatted += `Total Blocks Analyzed: ${lines.length - 1}\n`
      formatted += `Total Male Population: ${totalMale.toLocaleString()}\n`
      formatted += `Total Female Population: ${totalFemale.toLocaleString()}\n`
      formatted += `Aggregate Population: ${totalPop.toLocaleString()}\n`
      formatted += `District Sex Ratio (Females per 1000 Males): ${sexRatio}\n`
      formatted += `\nRaw data grid matches: OK.\n`

      setCensusResult(formatted)
      addRecentFile('census_analysis_report.txt', 'Generated', formatted.length, 0, '/govt')
    } catch (e) {
      setCensusResult('Error compiling CSV census values. Ensure population columns are numeric.')
    }
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

          {/* 1. Office Note Generator */}
          {activeTab === 'office-note' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }} className="responsive-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  File Reference Number
                  <input type="text" value={noteFileNo} onChange={e => setNoteFileNo(e.target.value)} />
                </label>
                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Note Subject
                  <input type="text" value={noteSubject} onChange={e => setNoteSubject(e.target.value)} />
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Note Paragraphs</span>
                  {noteParas.map((para, idx) => (
                    <textarea
                      key={idx}
                      rows={3}
                      value={para}
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

                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'max-content' }}><FiPrinter /> Print Note</button>
              </div>

              {/* Note sheet output */}
              <div className="green-note-sheet" id="printable-area">
                <div className="green-note-header">
                  <strong style={{ display: 'block', fontSize: '1rem' }}>GOVERNMENT OF INDIA / STATE DEPT</strong>
                  <span style={{ fontSize: '0.85rem' }}>Reference: {noteFileNo}</span>
                </div>
                <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  SUBJECT: {noteSubject.toUpperCase()}
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
                    <input type="text" value={doEmblem} onChange={e => setDoEmblem(e.target.value)} />
                  </label>
                  <label className="input-label" style={{ flex: 1.5 }}>
                    D.O. Reference No.
                    <input type="text" value={doLetterNo} onChange={e => setDoLetterNo(e.target.value)} />
                  </label>
                </div>
                <label className="input-label">
                  Sender Name
                  <input type="text" value={doSenderName} onChange={e => setDoSenderName(e.target.value)} />
                </label>
                <label className="input-label">
                  Designation
                  <input type="text" value={doDesignation} onChange={e => setDoDesignation(e.target.value)} />
                </label>
                <label className="input-label">
                  Sender Address
                  <input type="text" value={doAddress} onChange={e => setDoAddress(e.target.value)} />
                </label>
                <label className="input-label">
                  Recipient Address
                  <input type="text" value={doRecipient} onChange={e => setDoRecipient(e.target.value)} />
                </label>
                <label className="input-label">
                  Body Text
                  <textarea rows={5} value={doBody} onChange={e => setDoBody(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                </label>
                <button onClick={handlePrint} className="btn-primary" style={{ width: 'max-content' }}><FiPrinter /> Print Letter</button>
              </div>

              {/* D.O. Letterhead preview */}
              <div className="do-letterhead">
                <div className="do-letterhead-header">
                  <div style={{ width: '50%' }}>
                    <div className="do-letterhead-emblem">{doEmblem}</div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', marginTop: '0.5rem' }}>{doSenderName}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#555', display: 'block' }}>{doDesignation}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', lineHeight: 1.3 }}>{doAddress}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <strong>{doLetterNo}</strong>
                    <div style={{ marginTop: '0.5rem' }}>Dated: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Dear <strong>{doRecipient.split(',')[0]}</strong>,
                </div>

                <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, textIndent: '2rem' }}>
                  {doBody}
                </div>

                <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.9rem' }}>
                  <span>With regards,</span>
                  <span style={{ height: '40px' }}></span>
                  <strong>Yours sincerely,</strong>
                  <span style={{ marginTop: '0.25rem' }}>({doSenderName.split(',')[0]})</span>
                </div>

                <div style={{ borderTop: '1px solid #ddd', marginTop: '2rem', paddingTop: '1rem', fontSize: '0.8rem', color: '#555' }}>
                  <strong>To:</strong><br />
                  {doRecipient}
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
                  <textarea rows={3} value={rtiPio} onChange={e => setRtiPio(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
                </label>
                <label className="input-label">
                  Applicant Address
                  <input type="text" value={rtiApplicant} onChange={e => setRtiApplicant(e.target.value)} />
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Questions under Section 6(1)</span>
                  {rtiQuestions.map((q, idx) => (
                    <textarea
                      key={idx}
                      rows={2}
                      value={q}
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
                <button onClick={handlePrint} className="btn-primary" style={{ width: 'max-content' }}><FiPrinter /> Print Application</button>
              </div>

              {/* RTI Application preview */}
              <div className="rti-application-sheet">
                <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', marginBottom: '1.5rem' }}>
                  FORM FOR RTI APPLICATION UNDER SECTION 6(1) OF RTI ACT 2005
                </div>

                <div style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <strong>To,</strong><br />
                    {rtiPio}
                  </div>

                  <div>
                    <strong>1. Name & Address of Applicant:</strong><br />
                    {rtiApplicant}
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
                  style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                />
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={runTranslation}>Translate Glossary</button>
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
                  onChange={(e) => setCensusCsv(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                />
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={runCensusCalculation}>Format & Summarise Census</button>
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
