import ToolPageShell from '../../../components/ui/ToolPageShell'
import PdfToolWorkspace from '../../../components/pdf/PdfToolWorkspace'
import { pdfTools } from '../../../tools/pdf/engine/pdfCatalog'

const tool = pdfTools.find((t) => t.id === 'compress')!

const PdfCompressPage = () => (
  <ToolPageShell
    title="Compress PDF"
    description="Reduce PDF file size using local optimisation. Choose from Maximum, Recommended, or High quality presets."
    suiteLabel="PDF Suite"
    suiteRoute="/pdf"
    icon={tool.icon}
  >
    <PdfToolWorkspace key="compress" tool={tool} />
  </ToolPageShell>
)

export default PdfCompressPage
