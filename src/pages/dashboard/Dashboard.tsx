import { Link } from 'react-router-dom'

const suiteCards = [
  { label: 'PDF Suite', path: '/pdf' },
  { label: 'Excel Suite', path: '/excel' },
  { label: 'Word Suite', path: '/word' },
  { label: 'PowerPoint Suite', path: '/ppt' },
  { label: 'Image Suite', path: '/image' },
  { label: 'Data Processing', path: '/data' },
  { label: 'Statistical Lab', path: '/stats' },
  { label: 'Government Suite', path: '/govt' },
]

const Dashboard = () => (
  <main className="page-shell">
    <div className="page-header-group">
      <span className="page-eyebrow">Central command</span>
      <h1>ShreeDeskOffice Dashboard</h1>
      <p>
        Explore every productivity and processing suite from a single strategic hub.
        Leverage document workflows, data operations, analytics, and public sector tools
        with a modern, secure interface.
      </p>
    </div>

    <div className="dashboard-grid">
      {suiteCards.map((suite) => (
        <Link to={suite.path} key={suite.label} className="suite-card">
          <h2>{suite.label}</h2>
          <p>Open the {suite.label} workspace to manage tasks and accelerate your workflow.</p>
        </Link>
      ))}
    </div>
  </main>
)

export default Dashboard
