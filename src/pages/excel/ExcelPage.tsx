import { useMemo, useState } from 'react'
import SuiteToolCard from '../../components/ui/SuiteToolCard'

interface ExcelToolEntry {
  id: string
  title: string
  description: string
  icon: string
  route: string
  badge?: string
}

const EXCEL_TOOLS: ExcelToolEntry[] = [
  { id: 'merge',     title: 'Merge Rows',         description: 'Combine rows from multiple spreadsheets into one consolidated file.', icon: '🧩', route: '/excel/merge' },
  { id: 'remove',    title: 'Remove Duplicates',   description: 'Detect and remove duplicate rows with configurable key columns.', icon: '🧹', route: '/excel/remove-duplicates' },
  { id: 'csvToXlsx', title: 'CSV → XLSX',          description: 'Convert comma-separated files to formatted Excel workbooks.', icon: '🔄', route: '/excel/csv-to-xlsx' },
  { id: 'xlsxToCsv', title: 'XLSX → CSV',          description: 'Export Excel sheets as UTF-8 CSV files.', icon: '📋', route: '/excel/xlsx-to-csv' },
  { id: 'frequency', title: 'Frequency Table',      description: 'Generate frequency distributions for any categorical column.', icon: '📊', route: '/excel/frequency' },
  { id: 'crosstab',  title: 'Crosstab Generator',   description: 'Build cross-tabulation matrices for two categorical variables.', icon: '🔲', route: '/excel/crosstab' },
]

const ExcelPage = () => {
  const [search, setSearch] = useState('')

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return EXCEL_TOOLS
    return EXCEL_TOOLS.filter((t) =>
      `${t.title} ${t.description}`.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <main className="page-shell">
      <div className="page-header-group">
        <span className="page-eyebrow">Data Workspace</span>
        <h1>Excel Suite</h1>
        <p>
          Powerful spreadsheet capabilities for data modelling, reporting, and intelligent
          analysis across financial, operational, and performance datasets.
        </p>
      </div>

      <section className="pdf-tool-browser" style={{ marginTop: '2.5rem' }}>
        <div className="pdf-tool-browser-head">
          <div>
            <span className="section-eyebrow">Toolbox</span>
            <h2>Choose a Spreadsheet workflow</h2>
          </div>
          <label className="pdf-search-label">
            <span>Search Excel tools</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merge, frequency…"
            />
          </label>
        </div>

        <div className="pdf-tool-card-grid">
          {filteredTools.map((tool) => (
            <SuiteToolCard
              key={tool.id}
              id={tool.id}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              route={tool.route}
              badge={tool.badge}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

export default ExcelPage
