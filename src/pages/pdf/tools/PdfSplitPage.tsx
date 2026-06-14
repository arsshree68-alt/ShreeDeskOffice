import ToolPageShell from '../../../components/ui/ToolPageShell'
import PdfToolWorkspace from '../../../components/pdf/PdfToolWorkspace'
import { pdfTools } from '../../../tools/pdf/engine/pdfCatalog'

const tool = pdfTools.find((t) => t.id === 'split')!

const PdfSplitPage = () => (
  <ToolPageShell
    title="Split PDF"
    description="Split every page of a PDF into separate files, packaged in a ZIP archive for easy distribution."
    suiteLabel="PDF Suite"
    suiteRoute="/pdf"
    icon={tool.icon}
  >
    <PdfToolWorkspace key="split" tool={tool} />
  </ToolPageShell>
)

export default PdfSplitPage
