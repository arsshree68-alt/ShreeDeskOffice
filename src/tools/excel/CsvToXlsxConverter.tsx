import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
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

  const firstSheet = useMemo(() => sheetData[0], [sheetData])
  const sheetCount = sheetData.length
  const fileCount = sheetData.length

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList?.length) return

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

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>CSV to XLSX Converter</h2>
          <p>
            Convert one or more CSV exports into a structured XLSX workbook with dedicated
            sheets for each source file.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Upload CSV files
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFiles}
          />
        </label>
        <button type="button" className="btn-primary" onClick={handleExport} disabled={processing}>
          Export XLSX
        </button>
      </div>

      <div className="tool-status-row">
        <span>{processing ? 'Converting CSV files into workbook format...' : feedback}</span>
      </div>

      <div className="tool-summary">
        <div className="summary-card">
          <span className="summary-label">Files loaded</span>
          <strong>{fileCount}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Sheets prepared</span>
          <strong>{sheetCount}</strong>
        </div>
      </div>

      {firstSheet && (
        <div className="tool-preview">
          <h3>Preview of {firstSheet.sheetName}</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <tbody>
                {firstSheet.rows.slice(0, 12).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default CsvToXlsxConverter
