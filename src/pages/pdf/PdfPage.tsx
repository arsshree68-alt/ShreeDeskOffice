import { useMemo, useState } from 'react'
import PdfToolWorkspace from '../../components/pdf/PdfToolWorkspace'
import { pdfTools } from '../../tools/pdf/engine/pdfCatalog'
import type { PdfToolId } from '../../tools/pdf/engine/types'

const PdfPage = () => {
  const [search, setSearch] = useState('')
  const [activeToolId, setActiveToolId] = useState<PdfToolId>('merge')

  const filteredTools = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return pdfTools

    return pdfTools.filter((tool) =>
      `${tool.title} ${tool.description}`.toLowerCase().includes(normalizedSearch),
    )
  }, [search])

  const activeTool = pdfTools.find((tool) => tool.id === activeToolId) ?? pdfTools[0]

  return (
    <main className="pdf-suite-shell">
      <section className="pdf-hero">
        <div>
          <span className="page-eyebrow">PDF Suite</span>
          <h1>Professional PDF Processing Tools</h1>
          <p>
            Merge, split, compress, rotate, extract, reorder, and convert documents with
            local-first PDF workflows built for government offices, researchers, investigators,
            students, and high-volume document operations.
          </p>
        </div>
        <div className="pdf-hero-stats" aria-label="PDF suite capabilities">
          <div>
            <strong>9</strong>
            <span>working tools</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>local processing</span>
          </div>
          <div>
            <strong>Fast</strong>
            <span>browser workspace</span>
          </div>
        </div>
      </section>

      <section className="pdf-tool-browser">
        <div className="pdf-tool-browser-head">
          <div>
            <span className="section-eyebrow">Toolbox</span>
            <h2>Choose a PDF workflow</h2>
          </div>
          <label className="pdf-search-label">
            <span>Search PDF tools</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search merge, split, image..."
            />
          </label>
        </div>

        <div className="pdf-tool-card-grid">
          {filteredTools.map((tool) => (
            <button
              type="button"
              key={tool.id}
              className={`pdf-tool-card ${activeTool.id === tool.id ? 'active' : ''}`}
              onClick={() => setActiveToolId(tool.id)}
            >
              <span className="pdf-tool-icon">{tool.icon}</span>
              <span className="pdf-tool-card-title">{tool.title}</span>
              <span className="pdf-tool-card-copy">{tool.description}</span>
            </button>
          ))}
        </div>
      </section>

      <PdfToolWorkspace key={activeTool.id} tool={activeTool} />
    </main>
  )
}

export default PdfPage
