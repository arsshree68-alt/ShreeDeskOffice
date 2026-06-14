import { useState } from 'react'
import * as XLSX from 'xlsx'
import { FiUploadCloud, FiBarChart2, FiDownload, FiLayers, FiAlertCircle } from 'react-icons/fi'
import {
  exportWorkbook,
  getFileExtension,
  readWorkbookFromFile,
  parseWorksheetRows,
  supportedFileExtensions,
} from './excelToolUtils'

const RemoveDuplicateRowsTool = () => {
  const [fileCount, setFileCount] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [duplicateRows, setDuplicateRows] = useState(0)
  const [headerRow, setHeaderRow] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [feedback, setFeedback] = useState('Upload one or more spreadsheet files to remove duplicate rows.')
  const [processing, setProcessing] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) =>
      supportedFileExtensions.includes(getFileExtension(file)),
    )

    if (files.length === 0) {
      setFeedback('Please select valid spreadsheet files: XLSX, XLSM, XLSB, XLS, or CSV.')
      return
    }

    setProcessing(true)
    setFeedback('Processing files...')

    try {
      const rowSet = new Set<string>()
      const outputRows: string[][] = []
      let duplicates = 0
      let header: string[] = []

      for (const file of files) {
        const workbook = await readWorkbookFromFile(file)
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const parsedRows = parseWorksheetRows(sheet)

        if (parsedRows.length === 0) continue

        if (header.length === 0) {
          header = parsedRows[0]
          setHeaderRow(header)
        }

        const dataRows = parsedRows.slice(1)
        for (const row of dataRows) {
          const rowKey = JSON.stringify(row)
          if (rowSet.has(rowKey)) {
            duplicates += 1
            continue
          }

          rowSet.add(rowKey)
          outputRows.push(row)
        }
      }

      setFileCount(files.length)
      setTotalRows(outputRows.length)
      setDuplicateRows(duplicates)
      setRows(outputRows)
      setFeedback(`Removed ${duplicates} duplicate rows across ${files.length} file(s).`)
    } catch (error) {
      console.error(error)
      setFeedback('There was an error parsing the files. Please verify the spreadsheet contents.')
    } finally {
      setProcessing(false)
    }
  }

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      await processFiles(event.target.files)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files)
    }
  }

  const handleExport = () => {
    if (!headerRow.length || rows.length === 0) {
      setFeedback('No merged data available to export. Upload files first.')
      return
    }

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deduplicated')
    exportWorkbook(workbook, 'deduplicated-rows.xlsx')
  }

  const isReady = headerRow.length > 0 || processing

  return (
    <section className="tool-shell" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      
      {/* Header */}
      <div className="pdf-workspace-header" style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="pdf-workspace-kicker" style={{ color: 'var(--success)', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>Data Processing</span>
          <h2><FiLayers /> Remove Duplicate Rows</h2>
          <p>Upload your spreadsheets and remove repeated rows across sheets while preserving a single header row and data preview.</p>
        </div>
      </div>

      {!isReady ? (
        <div 
          className={`pdf-dropzone ${isDragActive ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true) }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          style={{ border: '2px dashed var(--accent)', background: isDragActive ? 'var(--accent-soft)' : 'var(--panel-bg)' }}
        >
          <div className="pdf-dropzone-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <FiUploadCloud />
          </div>
          <h3 style={{ margin: 0 }}>Drag and drop your spreadsheet</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Supports XLSX, CSV, XLSM</p>
          <label className="btn-primary" style={{ marginTop: '1rem', cursor: 'pointer' }}>
            Browse Files
            <input type="file" accept=".xlsx,.xlsm,.xlsb,.xls,.csv" multiple onChange={handleFiles} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          
          {/* Status & Export Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: processing ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)', color: processing ? 'var(--warning)' : 'var(--success)', borderRadius: '1rem' }}>
                {processing ? <FiAlertCircle size={24} /> : <FiBarChart2 size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{processing ? 'Processing Dataset...' : 'Processing Complete'}</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{feedback}</p>
              </div>
            </div>
            {!processing && rows.length > 0 && (
              <button type="button" className="btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success)' }}>
                <FiDownload /> Export Dataset
              </button>
            )}
          </div>

          {/* Dataset Summary */}
          {!processing && rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{fileCount}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Files Scanned</div>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{totalRows}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Rows Retained</div>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{headerRow.length}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Columns</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>{duplicateRows}</div>
                <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Duplicates Removed</div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {!processing && rows.length > 0 && (
            <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Data Preview</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing top 100 rows</span>
              </div>
              <div className="table-scroll" style={{ border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
                <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--panel-bg)' }}>
                      {headerRow.map((cell, index) => (
                        <th key={index} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                          {cell || `Column ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ background: rowIndex % 2 === 0 ? 'transparent' : 'var(--panel-bg)' }}>
                        {headerRow.map((_, cellIndex) => (
                          <td key={cellIndex} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            {row[cellIndex] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default RemoveDuplicateRowsTool
