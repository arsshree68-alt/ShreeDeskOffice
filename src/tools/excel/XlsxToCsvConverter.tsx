import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  exportCsv,
  getFileExtension,
  readWorkbookFromFile,
  supportedExcelExtensions,
} from './excelToolUtils'

const XlsxToCsvConverter = () => {
  const [results, setResults] = useState<{ fileName: string; csv: string; headers: string[]; rows: string[][] }[]>([])
  const [feedback, setFeedback] = useState('Upload an Excel workbook to convert its first worksheet into CSV.')
  const [processing, setProcessing] = useState(false)

  const firstResult = useMemo(() => results[0], [results])

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList?.length) return

    const files = Array.from(fileList).filter((file) =>
      supportedExcelExtensions.includes(getFileExtension(file)),
    )

    if (files.length === 0) {
      setFeedback('Please select a supported Excel file format (XLSX, XLSM, XLSB, XLS).')
      return
    }

    setProcessing(true)
    setFeedback('Reading workbook and converting sheets to CSV...')

    try {
      const converted: typeof results = []

      for (const file of files) {
        const workbook = await readWorkbookFromFile(file)
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false })
          .map((row) => row.map((cell) => (cell === undefined || cell === null ? '' : String(cell))))

        const csv = XLSX.utils.sheet_to_csv(sheet)
        converted.push({ fileName: `${file.name.replace(/\.[^/.]+$/, '')}.csv`, csv, headers: rows[0] ?? [], rows })
      }

      setResults(converted)
      setFeedback(`Converted ${converted.length} workbook(s) to CSV format.`)
    } catch (error) {
      console.error(error)
      setFeedback('Unable to convert workbook. Please verify the file and try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = (result: typeof results[number]) => {
    exportCsv(result.csv, result.fileName)
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>XLSX to CSV Converter</h2>
          <p>
            Convert Excel workbooks into CSV files. Each uploaded workbook exports its first worksheet
            as a downloadable CSV.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Upload Excel workbook
          <input
            type="file"
            accept=".xlsx,.xlsm,.xlsb,.xls"
            multiple
            onChange={handleFiles}
          />
        </label>
      </div>

      <div className="tool-status-row">
        <span>{processing ? 'Converting workbook to CSV...' : feedback}</span>
      </div>

      {results.length > 0 && (
        <div className="tool-summary">
          <div className="summary-card">
            <span className="summary-label">Workbooks converted</span>
            <strong>{results.length}</strong>
          </div>
        </div>
      )}

      {results.map((result) => (
        <div key={result.fileName} className="download-panel">
          <div>
            <strong>{result.fileName}</strong>
            <p>{result.rows.length - 1} rows, {result.headers.length} columns</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => handleDownload(result)}>
            Download CSV
          </button>
        </div>
      ))}

      {firstResult && (
        <div className="tool-preview">
          <h3>Preview of {firstResult.fileName}</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  {firstResult.headers.map((cell, index) => (
                    <th key={index}>{cell || `Column ${index + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {firstResult.rows.slice(1, 12).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {firstResult.headers.map((_, cellIndex) => (
                      <td key={cellIndex}>{row[cellIndex] ?? ''}</td>
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

export default XlsxToCsvConverter
