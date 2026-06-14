import ToolPageShell from '../../../components/ui/ToolPageShell'
import PdfToolWorkspace from '../../../components/pdf/PdfToolWorkspace'
import { pdfTools } from '../../../tools/pdf/engine/pdfCatalog'

const tool = pdfTools.find((t) => t.id === 'merge')!

const PdfMergePage = () => (
  <ToolPageShell
    title="Merge PDF"
    description="Combine multiple PDF files into one organised document. Drag to reorder pages before merging."
    suiteLabel="PDF Suite"
    suiteRoute="/pdf"
    icon={tool.icon}
  >
    <PdfToolWorkspace key="merge" tool={tool} />
  </ToolPageShell>
)

export default PdfMergePage
