import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exportCsv, getFileExtension, parseCsvRows, parseWorksheetRows, readWorkbookFromFile, supportedExcelExtensions, supportedCsvExtensions } from './excelToolUtils'

const CrosstabGenerator = () => {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [rowField, setRowField] = useState('')
  const [columnField, setColumnField] = useState('')
  const [crosstab, setCrosstab] = useState<Record<string, Record<string, number>>>({})
  const [rowCategories, setRowCategories] = useState<string[]>([])
  const [columnCategories, setColumnCategories] = useState<string[]>([])
  const [feedback, setFeedback] = useState('Upload a file and select two fields to build a crosstab.')
  const [processing, setProcessing] = useState(false)

  const previewRows = useMemo(() => rows.slice(0, 12), [rows])

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList?.length) return

    const file = fileList[0]
    const ext = getFileExtension(file)

    if (![...supportedExcelExtensions, ...supportedCsvExtensions].includes(ext)) {
      setFeedback('Please upload a CSV or Excel file to generate a crosstab.')
      return
    }

    setProcessing(true)
    setFeedback('Loading file for crosstab analysis...')

    try {
      let workbookRows: string[][] = []
      if (ext === 'csv') {
        workbookRows = await parseCsvRows(file)
      } else {
        const workbook = await readWorkbookFromFile(file)
        workbookRows = parseWorksheetRows(workbook.Sheets[workbook.SheetNames[0]])
      }

      if (workbookRows.length === 0) {
        setFeedback('The selected file contains no rows.')
        setRows([])
        setHeaders([])
        return
      }

      setHeaders(workbookRows[0])
      setRows(workbookRows.slice(1))
      setRowField(workbookRows[0][0] ?? '')
      setColumnField(workbookRows[0][1] ?? '')
      setFeedback('Choose row and column fields for the crosstab.')
    } catch (error) {
      console.error(error)
      setFeedback('Unable to parse the workbook. Please try a different file.')
    } finally {
      setProcessing(false)
    }
  }

  const buildCrosstab = () => {
    if (!rowField || !columnField) {
      setFeedback('Please choose both a row field and a column field.')
      return
    }

    const rowIndex = headers.indexOf(rowField)
    const columnIndex = headers.indexOf(columnField)
    if (rowIndex === -1 || columnIndex === -1) {
      setFeedback('Selected fields are invalid for this dataset.')
      return
    }

    const cellMap: Record<string, Record<string, number>> = {}
    const rowValues = new Set<string>()
    const columnValues = new Set<string>()

    rows.forEach((row) => {
      const rowValue = row[rowIndex] ?? '(blank)'
      const columnValue = row[columnIndex] ?? '(blank)'
      rowValues.add(rowValue)
      columnValues.add(columnValue)
      cellMap[rowValue] = cellMap[rowValue] ?? {}
      cellMap[rowValue][columnValue] = (cellMap[rowValue][columnValue] ?? 0) + 1
    })

    const rowList = Array.from(rowValues).sort()
    const columnList = Array.from(columnValues).sort()

    setCrosstab(cellMap)
    setRowCategories(rowList)
    setColumnCategories(columnList)
    setFeedback(`Built crosstab for ${rowField} by ${columnField}.`)
  }

  const handleExport = () => {
    if (!rowCategories.length || !columnCategories.length) {
      setFeedback('Generate a crosstab before exporting.')
      return
    }

    const csvRows = [ ['Row / Column', ...columnCategories],
      ...rowCategories.map((rowValue) => [rowValue, ...columnCategories.map((colValue) => crosstab[rowValue]?.[colValue] ?? 0)]),
    ]

    const csv = csvRows.map((row) => row.map((cell) => JSON.stringify(cell)).join(',')).join('\n')
    exportCsv(csv, 'crosstab-output.csv')
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>Crosstab Generator</h2>
          <p>
            Generate a cross-tabulation of two categorical fields to reveal correlations and counts.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Upload CSV/Excel file
          <input type="file" accept=".csv,.xlsx,.xlsm,.xlsb,.xls" onChange={handleFiles} />
        </label>
        <button type="button" className="btn-primary" disabled={processing || !headers.length} onClick={buildCrosstab}>
          Build Crosstab
        </button>
        <button type="button" className="btn-secondary" disabled={!rowCategories.length} onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <div className="tool-status-row">
        <span>{processing ? 'Preparing crosstab data...' : feedback}</span>
      </div>

      {headers.length > 0 && (
        <div className="control-row">
          <label className="select-label">
            Row field
            <select value={rowField} onChange={(event) => setRowField(event.target.value)}>
              {headers.map((heading) => (
                <option key={heading} value={heading}>{heading || '(blank column)'}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Column field
            <select value={columnField} onChange={(event) => setColumnField(event.target.value)}>
              {headers.map((heading) => (
                <option key={heading} value={heading}>{heading || '(blank column)'}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {rowCategories.length > 0 && columnCategories.length > 0 && (
        <div className="chart-section">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={rowCategories.slice(0, 8).map((rowValue) => ({
              category: rowValue,
              ...columnCategories.reduce((acc, colValue) => ({
                ...acc,
                [colValue]: crosstab[rowValue]?.[colValue] ?? 0,
              }), {} as Record<string, number>),
            }))}>
              <CartesianGrid opacity={0.12} vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip wrapperStyle={{ background: '#111827', borderColor: '#374151' }} />
              {columnCategories.slice(0, 4).map((column) => (
                <Bar key={column} dataKey={column} stackId="a" fill={column === columnCategories[0] ? '#3b82f6' : '#60a5fa'} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {rowCategories.length > 0 && columnCategories.length > 0 && (
        <div className="tool-preview">
          <h3>Crosstab results</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>{rowField}</th>
                  {columnCategories.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowCategories.map((rowValue) => (
                  <tr key={rowValue}>
                    <td>{rowValue}</td>
                    {columnCategories.map((column) => (
                      <td key={column}>{crosstab[rowValue]?.[column] ?? 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="tool-preview">
          <h3>Data preview</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  {headers.map((heading, index) => (
                    <th key={index}>{heading || `Column ${index + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((_, cellIndex) => (
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

export default CrosstabGenerator
