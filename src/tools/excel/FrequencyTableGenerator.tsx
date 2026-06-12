import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exportCsv, getFileExtension, parseCsvRows, parseWorksheetRows, readWorkbookFromFile, supportedExcelExtensions, supportedCsvExtensions } from './excelToolUtils'

const FrequencyTableGenerator = () => {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [selectedField, setSelectedField] = useState('')
  const [frequencyRows, setFrequencyRows] = useState<{ value: string; count: number }[]>([])
  const [feedback, setFeedback] = useState('Upload a file and choose a field to generate a frequency table.')
  const [processing, setProcessing] = useState(false)

  const previewRows = useMemo(() => rows.slice(0, 12), [rows])

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList?.length) return

    const file = fileList[0]
    const ext = getFileExtension(file)

    if (![...supportedExcelExtensions, ...supportedCsvExtensions].includes(ext)) {
      setFeedback('Please upload a CSV or Excel file to generate a frequency table.')
      return
    }

    setProcessing(true)
    setFeedback('Loading file for analysis...')

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
      setSelectedField(workbookRows[0][0] ?? '')
      setFeedback('Choose a field to generate the frequency table.')
    } catch (error) {
      console.error(error)
      setFeedback('Unable to read this file. Please verify the format and try again.')
    } finally {
      setProcessing(false)
    }
  }

  const computeFrequency = () => {
    if (!selectedField || headers.length === 0) {
      setFeedback('Please select a field to analyze.')
      return
    }

    const columnIndex = headers.indexOf(selectedField)
    if (columnIndex === -1) {
      setFeedback('Invalid field selection.')
      return
    }

    const counts = rows.reduce<Record<string, number>>((acc, row) => {
      const key = row[columnIndex] ?? ''
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    const frequency = Object.entries(counts)
      .map(([value, count]) => ({ value: value || '(blank)', count }))
      .sort((a, b) => b.count - a.count)

    setFrequencyRows(frequency)
    setFeedback(`Generated frequency table for ${selectedField}.`)
  }

  const handleExport = () => {
    if (!frequencyRows.length) {
      setFeedback('Generate a frequency table before exporting.')
      return
    }

    const csv = ['Value,Count', ...frequencyRows.map((row) => `${JSON.stringify(row.value)},${row.count}`)].join('\n')
    exportCsv(csv, 'frequency-table.csv')
  }

  return (
    <section className="tool-shell">
      <div className="tool-header">
        <div>
          <h2>Frequency Table Generator</h2>
          <p>
            Generate frequency counts for any categorical field in your dataset and export the results.
          </p>
        </div>
      </div>

      <div className="tool-controls">
        <label className="file-upload">
          Upload CSV/Excel file
          <input type="file" accept=".csv,.xlsx,.xlsm,.xlsb,.xls" onChange={handleFiles} />
        </label>
        <button type="button" className="btn-primary" disabled={processing || !rows.length} onClick={computeFrequency}>
          Generate Frequency
        </button>
        <button type="button" className="btn-secondary" disabled={!frequencyRows.length} onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <div className="tool-status-row">
        <span>{processing ? 'Preparing data for frequency analysis...' : feedback}</span>
      </div>

      {headers.length > 0 && (
        <div className="control-row">
          <label className="select-label">
            Field to analyze
            <select value={selectedField} onChange={(event) => setSelectedField(event.target.value)}>
              {headers.map((column) => (
                <option key={column} value={column}>{column || '(blank column)'}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {frequencyRows.length > 0 && (
        <div className="chart-section">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={frequencyRows.slice(0, 10)} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid opacity={0.12} vertical={false} />
              <XAxis dataKey="value" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip wrapperStyle={{ background: '#111827', borderColor: '#374151' }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {frequencyRows.length > 0 && (
        <div className="tool-preview">
          <h3>Frequency results</h3>
          <div className="table-scroll">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {frequencyRows.map((row, index) => (
                  <tr key={index}>
                    <td>{row.value}</td>
                    <td>{row.count}</td>
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

export default FrequencyTableGenerator
