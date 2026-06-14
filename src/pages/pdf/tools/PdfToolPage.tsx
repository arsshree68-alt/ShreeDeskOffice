import { useParams, Link } from 'react-router-dom'
import ToolPageShell from '../../../components/ui/ToolPageShell'
import PdfToolWorkspace from '../../../components/pdf/PdfToolWorkspace'
import { pdfTools } from '../../../tools/pdf/engine/pdfCatalog'

const getToolIdFromParam = (param: string) => {
  if (param === 'image-to-pdf') return 'imageToPdf'
  if (param === 'pdf-to-image') return 'pdfToImage'
  if (param === 'word-to-pdf') return 'wordToPdf'
  if (param === 'extract-images') return 'extractImages'
  if (param === 'extract-text') return 'extractText'
  return param
}

const PdfToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>()
  const resolvedId = toolId ? getToolIdFromParam(toolId) : ''
  const tool = pdfTools.find((t) => t.id === resolvedId)

  if (!tool) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Tool Not Found</h2>
        <p style={{ marginBottom: '1.5rem' }}>The requested PDF tool was not found or has not been loaded.</p>
        <Link to="/pdf" className="btn-primary" style={{ textDecoration: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px' }}>Back to PDF Suite</Link>
      </div>
    )
  }

  return (
    <ToolPageShell
      title={tool.title}
      description={tool.description}
      suiteLabel="PDF Suite"
      suiteRoute="/pdf"
      icon={tool.icon}
    >
      <PdfToolWorkspace key={tool.id} tool={tool} />
    </ToolPageShell>
  )
}

export default PdfToolPage
