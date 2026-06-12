import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const featureCards = [
  {
    label: 'PDF Suite',
    description: 'Edit, annotate, convert, and secure PDF workflows for reports and submissions.',
    path: '/pdf',
  },
  {
    label: 'Excel Suite',
    description: 'Advanced spreadsheet management, merge tools, and data preparation utilities.',
    path: '/excel',
  },
  {
    label: 'Word Suite',
    description: 'Create polished documents, templates, and structured text outputs.',
    path: '/word',
  },
  {
    label: 'PowerPoint Suite',
    description: 'Design professional presentations, summaries, and stakeholder decks.',
    path: '/ppt',
  },
  {
    label: 'Image Suite',
    description: 'Optimize and prepare visual assets for reports and government submissions.',
    path: '/image',
  },
  {
    label: 'Data Processing Suite',
    description: 'Automate imports, cleaning, and structured transformations for large datasets.',
    path: '/data',
  },
  {
    label: 'Statistical Lab',
    description: 'Generate tables, distributions, and analysis-ready summaries with speed.',
    path: '/stats',
  },
  {
    label: 'Government Suite',
    description: 'Build compliant workflows for public sector datasets and official reporting.',
    path: '/govt',
  },
  {
    label: 'AI Workspace',
    description: 'Combine automation, analytics, and intelligent recommendations for data work.',
    path: '/excel',
  },
]

const featuredTools = [
  {
    label: 'Excel Merge Tool',
    description: 'Combine multiple spreadsheets into one clean workbook with duplicate removal.',
    path: '/excel',
  },
  {
    label: 'Remove Duplicate Rows',
    description: 'Detect and remove repeated records across spreadsheets and CSV exports.',
    path: '/excel',
  },
  {
    label: 'CSV to XLSX Converter',
    description: 'Convert CSV exports into structured XLSX workbooks instantly.',
    path: '/excel',
  },
  {
    label: 'Frequency Table Generator',
    description: 'Summarize categorical data into frequency tables for analysis and reporting.',
    path: '/stats',
  },
  {
    label: 'Crosstab Generator',
    description: 'Create cross-tabulation summaries to reveal relationships in government data.',
    path: '/stats',
  },
  {
    label: 'HLB Consolidator',
    description: 'Streamline health block data consolidation for district-level reporting.',
    path: '/govt',
  },
  {
    label: 'Village Code Validator',
    description: 'Validate and normalize village-level codes against standard geographic formats.',
    path: '/govt',
  },
  {
    label: 'Census Data Cleaner',
    description: 'Prepare large census datasets with consistency checks and automated cleanup.',
    path: '/data',
  },
]

const roadmapPhases = [
  {
    title: 'Phase 1',
    items: ['Excel Tools', 'Data Processing'],
  },
  {
    title: 'Phase 2',
    items: ['PDF Suite', 'Image Suite'],
  },
  {
    title: 'Phase 3',
    items: ['Government Data Tools', 'Statistical Lab'],
  },
  {
    title: 'Phase 4',
    items: ['AI Workspace'],
  },
]

const Dashboard = () => (
  <main className="homepage-shell">
    <motion.section
      className="hero-section"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div className="hero-copy">
        <span className="hero-eyebrow">ShreeDeskOffice</span>
        <h1>Documents • Data • Decisions</h1>
        <p>
          An all-in-one productivity and data processing platform for professionals,
          researchers, government offices, analysts, and students.
        </p>

        <div className="hero-actions">
          <Link className="btn btn-primary" to="/excel">
            Explore Tools
          </Link>
          <Link className="btn btn-secondary" to="/excel">
            Excel Suite
          </Link>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-keynotes">
          <div>
            <span className="stat-value">8</span>
            <span className="stat-label">Integrated suites</span>
          </div>
          <div>
            <span className="stat-value">50+</span>
            <span className="stat-label">Productivity tools</span>
          </div>
          <div>
            <span className="stat-value">Real-time</span>
            <span className="stat-label">Reporting workflows</span>
          </div>
        </div>
      </div>
    </motion.section>

    <motion.section
      className="section-panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1 }}
    >
      <div className="section-intro">
        <span className="section-eyebrow">Core suites</span>
        <h2>Premium suites crafted for modern data workflows</h2>
        <p>
          ShreeDeskOffice brings together document editing, spreadsheet intelligence,
          statistics, government data validation, and image processing into a single
          premium experience.
        </p>
      </div>

      <div className="feature-grid">
        {featureCards.map((card) => (
          <Link key={card.label} to={card.path} className="feature-card">
            <div className="feature-card-title">{card.label}</div>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>
    </motion.section>

    <motion.section
      className="section-panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
    >
      <div className="section-intro">
        <span className="section-eyebrow">Featured Tools</span>
        <h2>Tools built for real-world workflows</h2>
        <p>
          Powerful utilities designed to save time while ensuring accuracy in spreadsheet,
          statistical, and government data projects.
        </p>
      </div>

      <div className="tool-grid">
        {featuredTools.map((tool) => (
          <Link key={tool.label} to={tool.path} className="tool-card">
            <div className="tool-card-top">
              <span className="tool-badge">Featured</span>
              <h3>{tool.label}</h3>
            </div>
            <p>{tool.description}</p>
          </Link>
        ))}
      </div>
    </motion.section>

    <motion.section
      className="split-panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
    >
      <div className="about-panel">
        <span className="section-eyebrow">About the Creator</span>
        <h2>Abhishek Raj Shrivastava</h2>
        <p>
          ShreeDeskOffice is being developed to simplify document processing,
          data cleaning, statistical analysis, reporting, and workflow automation.
        </p>
      </div>

      <div className="roadmap-panel">
        <span className="section-eyebrow">Roadmap</span>
        <h2>Planned phases for continued expansion</h2>
        <div className="roadmap-list">
          {roadmapPhases.map((phase) => (
            <div key={phase.title} className="roadmap-item">
              <div className="roadmap-step">{phase.title}</div>
              <ul>
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </motion.section>

    <footer className="homepage-footer">
      <div>
        <h3>Developed by Abhishek Shrivastava</h3>
        <p>Making data processing faster, smarter and simpler.</p>
      </div>
    </footer>
  </main>
)

export default Dashboard
