import ToolPageShell from '../../../components/ui/ToolPageShell'
import MergeExcelTool from '../../../tools/excel/MergeExcelTool'

const ExcelMergePage = () => (
  <ToolPageShell
    title="Merge Spreadsheets"
    description="Combine rows from multiple XLSX, CSV, or TSV files into a single consolidated spreadsheet. Handles duplicate detection and header alignment."
    suiteLabel="Excel Suite"
    suiteRoute="/excel"
    icon="🧩"
  >
    <MergeExcelTool />
  </ToolPageShell>
)

export default ExcelMergePage
