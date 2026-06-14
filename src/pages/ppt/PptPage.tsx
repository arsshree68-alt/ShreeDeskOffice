import PptToolWorkspace from '../../components/ppt/PptToolWorkspace'

const PptPage = () => (
  <main className="page-shell">
    <div className="page-header-group">
      <span className="page-eyebrow">Presentations</span>
      <h1>PowerPoint Suite</h1>
      <p>
        Create compelling presentations with slide design, visual storytelling, templates,
        and review workflows built for business audiences.
      </p>
    </div>

    <div style={{ marginTop: '2.5rem' }}>
      <PptToolWorkspace />
    </div>
  </main>
)

export default PptPage
