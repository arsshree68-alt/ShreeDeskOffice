import { useState, useMemo } from 'react'
import { FiFileText, FiType, FiFile } from 'react-icons/fi'
import WordToolWorkspace from '../../components/word/WordToolWorkspace'

const WordPage = () => {
  const [search, setSearch] = useState('')

  const tools = useMemo(() => [
    { id: 'wordToPdf', title: 'Word to PDF', description: 'Convert DOC/DOCX/RTF/TXT to PDF, batch support.', icon: <FiFileText /> },
    { id: 'pdfToWord', title: 'PDF to Word', description: 'PDF to DOCX conversion (OCR-ready architecture).', icon: <FiFile /> },
    { id: 'reportGenerator', title: 'Report Generator', description: 'Template-based report generation (DOCX/PDF/PPT).', icon: <FiType /> },
  ], [])

  const filteredTools = tools.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))

  return (
    <main className="page-shell">
      <div className="page-header-group">
        <span className="page-eyebrow">Document Authoring</span>
        <h1>Word Suite</h1>
        <p>
          Professional word processing tools for authoring, formatting, and collaborating on
          reports, contracts, and polished business communications.
        </p>
      </div>

      <section className="pdf-tool-browser" style={{ marginTop: '2.5rem' }}>
        <div className="pdf-tool-browser-head">
          <div>
            <span className="section-eyebrow">Toolbox</span>
            <h2>Choose a Word workflow</h2>
          </div>
          <label className="pdf-search-label">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Word tools" />
          </label>
        </div>

        <div className="pdf-tool-card-grid">
          {filteredTools.map((t) => (
            <div key={t.id} className="pdf-tool-card">
              <div className="pdf-tool-icon">{t.icon}</div>
              <span className="pdf-tool-card-title">{t.title}</span>
              <span className="pdf-tool-card-copy">{t.description}</span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: '2.5rem' }}>
        <WordToolWorkspace />
      </div>
    </main>
  )
}

export default WordPage
