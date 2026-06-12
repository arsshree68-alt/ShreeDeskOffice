import { useState } from 'react'
import MergeExcelTool from '../../tools/excel/MergeExcelTool'
import RemoveDuplicateRowsTool from '../../tools/excel/RemoveDuplicateRowsTool'
import CsvToXlsxConverter from '../../tools/excel/CsvToXlsxConverter'
import XlsxToCsvConverter from '../../tools/excel/XlsxToCsvConverter'
import FrequencyTableGenerator from '../../tools/excel/FrequencyTableGenerator'
import CrosstabGenerator from '../../tools/excel/CrosstabGenerator'

const toolMap = {
  merge: { label: 'Merge Rows', component: <MergeExcelTool /> },
  remove: { label: 'Remove Duplicates', component: <RemoveDuplicateRowsTool /> },
  csvToXlsx: { label: 'CSV → XLSX', component: <CsvToXlsxConverter /> },
  xlsxToCsv: { label: 'XLSX → CSV', component: <XlsxToCsvConverter /> },
  frequency: { label: 'Frequency Table', component: <FrequencyTableGenerator /> },
  crosstab: { label: 'Crosstab', component: <CrosstabGenerator /> },
}

const ExcelPage = () => {
  const [activeTool, setActiveTool] = useState<keyof typeof toolMap>('merge')

  return (
    <main className="page-shell">
      <div className="page-header-group">
        <h1>Excel Suite</h1>
        <p>
          Powerful spreadsheet capabilities for data modeling, reporting, and intelligent
          analysis across financial, operational, and performance datasets.
        </p>
      </div>

      <div className="tool-tabs">
        {Object.entries(toolMap).map(([key, tool]) => (
          <button
            key={key}
            type="button"
            className={`tool-tab ${activeTool === key ? 'active' : ''}`}
            onClick={() => setActiveTool(key as keyof typeof toolMap)}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div className="tool-viewer">{toolMap[activeTool].component}</div>
    </main>
  )
}

export default ExcelPage
