import { useState } from 'react'
import * as XLSX from 'xlsx'
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

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList?.length) return

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

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>Remove Duplicate Rows</h2>
          <p>
            Upload your spreadsheets and remove repeated rows across sheets while preserving a
            single header row and data preview.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Upload spreadsheet files
          <input
            type="file"
            accept=".xlsx,.xlsm,.xlsb,.xls,.csv"
            multiple
            onChange={handleFiles}
          />
        </label>
        <button type="button" className="btn-primary" onClick={handleExport} disabled={processing}>
          Export Deduplicated XLSX
        </button>
      </div>

      <div className="tool-status-row">
        <span>{processing ? 'Scanning files and deduplicating data...' : feedback}</span>
      </div>

      <div className="tool-summary">
        <div className="summary-card">
          <span className="summary-label">Files scanned</span>
          <strong>{fileCount}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Rows retained</span>
          <strong>{totalRows}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Duplicates removed</span>
          <strong>{duplicateRows}</strong>
        </div>
      </div>

      <div className="tool-preview">
        <h3>Preview</h3>
        <div className="table-scroll">
          <table className="preview-table">
            <thead>
              <tr>
                {headerRow.map((cell, index) => (
                  <th key={index}>{cell || `Column ${index + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headerRow.map((_, cellIndex) => (
                    <td key={cellIndex}>{row[cellIndex] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default RemoveDuplicateRowsTool
