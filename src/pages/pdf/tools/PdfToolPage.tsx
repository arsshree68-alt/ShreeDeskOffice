import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import ToolPageShell from '../../../components/ui/ToolPageShell'
import PdfToolWorkspace from '../../../components/pdf/PdfToolWorkspace'
import { pdfTools } from '../../../tools/pdf/engine/pdfCatalog'

const getToolIdFromParam = (param: string) => {
  if (param === 'image-to-pdf') return 'imageToPdf'
  if (param === 'pdf-to-image') return 'pdfToImage'
  if (param === 'word-to-pdf') return 'wordToPdf'
  if (param === 'extract-images') return 'extractImages'
  if (param === 'extract-text') return 'extractText'
  if (param === 'excel-to-pdf') return 'excelToPdf'
  if (param === 'pdf-to-excel') return 'pdfToExcel'
  return param
}

const PdfToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>()
  const resolvedId = toolId ? getToolIdFromParam(toolId) : ''
  const tool = pdfTools.find((t) => t.id === resolvedId)
  const [activeStep, setActiveStep] = useState(1)

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
      activeStep={activeStep}
    >
      <PdfToolWorkspace key={tool.id} tool={tool} onStepChange={setActiveStep} />
    </ToolPageShell>
  )
}

export default PdfToolPage
