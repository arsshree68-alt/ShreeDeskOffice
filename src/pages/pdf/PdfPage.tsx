import { useMemo, useState } from 'react'
import SuiteToolCard from '../../components/ui/SuiteToolCard'

interface PdfToolEntry {
  id: string
  title: string
  description: string
  icon: string
  route: string
  badge?: string
}

const PDF_TOOLS: PdfToolEntry[] = [
  { id: 'merge',    title: 'Merge PDF',      description: 'Combine multiple PDF files into one organised document.', icon: '🧩', route: '/pdf/merge' },
  { id: 'split',    title: 'Split PDF',      description: 'Split every page into separate files, packaged in a ZIP.', icon: '✂️', route: '/pdf/split' },
  { id: 'compress', title: 'Compress PDF',   description: 'Reduce file size with local optimisation presets.', icon: '🗜️', route: '/pdf/compress' },
  { id: 'rotate',   title: 'Rotate PDF',     description: 'Rotate all or selected pages by 90, 180, or 270 degrees.', icon: '🔄', route: '/pdf/rotate' },
  { id: 'delete',   title: 'Delete Pages',   description: 'Remove selected pages and export a clean PDF.', icon: '🗑️', route: '/pdf/delete' },
  { id: 'extract',  title: 'Extract Pages',  description: 'Extract selected pages into a new PDF file.', icon: '📄', route: '/pdf/extract' },
  { id: 'reorder',  title: 'Reorder Pages',  description: 'Create a new PDF using a custom page order.', icon: '↕️', route: '/pdf/reorder' },
  { id: 'organize', title: 'Organize PDF',   description: 'Visually reorder, rotate, and manage pages.', icon: '🧭', route: '/pdf/organize' },
  { id: 'imageToPdf',  title: 'Image to PDF', description: 'Convert JPG and PNG files into a multi-page PDF.', icon: '🖼️', route: '/pdf/image-to-pdf' },
  { id: 'pdfToImage',  title: 'PDF to Image', description: 'Render every PDF page as high-quality PNG images.', icon: '🌄', route: '/pdf/pdf-to-image' },
  { id: 'wordToPdf',   title: 'Word to PDF',  description: 'Convert DOC/DOCX/TXT documents to PDF.', icon: '📃', route: '/pdf/word-to-pdf' },
  { id: 'watermark',   title: 'Add Watermark', description: 'Draw text watermark overlays on all pages.', icon: '🏷️', route: '/pdf/watermark' },
  { id: 'pagenumber',  title: 'Add Page Numbers', description: 'Stamp sequential page numbering at the bottom of pages.', icon: '🔢', route: '/pdf/pagenumber' },
  { id: 'protect',     title: 'Protect PDF',  description: 'Encrypt a PDF file with a password to restrict viewing.', icon: '🔒', route: '/pdf/protect' },
  { id: 'unlock',      title: 'Unlock PDF',   description: 'Decrypt password security from a protected PDF.', icon: '🔓', route: '/pdf/unlock' },
  { id: 'extract-images', title: 'Extract Images', description: 'Pull all embedded image assets into a ZIP.', icon: '🖼️', route: '/pdf/extract-images' },
  { id: 'extract-text',   title: 'Extract Text',   description: 'Scrape readable text characters from all pages.', icon: '📝', route: '/pdf/extract-text' },
]

const PdfPage = () => {
  const [search, setSearch] = useState('')

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return PDF_TOOLS
    return PDF_TOOLS.filter((t) =>
      `${t.title} ${t.description}`.toLowerCase().includes(q),
    )
  }, [search])

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
          <div><strong>{PDF_TOOLS.length}</strong><span>working tools</span></div>
          <div><strong>100%</strong><span>local processing</span></div>
          <div><strong>Fast</strong><span>browser workspace</span></div>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merge, split, image…"
            />
          </label>
        </div>

        <div className="pdf-tool-card-grid">
          {filteredTools.map((tool) => (
            <SuiteToolCard
              key={tool.id}
              id={tool.id}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              route={tool.route}
              badge={tool.badge}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

export default PdfPage
