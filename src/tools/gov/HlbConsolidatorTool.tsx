import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  readWorkbookFromFile,
  getFileExtension,
  normalizeRow,
  supportedFileExtensions,
} from '../../tools/excel/excelToolUtils'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface HlbFileInfo {
  id: string
  file: File
  fileName: string
  sizeLabel: string
  blockName: string   // editable label for the health/local block
  sheetNames: string[]
  selectedSheet: string
  rows: string[][]    // raw parsed rows
  headerRowIndex: number
}

type SummaryMode = 'append' | 'side-by-side'

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const getRowsForSheet = (wb: XLSX.WorkBook, sheetName: string): string[][] => {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false })
    .map((r) => normalizeRow(r))
    .filter((r) => r.some((c) => c !== ''))
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

const HlbConsolidatorTool = ({ onStepChange }: { onStepChange?: (step: number) => void }) => {
  /* ── Step 1: Upload ── */
  const [files, setFiles] = useState<HlbFileInfo[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  /* ── Step 2: Configure ── */
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('append')
  const [addBlockColumn, setAddBlockColumn] = useState(true)
  const [blockColumnLabel, setBlockColumnLabel] = useState('Block Name')
  const [outputFileName, setOutputFileName] = useState('HLB_Consolidated.xlsx')

  /* ── Step 3 / 4: Preview & Process ── */
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState<string>('Upload block-level spreadsheet files to begin.')
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])

  /* ── Step 5: Export ── */
  const [exportBlob, setExportBlob] = useState<{ xlsx: Blob; csv: string } | null>(null)

  const currentStep = useMemo(() => {
    if (processing) return 4
    if (exportBlob) return 5
    if (previewRows) return 3
    if (files.length > 0) return 2
    return 1
  }, [files, previewRows, processing, exportBlob])

  useEffect(() => {
    onStepChange?.(currentStep)
  }, [currentStep, onStepChange])

  /* ---------------------------------------------------------------- */
  /*  File ingestion                                                    */
  /* ---------------------------------------------------------------- */

  const ingestFiles = useCallback(async (rawFiles: File[]) => {
    setUploadError(null)
    const supported = rawFiles.filter((f) =>
      supportedFileExtensions.includes(getFileExtension(f)),
    )
    if (supported.length === 0) {
      setUploadError('No supported files found. Upload XLSX, XLS, CSV, or TSV files.')
      return
    }

    const infos: HlbFileInfo[] = []
    for (const file of supported) {
      try {
        const wb = await readWorkbookFromFile(file)
        const sheetNames = wb.SheetNames
        const selectedSheet = sheetNames[0] ?? ''
        const rows = getRowsForSheet(wb, selectedSheet)
        infos.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          fileName: file.name,
          sizeLabel: formatBytes(file.size),
          blockName: file.name.replace(/\.[^/.]+$/, ''),
          sheetNames,
          selectedSheet,
          rows,
          headerRowIndex: 0,
        })
      } catch {
        setUploadError(`Failed to read "${file.name}". File may be corrupt or password-protected.`)
      }
    }

    setFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id))
      return [...prev, ...infos.filter((f) => !existingIds.has(f.id))]
    })
    setExportBlob(null)
    setPreviewRows(null)
    setFeedback(`${infos.length} file(s) ready. Configure options below, then preview.`)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dt = e.dataTransfer
      ingestFiles(Array.from(dt.files))
    },
    [ingestFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) ingestFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    [ingestFiles],
  )

  // updateSheet handles sheet switching with async workbook reload
  const updateFileSync = useCallback((id: string, patch: Partial<HlbFileInfo>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const updateSheet = useCallback(async (id: string, sheetName: string) => {
    const fileInfo = files.find((f) => f.id === id)
    if (!fileInfo) return
    const wb = await readWorkbookFromFile(fileInfo.file)
    const rows = getRowsForSheet(wb, sheetName)
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selectedSheet: sheetName, rows, headerRowIndex: 0 } : f)),
    )
  }, [files])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setExportBlob(null)
    setPreviewRows(null)
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Build consolidated data                                          */
  /* ---------------------------------------------------------------- */

  const buildConsolidated = useCallback((): { headers: string[]; data: string[][] } => {
    if (files.length === 0) return { headers: [], data: [] }

    // Collect all unique headers across files
    const allHeaders = new Set<string>()
    const fileDatasets: { blockName: string; headers: string[]; dataRows: string[][] }[] = []

    for (const f of files) {
      const headerRow = f.rows[f.headerRowIndex] ?? []
      const dataRows = f.rows.slice(f.headerRowIndex + 1)
      const headers = headerRow.map((h, i) => h || `Column ${i + 1}`)
      headers.forEach((h) => allHeaders.add(h))
      fileDatasets.push({ blockName: f.blockName, headers, dataRows })
    }

    const finalHeaders: string[] = []
    if (addBlockColumn) finalHeaders.push(blockColumnLabel)
    finalHeaders.push(...allHeaders)

    const data: string[][] = []

    if (summaryMode === 'append') {
      for (const ds of fileDatasets) {
        for (const row of ds.dataRows) {
          const mapped: string[] = []
          if (addBlockColumn) mapped.push(ds.blockName)
          for (const h of allHeaders) {
            const colIndex = ds.headers.indexOf(h)
            mapped.push(colIndex >= 0 ? (row[colIndex] ?? '') : '')
          }
          data.push(mapped)
        }
      }
    } else {
      // side-by-side: one column group per block
      const sideBySideHeaders: string[] = []
      if (addBlockColumn) sideBySideHeaders.push(blockColumnLabel)
      for (const ds of fileDatasets) {
        ds.headers.forEach((h) => sideBySideHeaders.push(`${ds.blockName} — ${h}`))
      }
      const maxRows = Math.max(...fileDatasets.map((ds) => ds.dataRows.length))
      for (let i = 0; i < maxRows; i++) {
        const row: string[] = []
        if (addBlockColumn) row.push(i === 0 ? fileDatasets.map((d) => d.blockName).join(', ') : '')
        for (const ds of fileDatasets) {
          const sourceRow = ds.dataRows[i] ?? []
          ds.headers.forEach((_, ci) => row.push(sourceRow[ci] ?? ''))
        }
        data.push(row)
      }
    }

    return { headers: finalHeaders, data }
  }, [files, summaryMode, addBlockColumn, blockColumnLabel])

  /* ---------------------------------------------------------------- */
  /*  Preview                                                          */
  /* ---------------------------------------------------------------- */

  const handlePreview = useCallback(() => {
    const { headers, data } = buildConsolidated()
    setPreviewHeaders(headers)
    setPreviewRows(data.slice(0, 50))
    setExportBlob(null)
    setFeedback(`Preview shows first ${Math.min(data.length, 50)} of ${data.length} rows.`)
  }, [buildConsolidated])

  /* ---------------------------------------------------------------- */
  /*  Process                                                          */
  /* ---------------------------------------------------------------- */

  const handleProcess = useCallback(async () => {
    if (files.length === 0) {
      setFeedback('Upload at least one file before processing.')
      return
    }
    setProcessing(true)
    setFeedback('Building consolidated output…')

    try {
      await new Promise((r) => setTimeout(r, 50)) // yield to render
      const { headers, data } = buildConsolidated()
      const allRows = [headers, ...data]

      // Build XLSX
      const ws = XLSX.utils.aoa_to_sheet(allRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidated')
      const xlsxBinary = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const xlsxBlob = new Blob([xlsxBinary], { type: 'application/octet-stream' })

      // Build CSV
      const csv = allRows
        .map((row) => row.map((c: string) => (c.includes(',') || c.includes('"') || c.includes('\n') ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
        .join('\n')

      setExportBlob({ xlsx: xlsxBlob, csv })
      setPreviewHeaders(headers)
      setPreviewRows(data.slice(0, 50))
      setFeedback(`Done — ${data.length} rows consolidated from ${files.length} block file(s). Ready to export.`)
    } catch (err) {
      setFeedback(`Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setProcessing(false)
    }
  }, [files, buildConsolidated])

  /* ---------------------------------------------------------------- */
  /*  Export                                                           */
  /* ---------------------------------------------------------------- */

  const handleExportXlsx = useCallback(() => {
    if (!exportBlob) return
    const url = URL.createObjectURL(exportBlob.xlsx)
    const a = document.createElement('a')
    a.href = url
    a.download = outputFileName.endsWith('.xlsx') ? outputFileName : `${outputFileName}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportBlob, outputFileName])

  const handleExportCsv = useCallback(() => {
    if (!exportBlob) return
    const csvName = outputFileName.replace(/\.xlsx$/, '.csv')
    const blob = new Blob([exportBlob.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvName
    a.click()
    URL.revokeObjectURL(url)
  }, [exportBlob, outputFileName])

  /* ---------------------------------------------------------------- */
  /*  Derived UI state                                                 */
  /* ---------------------------------------------------------------- */

  const canProcess = files.length > 0 && !processing

  const totalRows = useMemo(
    () => files.reduce((sum, f) => sum + Math.max(0, f.rows.length - f.headerRowIndex - 1), 0),
    [files],
  )

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="hlb-tool">
      {/* ── Feedback bar ── */}
      {feedback && <p className="status-banner info hlb-feedback">{feedback}</p>}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 1 — UPLOAD                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="hlb-section">
        <h2 className="hlb-section-title"><span className="hlb-step-badge">1</span> Upload Block Files</h2>
        <p className="hlb-section-desc">
          Upload one spreadsheet per health/local block. Each file represents one block's data.
          Supported: XLSX, XLS, CSV, TSV.
        </p>

        <div
          className={`hlb-dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Drop spreadsheet files here or click to browse"
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('hlb-file-input')?.click()}
        >
          <span className="hlb-dropzone-icon">📂</span>
          <span className="hlb-dropzone-text">
            {dragging ? 'Drop files to upload…' : 'Drag block files here or click to browse'}
          </span>
          <label className="hlb-browse-btn">
            Browse Files
            <input
              id="hlb-file-input"
              type="file"
              multiple
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </label>
        </div>

        {uploadError && <p className="status-banner error" role="alert">{uploadError}</p>}

        {files.length > 0 && (
          <ul className="hlb-file-list">
            {files.map((f) => (
              <li key={f.id} className="hlb-file-item">
                <div className="hlb-file-meta">
                  <span className="hlb-file-name">{f.fileName}</span>
                  <span className="hlb-file-size">{f.sizeLabel} · {Math.max(0, f.rows.length - f.headerRowIndex - 1)} data rows</span>
                </div>
                <div className="hlb-file-controls">
                  <label className="hlb-inline-label">
                    Block label
                    <input
                      type="text"
                      className="hlb-inline-input"
                      value={f.blockName}
                      onChange={(e) => updateFileSync(f.id, { blockName: e.target.value })}
                      placeholder="Block name"
                    />
                  </label>
                  {f.sheetNames.length > 1 && (
                    <label className="hlb-inline-label">
                      Sheet
                      <select
                        className="hlb-inline-select"
                        value={f.selectedSheet}
                        onChange={(e) => updateSheet(f.id, e.target.value)}
                      >
                        {f.sheetNames.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="hlb-inline-label">
                    Header row
                    <input
                      type="number"
                      className="hlb-inline-input"
                      style={{ width: '4rem' }}
                      min={1}
                      max={f.rows.length}
                      value={f.headerRowIndex + 1}
                      onChange={(e) => updateFileSync(f.id, { headerRowIndex: Math.max(0, Number(e.target.value) - 1) })}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="hlb-remove-btn"
                  onClick={() => removeFile(f.id)}
                  aria-label={`Remove ${f.fileName}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 2 — CONFIGURE                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="hlb-section">
        <h2 className="hlb-section-title"><span className="hlb-step-badge">2</span> Configure Output</h2>

        <div className="hlb-config-grid">
          <label className="hlb-config-label">
            Consolidation mode
            <select
              className="hlb-config-select"
              value={summaryMode}
              onChange={(e) => setSummaryMode(e.target.value as SummaryMode)}
            >
              <option value="append">Append rows (all blocks in one sheet)</option>
              <option value="side-by-side">Side-by-side (block columns)</option>
            </select>
          </label>

          <label className="hlb-config-label">
            Output file name
            <input
              type="text"
              className="hlb-config-input"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              placeholder="HLB_Consolidated.xlsx"
            />
          </label>

          <label className="hlb-config-label hlb-config-checkbox">
            <input
              type="checkbox"
              checked={addBlockColumn}
              onChange={(e) => setAddBlockColumn(e.target.checked)}
            />
            Add block identifier column
          </label>

          {addBlockColumn && (
            <label className="hlb-config-label">
              Block column header
              <input
                type="text"
                className="hlb-config-input"
                value={blockColumnLabel}
                onChange={(e) => setBlockColumnLabel(e.target.value)}
                placeholder="Block Name"
              />
            </label>
          )}
        </div>

        {files.length > 0 && (
          <div className="hlb-stats-row">
            <span><strong>{files.length}</strong> block files</span>
            <span><strong>{totalRows}</strong> total data rows</span>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 3 — PREVIEW                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="hlb-section">
        <h2 className="hlb-section-title"><span className="hlb-step-badge">3</span> Preview</h2>
        <button
          type="button"
          className="hlb-btn hlb-btn-secondary"
          onClick={handlePreview}
          disabled={files.length === 0}
        >
          Generate Preview
        </button>

        {previewRows && (
          <div className="hlb-preview-wrap">
            <p className="hlb-preview-note">
              Showing first {previewRows.length} rows · {previewHeaders.length} columns
            </p>
            <div className="hlb-table-scroll">
              <table className="hlb-table">
                <thead>
                  <tr>
                    <th className="hlb-th-row">#</th>
                    {previewHeaders.map((h, i) => <th key={i}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri}>
                      <td className="hlb-td-row" data-label="#">{ri + 1}</td>
                      {previewHeaders.map((h, ci) => <td key={ci} data-label={h}>{row[ci] ?? ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 4 — PROCESS                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="hlb-section">
        <h2 className="hlb-section-title"><span className="hlb-step-badge">4</span> Process</h2>
        <button
          type="button"
          className="hlb-btn hlb-btn-primary"
          onClick={handleProcess}
          disabled={!canProcess}
        >
          {processing ? 'Processing…' : 'Run Consolidation'}
        </button>
        {processing && <div className="hlb-processing-bar"><div className="hlb-processing-fill" /></div>}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 5 — EXPORT                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="hlb-section">
        <h2 className="hlb-section-title"><span className="hlb-step-badge">5</span> Export</h2>
        {exportBlob ? (
          <div className="hlb-export-row">
            <button type="button" className="hlb-btn hlb-btn-primary" onClick={handleExportXlsx}>
              ⬇ Download XLSX
            </button>
            <button type="button" className="hlb-btn hlb-btn-secondary" onClick={handleExportCsv}>
              ⬇ Download CSV
            </button>
          </div>
        ) : (
          <p className="hlb-export-hint">Run consolidation above to enable export.</p>
        )}
      </section>
    </div>
  )
}

export default HlbConsolidatorTool
