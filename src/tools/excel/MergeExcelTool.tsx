import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

const supportedExtensions = ['xlsx', 'xlsm', 'xlsb', 'xls', 'csv']

const readWorkbook = (file: File): Promise<XLSX.WorkBook> => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const data = reader.result
        if (ext === 'csv') {
          const workbook = XLSX.read(data as string, { type: 'string' })
          resolve(workbook)
          return
        }

        const workbook = XLSX.read(data as ArrayBuffer, { type: 'array' })
        resolve(workbook)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)

    if (ext === 'csv') {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

const normalizeRow = (row: any[]) =>
  row.map((cell) => (cell === undefined || cell === null ? '' : String(cell).trim()))

const MergeExcelTool = () => {
  const [filesProcessed, setFilesProcessed] = useState(0)
  const [totalRowsMerged, setTotalRowsMerged] = useState(0)
  const [duplicateRowsRemoved, setDuplicateRowsRemoved] = useState(0)
  const [headerRow, setHeaderRow] = useState<string[]>([])
  const [mergedRows, setMergedRows] = useState<string[][]>([])
  const [feedback, setFeedback] = useState('Upload one or more spreadsheet files to begin merging.')
  const [processing, setProcessing] = useState(false)

  const previewRows = useMemo(
    () => mergedRows.slice(0, 100),
    [mergedRows],
  )

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setProcessing(true)
    setFeedback('Reading uploaded files and merging datasets...')
    const fileList = event.target.files
    if (!fileList?.length) {
      return
    }

    const files = Array.from(fileList)
      .filter((file) => supportedExtensions.includes(file.name.split('.').pop()?.toLowerCase() ?? ''))

    if (files.length === 0) {
      setFeedback('No supported spreadsheet files found. Please upload XLSX, XLSM, XLSB, XLS, or CSV files.')
      return
    }

    try {
      const headers: string[] = []
      const accumulatedRows: string[][] = []
      const rowSet = new Set<string>()
      let duplicateCount = 0

      for (const file of files) {
        const workbook = await readWorkbook(file)
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false })
          .map((row) => normalizeRow(row))
          .filter((row) => row.some((cell) => cell !== ''))

        if (rows.length === 0) {
          continue
        }

        const fileHeader = rows[0]
        if (headers.length === 0) {
          setHeaderRow(fileHeader)
          headers.push(...fileHeader)
        }

        const dataRows = rows.slice(1)
        for (const row of dataRows) {
          const rowString = JSON.stringify(row)
          if (rowSet.has(rowString)) {
            duplicateCount += 1
            continue
          }

          rowSet.add(rowString)
          accumulatedRows.push(row)
        }
      }

      setFilesProcessed(files.length)
      setTotalRowsMerged(accumulatedRows.length)
      setDuplicateRowsRemoved(duplicateCount)
      setMergedRows(accumulatedRows)
      setFeedback(`Merged ${accumulatedRows.length} rows from ${files.length} file(s).`)
    } catch (error) {
      console.error(error)
      setFeedback('An error occurred while reading the files. Please check your files and try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    if (!headerRow.length || mergedRows.length === 0) {
      setFeedback('No merged data available to export. Upload files first.')
      return
    }

    const workbook = XLSX.utils.book_new()
    const sheetData = [headerRow, ...mergedRows]
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MergedData')

    const workbookBinary = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    const blob = new Blob([workbookBinary], {
      type: 'application/octet-stream',
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'merged-spreadsheet.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>Excel Merge Tool</h2>
          <p>
            Upload multiple worksheets and CSV files, merge all rows with a single header,
            remove duplicates, preview the results, and export a clean XLSX file.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Select spreadsheet files
          <input
            type="file"
            accept=".xlsx,.xlsm,.xlsb,.xls,.csv"
            multiple
            onChange={handleFiles}
            disabled={processing}
          />
        </label>

        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={processing || mergedRows.length === 0}
        >
          {processing ? 'Merging...' : 'Export Merged XLSX'}
        </button>
      </div>

      <div className="tool-summary">
        <div className="summary-card">
          <span className="summary-label">Files processed</span>
          <strong>{filesProcessed}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Rows merged</span>
          <strong>{totalRowsMerged}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Duplicates removed</span>
          <strong>{duplicateRowsRemoved}</strong>
        </div>
      </div>

      <div className="tool-feedback">{feedback}</div>

      <div className="tool-preview">
        <h3>Preview (first {previewRows.length} rows)</h3>
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
              {previewRows.map((row, rowIndex) => (
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

export default MergeExcelTool
