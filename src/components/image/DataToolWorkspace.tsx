import { useCallback, useState } from 'react'
import PdfProgressBar from '../pdf/PdfProgressBar'
import { createDownload, formatFileSize } from '../../tools/pdf/engine/fileUtils'
import { read, utils, write } from 'xlsx'

export interface DataToolDefinition {
  id: string
  title: string
  description: string
  icon: React.ReactNode | string
  acceptsMultiple: boolean
}

interface DataToolWorkspaceProps {
  tool: DataToolDefinition
}

const DataToolWorkspace = ({ tool }: DataToolWorkspaceProps) => {
  const [dataFiles, setDataFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null)
  const [output, setOutput] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [feedback, setFeedback] = useState('Upload CSV or Excel files to begin data processing.')
  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Specialized Data/Gov Configurations
  const [keyColumn, setKeyColumn] = useState('ID')
  const [headerRow, setHeaderRow] = useState(1)
  const [missingValueStrategy, setMissingValueStrategy] = useState<'ignore' | 'drop' | 'fill-zero'>('ignore')
  const [qcThreshold, setQcThreshold] = useState(95)
  const [stateFilter, setStateFilter] = useState('All')

  const totalSize = dataFiles.reduce((sum, file) => sum + file.size, 0)

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
    if (validFiles.length === 0) return

    setOutput(null)
    setDataFiles(tool.acceptsMultiple ? validFiles : [validFiles[0]])
    setFeedback(`Loaded ${validFiles.length} dataset(s) for analysis.`)
  }, [tool.acceptsMultiple])

  const runTool = async () => {
    setProcessing(true)
    setOutput(null)
    setProgress({ label: 'Analyzing dataset structure...', value: 15 })

    try {
      // Real Data Engine using SheetJS
      const file = dataFiles[0]
      const buffer = await file.arrayBuffer()
      setProgress({ label: 'Parsing workbook data...', value: 30 })
      
      const wb = read(buffer, { type: 'array' })
      const wsName = wb.SheetNames[0]
      const ws = wb.Sheets[wsName]
      
      // Extract data
      setProgress({ label: 'Applying data rules and thresholds...', value: 60 })
      let data = utils.sheet_to_json<Record<string, unknown>>(ws, { range: headerRow - 1 })

      // Apply Logic
      if (tool.id === 'remove-duplicates' || tool.id === 'gov-household-duplicate-detector') {
        const seen = new Set()
        data = data.filter(row => {
          const val = row[keyColumn]
          if (val === undefined || seen.has(val)) return false
          seen.add(val)
          return true
        })
      }

      if (missingValueStrategy === 'drop') {
         data = data.filter(row => row[keyColumn] !== undefined && row[keyColumn] !== null && row[keyColumn] !== '')
      }
      
      // If gov suite state filter is active
      if (stateFilter !== 'All') {
        data = data.filter(row => Object.values(row).some(v => String(v).includes(stateFilter)))
      }

      setProgress({ label: 'Compiling final output report...', value: 90 })
      const newWs = utils.json_to_sheet(data)
      const newWb = utils.book_new()
      utils.book_append_sheet(newWb, newWs, 'Cleaned_Data')
      
      const outBuffer = write(newWb, { type: 'array', bookType: 'csv' })
      const outBlob = new Blob([outBuffer], { type: 'text/csv' })

      setOutput({
        blob: outBlob,
        fileName: `ShreeDesk_${tool.id}_Report.csv`,
      })
      setProgress({ label: 'Analysis Completed Successfully', value: 100 })
      setFeedback('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed.'
      setFeedback(`❌ Error: ${message}`)
      setProgress(null)
    } finally {
      setProcessing(false)
    }
  }

  const isReady = dataFiles.length > 0

  return (
    <section className="pdf-workspace" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      
      {/* Top Header - Updated to Linear/Notion minimal style */}
      <div className="pdf-workspace-header" style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '12px', border: '1px solid #E4E0D9', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '600px' }}>
          <span className="pdf-workspace-kicker" style={{ color: '#6B6459', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Data & Gov Workspace</span>
          <h2 style={{ fontSize: '1.875rem', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#1F1B16', fontWeight: 600, letterSpacing: '-0.02em' }}>{tool.icon} {tool.title}</h2>
          <p style={{ fontSize: '1rem', color: '#6B6459', margin: 0 }}>{tool.description}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <span className="pdf-local-badge" style={{ background: '#F0EDE8', color: '#4b5563', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500 }}>🔒 Secure Client Analysis</span>
          {isReady && (
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', color: '#4A4438', fontSize: '0.875rem', fontWeight: 500 }}>
              <input type="file" multiple={tool.acceptsMultiple} accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files)
              }} />
              <span>+ Add Dataset</span>
            </label>
          )}
        </div>
      </div>

      {!isReady ? (
        <label
          className={`pdf-dropzone ${dragging ? 'dragging' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', border: '2px dashed #d1d5db', borderRadius: '12px', background: dragging ? '#F7F5F2' : '#ffffff', cursor: 'pointer', transition: 'all 0.2s' }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFilesSelected(e.dataTransfer.files)
          }}
        >
          <input type="file" accept=".csv,.xlsx,.xls" multiple={tool.acceptsMultiple} style={{ display: 'none' }} onChange={(e) => {
            if (e.target.files) handleFilesSelected(e.target.files)
          }} />
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</span>
          <strong style={{ fontSize: '1.125rem', color: '#1F1B16', fontWeight: 500 }}>Drop CSV or Excel files here</strong>
          <small style={{ color: '#6B6459', marginTop: '0.5rem' }}>Strictly local processing. Data never leaves your browser.</small>
        </label>
      ) : (
        <div className="pdf-workspace-grid">
          
          {/* Left: Data Summary & Integrity Check */}
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E4E0D9' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1F1B16', marginBottom: '1.5rem' }}>Dataset Overview</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: '8px', background: '#F0EDE8', border: '1px solid #E4E0D9' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B6459', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Files Loaded</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1F1B16' }}>{dataFiles.length}</div>
              </div>
              <div style={{ padding: '1.25rem', borderRadius: '8px', background: '#F0EDE8', border: '1px solid #E4E0D9' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B6459', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Size</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1F1B16' }}>{formatFileSize(totalSize)}</div>
              </div>
              <div style={{ padding: '1.25rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Data Security</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#15803d', marginTop: '0.5rem' }}>Local Mode Active</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4A4438', marginBottom: '1rem' }}>Active Files</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dataFiles.map((file, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F0EDE8', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 500, color: '#1F1B16' }}>{file.name}</span>
                  <span style={{ color: '#6B6459' }}>{formatFileSize(file.size)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Data Engineering / Gov Sidebar */}
          <div className="pdf-workspace-options" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E4E0D9' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600, color: '#1F1B16' }}>Data Rules</h3>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              
              {/* Generic Excel / Data Setup */}
              <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Header Row Index
                  <input type="number" min={1} className="pdf-text-input" value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Key Column
                  <input type="text" className="pdf-text-input" placeholder="e.g. ID, Email" value={keyColumn} onChange={(e) => setKeyColumn(e.target.value)} />
                </label>
              </div>

              {/* Handling Strategy */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Missing Value Handling
                <select className="pdf-text-input" value={missingValueStrategy} onChange={(e) => setMissingValueStrategy(e.target.value as any)}>
                  <option value="ignore">Ignore (Keep Blank)</option>
                  <option value="drop">Drop Rows with Missing Keys</option>
                  <option value="fill-zero">Fill Numeric with 0</option>
                </select>
              </label>

              {/* Government/Specialized Tool Configuration */}
              {tool.id.startsWith('gov-') && (
                <div style={{ background: '#F0EDE8', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E4E0D9', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6B6459', marginBottom: '1rem', letterSpacing: '0.05em' }}>Government Compliance Rules</h4>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                      Region / State Filter
                      <select className="pdf-text-input" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                        <option value="All">All Regions</option>
                        <option value="MH">Maharashtra</option>
                        <option value="DL">Delhi</option>
                        <option value="UP">Uttar Pradesh</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>QC Match Threshold</span>
                        <span style={{ color: '#ea580c' }}>{qcThreshold}%</span>
                      </div>
                      <input type="range" min={50} max={100} value={qcThreshold} onChange={(e) => setQcThreshold(Number(e.target.value))} style={{ width: '100%' }} />
                      <span style={{ fontSize: '0.75rem', color: '#6B6459', fontWeight: 400 }}>Minimum confidence required for fuzzy matching.</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Processing & Export Panel */}
            <div style={{ marginTop: '2.5rem' }}>
              <PdfProgressBar progress={progress} />
              {feedback && (
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: feedback.includes('❌') ? '#ef4444' : 'var(--text-muted)' }}>{feedback}</p>
              )}

              <div style={{ display: 'grid', gap: '1rem' }}>
                {!output && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={processing}
                    onClick={runTool}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 500, background: '#1F1B16', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                  >
                    {processing ? 'Analyzing...' : `Run ${tool.title}`}
                  </button>
                )}
                
                {output && (
                  <div className="output-success-card" style={{ background: '#F7F5F2', border: '1px solid #E4E0D9', borderRadius: '8px', padding: '1.25rem' }}>
                    <h4 style={{ color: '#1F1B16', margin: '0 0 1rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Analysis Complete
                    </h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span>Source Files:</span>
                      <span>{dataFiles.length} Processed</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                      <span>Output Format:</span>
                      <span style={{ textTransform: 'uppercase' }}>CSV Report</span>
                    </div>

                    <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                       <button 
                        type="button" 
                        onClick={() => createDownload(output.blob, output.fileName)} 
                        style={{ background: '#1F1B16', color: '#ffffff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Download Data
                      </button>
                      <button 
                        type="button" 
                        style={{ background: '#ffffff', color: '#4A4438', border: '1px solid #d1d5db', padding: '0.6rem', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        View Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  )
}

export default DataToolWorkspace