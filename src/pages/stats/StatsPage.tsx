import { useState, useMemo } from 'react'
import { FiActivity, FiPieChart, FiBarChart2, FiTrendingUp } from 'react-icons/fi'

const StatsPage = () => {
  const [search, setSearch] = useState('')

  const tools = useMemo(() => [
    { id: 'crosstab', title: 'Crosstab Generator', description: 'Create cross-tabulation summaries to reveal relationships in data.', icon: <FiPieChart /> },
    { id: 'frequency', title: 'Frequency Tables', description: 'Quickly generate frequency and percentage distributions.', icon: <FiBarChart2 /> },
    { id: 'regression', title: 'Regression Analysis', description: 'Perform linear and multiple regression modeling.', icon: <FiTrendingUp /> },
    { id: 'anova', title: 'ANOVA Testing', description: 'Analysis of variance tools for statistical significance.', icon: <FiActivity /> },
  ], [])

  const filteredTools = tools.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))

  return (
    <main className="page-shell">
      <div className="page-header-group">
        <span className="page-eyebrow">Data Science</span>
        <h1>Statistical Lab</h1>
        <p>
          Explore advanced analytics, modeling, and visualization tools for business
          intelligence and data-driven decision making.
        </p>
      </div>

      <section className="pdf-tool-browser" style={{ marginTop: '2.5rem' }}>
        <div className="pdf-tool-browser-head">
          <div>
            <span className="section-eyebrow">Analysis</span>
            <h2>Statistical Models</h2>
          </div>
          <label className="pdf-search-label">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stat tools" />
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
    </main>
  )
}

export default StatsPage
