import { useParams, Link } from 'react-router-dom'
import ToolPageShell from '../../../components/ui/ToolPageShell'
import MergeExcelTool from '../../../tools/excel/MergeExcelTool'
import RemoveDuplicateRowsTool from '../../../tools/excel/RemoveDuplicateRowsTool'
import CsvToXlsxConverter from '../../../tools/excel/CsvToXlsxConverter'
import XlsxToCsvConverter from '../../../tools/excel/XlsxToCsvConverter'
import FrequencyTableGenerator from '../../../tools/excel/FrequencyTableGenerator'
import CrosstabGenerator from '../../../tools/excel/CrosstabGenerator'

const ExcelToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>()

  let title = ''
  let description = ''
  let icon = '📊'
  let child = null

  switch (toolId) {
    case 'merge':
      title = 'Merge Spreadsheets'
      description = 'Combine rows from multiple XLSX, CSV, or TSV files into a single consolidated spreadsheet.'
      icon = '🧩'
      child = <MergeExcelTool />
      break
    case 'remove-duplicates':
      title = 'Remove Duplicates'
      description = 'Detect and delete identical rows using custom unique key columns.'
      icon = '🧹'
      child = <RemoveDuplicateRowsTool />
      break
    case 'csv-to-xlsx':
      title = 'CSV to XLSX Converter'
      description = 'Convert plain comma-separated text files to formatted Excel workbooks.'
      icon = '🔄'
      child = <CsvToXlsxConverter />
      break
    case 'xlsx-to-csv':
      title = 'XLSX to CSV Converter'
      description = 'Export Excel workbook sheet tabs as UTF-8 comma-separated files.'
      icon = '📋'
      child = <XlsxToCsvConverter />
      break
    case 'frequency':
      title = 'Frequency Tables'
      description = 'Generate percentage distributions and occurrence tables for selected columns.'
      icon = '📊'
      child = <FrequencyTableGenerator />
      break
    case 'crosstab':
      title = 'Crosstab Generator'
      description = 'Build contingency and cross-tabulation matrices for custom data analysis.'
      icon = '🔲'
      child = <CrosstabGenerator />
      break
    default:
      return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h2>Tool Not Found</h2>
          <p style={{ marginBottom: '1.5rem' }}>The requested spreadsheet tool was not found or has not been loaded.</p>
          <Link to="/excel" className="btn-primary" style={{ textDecoration: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px' }}>Back to Excel Suite</Link>
        </div>
      )
  }

  return (
    <ToolPageShell
      title={title}
      description={description}
      suiteLabel="Excel Suite"
      suiteRoute="/excel"
      icon={icon}
    >
      {child}
    </ToolPageShell>
  )
}

export default ExcelToolPage
