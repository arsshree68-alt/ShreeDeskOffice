import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { DatasetSummary } from '../../components/ui/DatasetSummary'
import PdfFileDropzone from '../../components/pdf/PdfFileDropzone'
import {
  exportCsv,
  exportWorkbook,
  getFileExtension,
  normalizeRow,
  parseCsvRows,
  readWorkbookFromFile,
  supportedFileExtensions,
} from './excelToolUtils'

// Types used by the Merge tool
type SheetInfo = {
  name: string
  rows: string[][]
  selected: boolean
}

type FileInfo = {
  id: string
  file: File
  fileName: string
  sizeLabel: string
  ext: string
  sheets: SheetInfo[]
}

type MergeMode = 'none' | 'full' | 'selected'
type KeepStrategy = 'first' | 'last'

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

const getHeaderRowIndex = (rows: string[][], option: 'auto' | number) => {
  if (option === 'auto') {
    const found = rows.findIndex((row) => row.some((cell) => cell !== ''))
    return found >= 0 ? found : 0
  }

  return Math.max(0, Math.min(option - 1, rows.length - 1))
}

const MergeExcelTool = () => {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState('Upload spreadsheet files or drag them into the merge area to begin.')
  // global headers are derived from availableHeaders (computed below)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [headerRowOption, setHeaderRowOption] = useState<'auto' | 1 | 2 | 3 | 4 | 'custom'>('auto')
  const [customHeaderRow, setCustomHeaderRow] = useState(1)
  const [dataStartOption, setDataStartOption] = useState<'auto' | 1 | 2 | 3 | 4 | 'custom'>('auto')
  const [customStartRow, setCustomStartRow] = useState(2)
  const [endRowOption, setEndRowOption] = useState<'all' | 'custom'>('all')
  const [customEndRow, setCustomEndRow] = useState(0)
  const [duplicateMode, setDuplicateMode] = useState<MergeMode>('none')
  const [duplicateColumns, setDuplicateColumns] = useState<string[]>([])
  const [keepStrategy, setKeepStrategy] = useState<KeepStrategy>('first')
  const [mergedRows, setMergedRows] = useState<string[][]>([])
  const [outputHeaders, setOutputHeaders] = useState<string[]>([])
  const [stats, setStats] = useState({ filesProcessed: 0, rowsMerged: 0, rowsSkipped: 0, duplicatesRemoved: 0 })

  const selectedSheetRows = useMemo(() => {
    const rows: string[][][] = []

    files.forEach((file) => {
      file.sheets
        .filter((sheet) => sheet.selected)
        .forEach((sheet) => rows.push(sheet.rows))
    })

    return rows
  }, [files])

  const previewRows = useMemo(() => mergedRows.slice(0, 100), [mergedRows])

  const createFileId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

  const parseHeaderRowOptionValue = (v: string): 'auto' | 1 | 2 | 3 | 4 | 'custom' => {
    if (v === 'auto' || v === 'custom') return v as 'auto' | 'custom'
    const n = Number(v)
    if ([1, 2, 3, 4].includes(n)) return n as 1 | 2 | 3 | 4
    return 'auto'
  }

  const loadFiles = async (fileList: File[]) => {
    const supportedFiles = fileList.filter((file) =>
      supportedFileExtensions.includes(getFileExtension(file)),
    )

    if (supportedFiles.length === 0) {
      setFeedback('No supported spreadsheet files found. Upload XLSX, XLSM, XLSB, XLS, CSV, or TSV files.')
      return
    }

    setProcessing(true)
    setFeedback('Reading file structure and sheet previews...')

    try {
      const fileInfoPromises = supportedFiles.map(async (file) => {
        const ext = getFileExtension(file)
        const sizeLabel = formatBytes(file.size)
        let sheets: SheetInfo[] = []
        if (ext === 'csv' || ext === 'tsv') {
          const rows = await parseCsvRows(file, ext === 'tsv' ? '\t' : ',')
          sheets = [{ name: 'Sheet1', rows, selected: true }]
        } else {
          const workbook = await readWorkbookFromFile(file)
          sheets = workbook.SheetNames.map((sheetName) => ({
            name: sheetName,
            rows: XLSX.utils
              .sheet_to_json<string[]>(workbook.Sheets[sheetName], { header: 1, raw: false })
              .map((row) => normalizeRow(row)),
            selected: true,
          }))
        }

        return {
          id: createFileId(file),
          file,
          fileName: file.name,
          sizeLabel,
          ext,
          sheets,
        }
      })

      const loadedFiles = await Promise.all(fileInfoPromises)

      // compute available headers from loaded files' selected sheets
      const headers = buildHeaderUnion(
        loadedFiles.flatMap((f) => f.sheets.filter((s) => s.selected).map((s) => s.rows)),
      )

      setFiles(loadedFiles)
      setSelectedColumns((previous) => (previous.length === 0 ? headers : previous.filter((c) => headers.includes(c))))
      setColumnMap((previous) => {
        const next: Record<string, string> = {}
        headers.forEach((header) => {
          next[header] = previous[header] ?? header
        })
        return next
      })

      setFeedback('Files loaded. Use the merge controls to configure the result.')
    } catch (error) {
      console.error(error)
      setFeedback('Unable to read one or more files. Please confirm they are valid spreadsheets.')
    } finally {
      setProcessing(false)
    }
  }

  const handleInputFiles = async (fileList: File[]) => {
    if (!fileList?.length) return
    await loadFiles(Array.from(fileList))
  }



  const toggleSheetSelection = (fileId: string, sheetName: string) => {
    setFiles((previous) =>
      previous.map((file) =>
        file.id !== fileId
          ? file
          : {
              ...file,
              sheets: file.sheets.map((sheet) =>
                sheet.name !== sheetName ? sheet : { ...sheet, selected: !sheet.selected },
              ),
            },
      ),
    )
  }

  function buildHeaderUnion(rowsBySheet: string[][][]) {
    const headerSet = new Set<string>()
    rowsBySheet.forEach((sheetRows) => {
      const resolvedHeaderRow =
        headerRowOption === 'auto'
          ? 'auto'
          : headerRowOption === 'custom'
          ? customHeaderRow
          : (headerRowOption as number)
      const headerRow = sheetRows[getHeaderRowIndex(sheetRows, resolvedHeaderRow)] || []
      headerRow.forEach((cell) => headerSet.add(cell || ''))
    })
    return Array.from(headerSet).filter((cell) => cell !== '')
  }

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const availableHeaders = useMemo(() => buildHeaderUnion(selectedSheetRows), [selectedSheetRows])

  useEffect(() => {
    if (availableHeaders.length > 0) {
      setSelectedColumns((previous) =>
        previous.length === 0 ? availableHeaders : previous.filter((column) => availableHeaders.includes(column)),
      )

      setColumnMap((previous) => {
        const next: Record<string, string> = {}
        availableHeaders.forEach((header) => {
          next[header] = previous[header] ?? header
        })
        return next
      })
    }
  }, [availableHeaders])

  const runMerge = async () => {
    if (selectedSheetRows.length === 0) {
      setFeedback('Please upload files and select the sheets you want to merge.')
      return
    }

    setProcessing(true)
    setFeedback('Merging rows with your selected configuration...')

    try {
      const globalHeader = availableHeaders
      if (globalHeader.length === 0) {
        setFeedback('Unable to detect headers from selected sheets. Please verify the files and header row selection.')
        setProcessing(false)
        return
      }

      const selectedColumnsList = selectedColumns.length > 0 ? selectedColumns : globalHeader
      const mappedHeaders = selectedColumnsList.map((column) => columnMap[column] || column)
      setOutputHeaders(mappedHeaders)

      const seen = new Map<string, number>()
      const merged: string[][] = []
      let duplicates = 0
      let skipped = 0

      for (const file of files) {
        for (const sheet of file.sheets.filter((item) => item.selected)) {
          const rows = sheet.rows
          const headerIndex = getHeaderRowIndex(rows, headerRowOption === 'auto' ? 'auto' : headerRowOption === 'custom' ? customHeaderRow : (headerRowOption as number))
          const dataStartIndex =
            dataStartOption === 'auto'
              ? Math.max(headerIndex + 1, 0)
              : dataStartOption === 'custom'
              ? Math.max((customStartRow || 1) - 1, 0)
              : Math.max((dataStartOption as number) - 1, 0)
          const endIndex = endRowOption === 'custom' && customEndRow > 0 ? Math.min(customEndRow - 1, rows.length - 1) : rows.length - 1
          const rawHeader = rows[headerIndex] || []

          for (let rowIndex = dataStartIndex; rowIndex <= endIndex; rowIndex += 1) {
            const row = rows[rowIndex] || []
            if (row.every((cell) => cell === '')) {
              skipped += 1
              continue
            }


            const rowObject = globalHeader.reduce<Record<string, string>>((acc, header) => {
              const columnIndex = rawHeader.findIndex((value) => value === header)
              acc[header] = row[columnIndex] ?? ''
              return acc
            }, {})

            const outputRow = selectedColumnsList.map((column) => rowObject[column] ?? '')
            const duplicateKey =
              duplicateMode === 'full'
                ? JSON.stringify(outputRow)
                : duplicateMode === 'selected' && duplicateColumns.length > 0
                ? JSON.stringify(duplicateColumns.map((column) => rowObject[column] ?? ''))
                : ''

            if (duplicateMode !== 'none' && duplicateKey) {
              if (seen.has(duplicateKey)) {
                duplicates += 1
                if (keepStrategy === 'last') {
                  const existingIndex = seen.get(duplicateKey) as number
                  merged[existingIndex] = outputRow
                }
                continue
              }
              seen.set(duplicateKey, merged.length)
            }

            merged.push(outputRow)
          }
        }
      }

      setMergedRows(merged)
      setStats({
        filesProcessed: files.length,
        rowsMerged: merged.length,
        rowsSkipped: skipped,
        duplicatesRemoved: duplicates,
      })
      setFeedback(`Merged ${merged.length} rows from ${files.length} file(s). Preview the first 100 rows below.`)
    } catch (error) {
      console.error(error)
      setFeedback('Merge failed due to invalid file contents or settings. Please adjust and try again.')
    } finally {
      setProcessing(false)
    }
  }

  const exportResult = (format: 'xlsx' | 'csv') => {
    if (!outputHeaders.length || mergedRows.length === 0) {
      setFeedback('No merged output is available. Run the merge first, then export.')
      return
    }

    const sheetData = [outputHeaders, ...mergedRows]
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MergedData')
      exportWorkbook(workbook, 'merged-data.xlsx')
      return
    }

    const csv = XLSX.utils.sheet_to_csv(worksheet)
    exportCsv(csv, 'merged-data.csv')
  }

  const toggleColumn = (column: string) => {
    setSelectedColumns((previous) =>
      previous.includes(column) ? previous.filter((item) => item !== column) : [...previous, column],
    )
  }

  const updateColumnMap = (column: string, value: string) => {
    setColumnMap((previous) => ({ ...previous, [column]: value }))
  }

  const allSelected = selectedColumns.length === availableHeaders.length && availableHeaders.length > 0

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>Excel Merge Tool</h2>
          <p>
            Combine spreadsheets from XLSX, XLSM, XLSB, XLS, CSV, or TSV into a single merged
            dataset with header selection, column mapping, duplicate controls, preview, and export.
          </p>
        </div>
      </div>

      <div className="tool-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <PdfFileDropzone mode="excel" multiple={true} disabled={processing} onFilesSelected={handleInputFiles} />
        <button type="button" className="btn-primary" onClick={runMerge} disabled={processing || files.length === 0} style={{ width: 'max-content' }}>
          {processing ? 'Processing...' : 'Run Merge'}
        </button>
      </div>

      {files.length > 0 && (
        <div style={{ background: '#f8f9fa', border: '1px solid #e4e0d9', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#1F1B16' }}>
            📋 Files Loaded — Pre-merge Summary
          </h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {files.map((f, i) => {
              const totalRows = f.sheets.filter(s => s.selected).reduce((sum, s) => sum + Math.max(0, s.rows.length - 1), 0)
              return (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '6px', border: '1px solid #e4e0d9', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 500 }}>File {i+1}: {f.fileName}</span>
                  <span style={{ color: '#6b6459' }}>~{totalRows} data rows · {f.sizeLabel}</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.85rem', color: '#2e7d32', fontWeight: 600 }}>
            ✅ Estimated total: ~{files.reduce((sum, f) => sum + f.sheets.filter(s => s.selected).reduce((s2, sh) => s2 + Math.max(0, sh.rows.length - 1), 0), 0)} rows from {files.length} file(s)
          </div>
        </div>
      )}

      <div className="tool-summary">
        <div className="summary-card">
          <span className="summary-label">Files processed</span>
          <strong>{stats.filesProcessed}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Rows merged</span>
          <strong>{stats.rowsMerged}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Rows skipped</span>
          <strong>{stats.rowsSkipped}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Duplicates removed</span>
          <strong>{stats.duplicatesRemoved}</strong>
        </div>
      </div>

      {mergedRows.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0', alignItems: 'center', padding: '1rem', background: '#e8f5e9', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2e7d32', flex: 1 }}>✅ Merge complete — {stats.rowsMerged} rows ready</span>
          <button type="button" className="btn-primary" onClick={() => exportResult('xlsx')} disabled={processing}>Export XLSX</button>
          <button type="button" className="btn-primary" onClick={() => exportResult('csv')} disabled={processing}>Export CSV</button>
        </div>
      )}

      <div className="tool-status-row">{feedback}</div>

      {files.length > 0 && (
        <div className="control-row">
          <div className="select-label">
            <span>Header row</span>
            <select
              value={headerRowOption}
              onChange={(event) => setHeaderRowOption(parseHeaderRowOptionValue(event.target.value))}
              aria-label="Header row selection"
            >
              <option value="auto">Auto detect</option>
              <option value={1}>Row 1</option>
              <option value={2}>Row 2</option>
              <option value={3}>Row 3</option>
              <option value={4}>Row 4</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {headerRowOption === 'custom' && (
            <div className="select-label">
              <span>Custom header row</span>
              <input
                type="number"
                min={1}
                value={customHeaderRow}
                onChange={(event) => setCustomHeaderRow(Number(event.target.value))}
                aria-label="Custom header row"
              />
            </div>
          )}

          <div className="select-label">
            <span>Start data row</span>
            <select
              value={dataStartOption}
              onChange={(event) => setDataStartOption(parseHeaderRowOptionValue(event.target.value))}
              aria-label="Start data row selection"
            >
              <option value="auto">Auto</option>
              <option value={1}>Row 1</option>
              <option value={2}>Row 2</option>
              <option value={3}>Row 3</option>
              <option value={4}>Row 4</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {dataStartOption === 'custom' && (
            <div className="select-label">
              <span>Custom start row</span>
              <input
                type="number"
                min={1}
                value={customStartRow}
                onChange={(event) => setCustomStartRow(Number(event.target.value))}
                aria-label="Custom start row"
              />
            </div>
          )}

          <div className="select-label">
            <span>End row</span>
            <select
              value={endRowOption}
              onChange={(event) => setEndRowOption(event.target.value === 'custom' ? 'custom' : 'all')}
              aria-label="End row selection"
            >
              <option value="all">All rows</option>
              <option value="custom">Custom end row</option>
            </select>
          </div>

          {endRowOption === 'custom' && (
            <div className="select-label">
              <span>Custom end row</span>
              <input
                type="number"
                min={1}
                value={customEndRow}
                onChange={(event) => setCustomEndRow(Number(event.target.value))}
                aria-label="Custom end row"
              />
            </div>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="tool-preview">
          <h3>Files & sheets</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Sheet</th>
                  <th>Size</th>
                  <th>Include</th>
                </tr>
              </thead>
              <tbody>
                {files.flatMap((file) =>
                  file.sheets.map((sheet) => (
                    <tr key={`${file.id}-${sheet.name}`}>
                      <td>{file.fileName}</td>
                      <td>{sheet.name}</td>
                      <td>{file.sizeLabel}</td>
                      <td>
                        <label>
                          <input
                            type="checkbox"
                            checked={sheet.selected}
                            onChange={() => toggleSheetSelection(file.id, sheet.name)}
                            aria-label={`Include sheet ${sheet.name} from file ${file.fileName}`}
                          />
                          <span>Include</span>
                        </label>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {availableHeaders.length > 0 && (
        <div className="tool-preview">
          <h3>Columns & mapping</h3>
          <p className="tool-status-row">Choose which columns to keep and rename columns for the merged result.</p>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Keep</th>
                  <th>Column</th>
                  <th>Mapped output name</th>
                </tr>
              </thead>
              <tbody>
                {availableHeaders.map((column) => (
                  <tr key={column}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedColumns.length === 0 ? true : selectedColumns.includes(column)}
                        onChange={() => toggleColumn(column)}
                        aria-label={`Select column ${column}`}
                      />
                    </td>
                    <td>{column}</td>
                    <td>
                      <input
                        type="text"
                        value={columnMap[column] ?? column}
                        onChange={(event) => updateColumnMap(column, event.target.value)}
                        aria-label={`Rename column ${column}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSelectedColumns(allSelected ? [] : [...availableHeaders])}
          >
            {allSelected ? 'Clear all columns' : 'Select all columns'}
          </button>
        </div>
      )}

      {availableHeaders.length > 0 && (
        <div className="control-row">
          <div className="select-label">
            <span>Duplicate detection</span>
            <select
              value={duplicateMode}
              onChange={(event) => setDuplicateMode(event.target.value as MergeMode)}
              aria-label="Duplicate detection mode"
            >
              <option value="none">No duplicate removal</option>
              <option value="full">Exact row duplicate</option>
              <option value="selected">Selected columns duplicate</option>
            </select>
          </div>

          {duplicateMode === 'selected' && (
            <div className="select-label">
              <span>Duplicate columns</span>
              <select
                multiple
                value={duplicateColumns}
                onChange={(event) =>
                  setDuplicateColumns(Array.from(event.target.selectedOptions, (option) => option.value))
                }
                aria-label="Duplicate key columns"
              >
                {availableHeaders.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="select-label">
            <span>Keep</span>
            <select
              value={keepStrategy}
              onChange={(event) => setKeepStrategy(event.target.value as KeepStrategy)}
              aria-label="Keep duplicate row strategy"
            >
              <option value="first">First occurrence</option>
              <option value="last">Last occurrence</option>
            </select>
          </div>
        </div>
      )}

      {mergedRows.length > 0 && (
        <div className="tool-preview">
          <h3>Preview merged output</h3>
          <DatasetSummary headers={outputHeaders} rows={mergedRows} />
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  {outputHeaders.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((value, cellIndex) => (
                      <td key={cellIndex} data-label={outputHeaders[cellIndex]}>{value}</td>
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

export default MergeExcelTool
