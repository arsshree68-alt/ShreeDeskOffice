import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { FiUploadCloud, FiFileText, FiDownload, FiLayers, FiAlertCircle } from 'react-icons/fi'
import {
  exportWorkbook,
  getFileBaseName,
  getFileExtension,
  parseCsvRows,
  supportedCsvExtensions,
} from './excelToolUtils'

const CsvToXlsxConverter = () => {
  const [sheetData, setSheetData] = useState<Array<{ sheetName: string; rows: string[][] }>>([])
  const [feedback, setFeedback] = useState('Upload one or more CSV files to convert them to XLSX.')
  const [processing, setProcessing] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const firstSheet = useMemo(() => sheetData[0], [sheetData])
  const sheetCount = sheetData.length
  const fileCount = sheetData.length

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) =>
      supportedCsvExtensions.includes(getFileExtension(file)),
    )

    if (files.length === 0) {
      setFeedback('Please select CSV files only for conversion.')
      return
    }

    setProcessing(true)
    setFeedback('Converting CSV files...')

    try {
      const converted = await Promise.all(
        files.map(async (file) => {
          const rows = await parseCsvRows(file)
          const sheetName = getFileBaseName(file).slice(0, 31) || 'Sheet'
          return { sheetName, rows }
        }),
      )

      setSheetData(converted)
      setFeedback(`Prepared ${converted.length} worksheet(s) for XLSX export.`)
    } catch (error) {
      console.error(error)
      setFeedback('Unable to convert CSV files. Please verify the file contents.')
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
    if (!sheetData.length) {
      setFeedback('Upload CSV files first to create an XLSX workbook.')
      return
    }

    const workbook = XLSX.utils.book_new()
    sheetData.forEach(({ sheetName, rows }) => {
      const worksheet = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    exportWorkbook(workbook, 'converted-csv-to-xlsx.xlsx')
  }

  const isReady = sheetData.length > 0 || processing

  return (
    <section className="tool-shell" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      
      {/* Header */}
      <div className="pdf-workspace-header" style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="pdf-workspace-kicker" style={{ color: 'var(--success)', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>Data Processing</span>
          <h2><FiFileText /> CSV to XLSX Converter</h2>
          <p>Convert one or more CSV exports into a structured XLSX workbook with dedicated sheets for each source file.</p>
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
          <h3 style={{ margin: 0 }}>Drag and drop your CSV files</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Supports multiple CSV files</p>
          <label className="btn-primary" style={{ marginTop: '1rem', cursor: 'pointer' }}>
            Browse Files
            <input type="file" accept=".csv" multiple onChange={handleFiles} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          
          {/* Status & Export Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: processing ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)', color: processing ? 'var(--warning)' : 'var(--success)', borderRadius: '1rem' }}>
                {processing ? <FiAlertCircle size={24} /> : <FiLayers size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{processing ? 'Converting...' : 'Conversion Complete'}</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{feedback}</p>
              </div>
            </div>
            {!processing && sheetData.length > 0 && (
              <button type="button" className="btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success)' }}>
                <FiDownload /> Export XLSX
              </button>
            )}
          </div>

          {/* Dataset Summary */}
          {!processing && sheetData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{fileCount}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Files Loaded</div>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{sheetCount}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Sheets Prepared</div>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{firstSheet?.rows.length || 0}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '0.5rem' }}>Rows in Sheet 1</div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {!processing && firstSheet && (
            <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Preview of {firstSheet.sheetName}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing top 12 rows</span>
              </div>
              <div className="table-scroll" style={{ border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
                <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    {firstSheet.rows.slice(0, 12).map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ background: rowIndex % 2 === 0 ? 'transparent' : 'var(--panel-bg)' }}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: rowIndex === 0 ? 'var(--text)' : 'var(--text-muted)', fontWeight: rowIndex === 0 ? 600 : 400 }}>
                            {cell}
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

export default CsvToXlsxConverter
