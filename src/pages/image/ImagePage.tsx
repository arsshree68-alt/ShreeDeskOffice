import { useMemo, useState } from 'react'
import SuiteToolCard from '../../components/ui/SuiteToolCard'

interface ImageToolEntry {
  id: string
  title: string
  description: string
  icon: string
  route: string
  badge?: string
}

const IMAGE_TOOLS: ImageToolEntry[] = [
  { id: 'compress',  title: 'Compress Image',    description: 'Reduce file size while preserving quality. Ideal for web and email.', icon: '🗜️', route: '/image/compress' },
  { id: 'resize',    title: 'Resize & Crop',      description: 'Adjust dimensions and crop to specific aspect ratios.', icon: '✂️', route: '/image/resize' },
  { id: 'convert',   title: 'Format Converter',   description: 'Convert between PNG, JPG, WEBP, and more formats.', icon: '🔁', route: '/image/convert', badge: 'Soon' },
  { id: 'watermark', title: 'Add Watermark',       description: 'Stamp images with your logo or text for copyright protection.', icon: '🖊️', route: '/image/watermark', badge: 'Soon' },
]

const ImagePage = () => {
  const [search, setSearch] = useState('')

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return IMAGE_TOOLS
    return IMAGE_TOOLS.filter((t) =>
      `${t.title} ${t.description}`.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <main className="page-shell">
      <div className="page-header-group">
        <span className="page-eyebrow">Creative Lab</span>
        <h1>Image Suite</h1>
        <p>
          Image processing and optimisation tools for preparing visuals, scanning materials,
          and converting assets for modern presentation and publication workflows.
        </p>
      </div>

      <section className="pdf-tool-browser" style={{ marginTop: '2.5rem' }}>
        <div className="pdf-tool-browser-head">
          <div>
            <span className="section-eyebrow">Toolbox</span>
            <h2>Choose an Image workflow</h2>
          </div>
          <label className="pdf-search-label">
            <span>Search image tools</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search compress, resize…"
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

export default ImagePage
