import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { FiArrowLeft } from 'react-icons/fi'

export interface ToolPageShellProps {
  /** Display name of the tool */
  title: string
  /** One-line description shown in the sub-header */
  description: string
  /** Label for the back-link, e.g. "PDF Suite" */
  suiteLabel: string
  /** Route to navigate back to the parent suite page */
  suiteRoute: string
  /** Optional emoji or icon character shown next to the title */
  icon?: ReactNode
  /** The actual tool UI — must internally implement the 5 steps */
  children: ReactNode
}

/**
 * Wraps every dedicated tool page with a consistent chrome:
 * back-link → title → breadcrumb → 5-step phase indicator → tool content
 *
 * Rules:
 * - Tool content (children) must implement Upload → Configure → Preview → Process → Export
 * - Never render suite cards or navigation grids here
 */
const ToolPageShell = ({
  title,
  description,
  suiteLabel,
  suiteRoute,
  icon,
  children,
}: ToolPageShellProps) => {
  const navigate = useNavigate()

  return (
    <div className="tool-page-shell">
      {/* Back navigation */}
      <button
        type="button"
        className="tool-page-back"
        onClick={() => navigate(suiteRoute)}
        aria-label={`Back to ${suiteLabel}`}
      >
        <FiArrowLeft aria-hidden="true" />
        <span>{suiteLabel}</span>
      </button>

      {/* Tool header */}
      <header className="tool-page-header">
        {icon && <span className="tool-page-icon" aria-hidden="true">{icon}</span>}
        <div>
          <h1 className="tool-page-title">{title}</h1>
          <p className="tool-page-description">{description}</p>
        </div>
      </header>

      {/* Phase indicator */}
      <ol className="tool-phase-indicator" aria-label="Workflow phases">
        {['Upload', 'Configure', 'Preview', 'Process', 'Export'].map((phase, index) => (
          <li key={phase} className="tool-phase-step">
            <span className="tool-phase-number">{index + 1}</span>
            <span className="tool-phase-label">{phase}</span>
            {index < 4 && <span className="tool-phase-sep" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {/* Tool content */}
      <div className="tool-page-content">{children}</div>
    </div>
  )
}

export default ToolPageShell
