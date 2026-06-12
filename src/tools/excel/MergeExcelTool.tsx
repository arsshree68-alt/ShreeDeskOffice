import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  exportCsv,
  exportWorkbook,
  formatBytes,
  getFileBaseName,
  getFileExtension,
  getHeaderRowIndex,
  parseCsvRows,
  parseWorksheetRows,
  readWorkbookFromFile,
  supportedFileExtensions,
} from './excelToolUtils'

interface FileInfo {
  id: string
  name: string
  size: number
  extension: string
  sheetCount: number
  rowCount: number
}

interface SheetInfo {
  id: string
  fileName: string
  sheetName: string
  rows: string[][]
  headerRowIndex: number
}

type MergeMode = 'alignColumns' | 'appendRows'
type KeepStrategy = 'first' | 'last' | 'all'
type ExportFormat = 'xlsx' | 'csv'

const createFileId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

const normalizeHeader = (header: string, index: number) => {
  const trimmed = header.trim()
  return trimmed || `Column ${index + 1}`
}

const normalizeDuplicateKey = (row: string[]) =>
  JSON.stringify(row.map((cell) => cell.trim().toLowerCase()))

const escapeCsvCell = (cell: string) => {
  const requiresQuotes = /[",\n\r]/.test(cell)
  const escaped = cell.replace(/"/g, '""')
  return requiresQuotes ? `"${escaped}"` : escaped
}

const buildCsv = (headers: string[], rows: string[][]) =>
  [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')

const readSheetsFromFile = async (file: File): Promise<SheetInfo[]> => {
  const extension = getFileExtension(file)
  const fileId = createFileId(file)

  if (extension === 'csv' || extension === 'tsv') {
    const rows = await parseCsvRows(file)
    return [{
      id: `${fileId}-csv`,
      fileName: file.name,
      sheetName: getFileBaseName(file),
      rows,
      headerRowIndex: getHeaderRowIndex(rows),
    }]
  }

  const workbook = await readWorkbookFromFile(file)
  return workbook.SheetNames.map((sheetName) => {
    const rows = parseWorksheetRows(workbook.Sheets[sheetName])
    return {
      id: `${fileId}-${sheetName}`,
      fileName: file.name,
      sheetName,
      rows,
      headerRowIndex: getHeaderRowIndex(rows),
    }
  })
}

const mergeSheets = (
  sheets: SheetInfo[],
  mergeMode: MergeMode,
  keepStrategy: KeepStrategy,
) => {
  const headerMap = new Map<string, number>()
  const orderedHeaders: string[] = []
  const rawRows: string[][] = []

  for (const sheet of sheets) {
    if (sheet.headerRowIndex < 0) continue

    const headerRow = sheet.rows[sheet.headerRowIndex].map(normalizeHeader)
    const dataRows = sheet.rows.slice(sheet.headerRowIndex + 1)

    if (mergeMode === 'appendRows' && orderedHeaders.length === 0) {
      headerRow.forEach((header) => orderedHeaders.push(header))
    }

    if (mergeMode === 'alignColumns') {
      headerRow.forEach((header) => {
        const key = header.toLowerCase()
        if (!headerMap.has(key)) {
          headerMap.set(key, orderedHeaders.length)
          orderedHeaders.push(header)
        }
      })
    }

    for (const row of dataRows) {
      if (!row.some((cell) => cell !== '')) continue

      if (mergeMode === 'appendRows') {
        rawRows.push(orderedHeaders.map((_, index) => row[index] ?? ''))
      } else {
        const outputRow = Array.from({ length: orderedHeaders.length }, () => '')
        headerRow.forEach((header, sourceIndex) => {
          const targetIndex = headerMap.get(header.toLowerCase())
          if (targetIndex !== undefined) {
            outputRow[targetIndex] = row[sourceIndex] ?? ''
          }
        })
        rawRows.push(outputRow)
      }
    }
  }

  if (keepStrategy === 'all') {
    return { headers: orderedHeaders, rows: rawRows, duplicateCount: 0 }
  }

  const seenRows = new Map<string, string[]>()
  let duplicateCount = 0

  for (const row of rawRows) {
    const key = normalizeDuplicateKey(row)
    if (seenRows.has(key)) {
      duplicateCount += 1
      if (keepStrategy === 'last') {
        seenRows.set(key, row)
      }
    } else {
      seenRows.set(key, row)
    }
  }

  return { headers: orderedHeaders, rows: Array.from(seenRows.values()), duplicateCount }
}

const MergeExcelTool = () => {
  const [filesProcessed, setFilesProcessed] = useState(0)
  const [totalRowsMerged, setTotalRowsMerged] = useState(0)
  const [duplicateRowsRemoved, setDuplicateRowsRemoved] = useState(0)
  const [headerRow, setHeaderRow] = useState<string[]>([])
  const [mergedRows, setMergedRows] = useState<string[][]>([])
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([])
  const [sheetInfos, setSheetInfos] = useState<SheetInfo[]>([])
  const [mergeMode, setMergeMode] = useState<MergeMode>('alignColumns')
  const [keepStrategy, setKeepStrategy] = useState<KeepStrategy>('first')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx')
  const [feedback, setFeedback] = useState('Upload Excel, CSV, or TSV files to begin the Merge Pro workflow.')
  const [processing, setProcessing] = useState(false)

  const previewRows = useMemo(
    () => mergedRows.slice(0, 100),
    [mergedRows],
  )

  const totalUploadedSize = useMemo(
    () => fileInfos.reduce((sum, file) => sum + file.size, 0),
    [fileInfos],
  )

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setProcessing(true)
    setFeedback('Reading uploaded files, detecting sheets, and preparing Merge Pro output...')
    const fileList = event.target.files
    if (!fileList?.length) {
      setProcessing(false)
      return
    }

    const files = Array.from(fileList).filter((file) =>
      supportedFileExtensions.includes(getFileExtension(file)),
    )

    if (files.length === 0) {
      setFeedback('No supported spreadsheet files found. Please upload XLSX, XLSM, XLSB, XLS, CSV, or TSV files.')
      setProcessing(false)
      return
    }

    try {
      const discoveredSheets: SheetInfo[] = []
      const discoveredFiles: FileInfo[] = []

      for (const file of files) {
        const sheets = await readSheetsFromFile(file)
        const nonEmptySheets = sheets.filter((sheet) => sheet.rows.length > 0)
        discoveredSheets.push(...nonEmptySheets)
        discoveredFiles.push({
          id: createFileId(file),
          name: file.name,
          size: file.size,
          extension: getFileExtension(file).toUpperCase(),
          sheetCount: nonEmptySheets.length,
          rowCount: nonEmptySheets.reduce((sum, sheet) => sum + Math.max(0, sheet.rows.length - 1), 0),
        })
      }

      const merged = mergeSheets(discoveredSheets, mergeMode, keepStrategy)

      setFileInfos(discoveredFiles)
      setSheetInfos(discoveredSheets)
      setFilesProcessed(discoveredFiles.length)
      setHeaderRow(merged.headers)
      setMergedRows(merged.rows)
      setTotalRowsMerged(merged.rows.length)
      setDuplicateRowsRemoved(merged.duplicateCount)
      setFeedback(`Merged ${merged.rows.length} rows from ${discoveredSheets.length} sheet(s) across ${discoveredFiles.length} file(s).`)
    } catch (error) {
      console.error(error)
      setFeedback('An error occurred while reading the files. Please check your Excel, CSV, or TSV files and try again.')
    } finally {
      setProcessing(false)
    }
  }

  const recomputeMerge = () => {
    if (sheetInfos.length === 0) return

    const merged = mergeSheets(sheetInfos, mergeMode, keepStrategy)
    setHeaderRow(merged.headers)
    setMergedRows(merged.rows)
    setTotalRowsMerged(merged.rows.length)
    setDuplicateRowsRemoved(merged.duplicateCount)
    setFeedback(`Rebuilt output with ${merged.rows.length} rows using ${mergeMode === 'alignColumns' ? 'aligned columns' : 'row append'} mode.`)
  }

  const handleExport = () => {
    if (!headerRow.length || mergedRows.length === 0) {
      setFeedback('No merged data available to export. Upload files first.')
      return
    }

    if (exportFormat === 'csv') {
      exportCsv(buildCsv(headerRow, mergedRows), 'merged-spreadsheet.csv')
      return
    }

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...mergedRows])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MergedData')
    exportWorkbook(workbook, 'merged-spreadsheet.xlsx')
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>Excel Merge Pro</h2>
          <p>
            Upload Excel workbooks, CSV files, and TSV exports; detect sheets and headers;
            align columns; remove duplicates; preview results; and export clean XLSX or CSV files.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Select Excel, CSV, or TSV files
          <input
            type="file"
            accept=".xlsx,.xlsm,.xlsb,.xls,.csv,.tsv"
            multiple
            onChange={handleFiles}
            disabled={processing}
          />
        </label>

        <label className="select-label">
          Merge mode
          <select value={mergeMode} onChange={(event) => setMergeMode(event.target.value as MergeMode)}>
            <option value="alignColumns">Align columns by header</option>
            <option value="appendRows">Append rows by position</option>
          </select>
        </label>

        <label className="select-label">
          Duplicates
          <select value={keepStrategy} onChange={(event) => setKeepStrategy(event.target.value as KeepStrategy)}>
            <option value="first">Remove duplicates, keep first</option>
            <option value="last">Remove duplicates, keep last</option>
            <option value="all">Keep all rows</option>
          </select>
        </label>

        <label className="select-label">
          Export
          <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
            <option value="xlsx">XLSX workbook</option>
            <option value="csv">CSV file</option>
          </select>
        </label>

        <button type="button" className="btn-secondary" onClick={recomputeMerge} disabled={processing || sheetInfos.length === 0}>
          Rebuild Output
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={processing || mergedRows.length === 0}
        >
          {processing ? 'Merging...' : `Export ${exportFormat.toUpperCase()}`}
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

      {fileInfos.length > 0 && (
        <div className="tool-preview">
          <h3>Uploaded files ({formatBytes(totalUploadedSize)})</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Sheets</th>
                  <th>Rows</th>
                </tr>
              </thead>
              <tbody>
                {fileInfos.map((file) => (
                  <tr key={file.id}>
                    <td>{file.name}</td>
                    <td>{file.extension}</td>
                    <td>{formatBytes(file.size)}</td>
                    <td>{file.sheetCount}</td>
                    <td>{file.rowCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
