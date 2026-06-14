import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export interface SuiteToolCardProps {
  id: string
  title: string
  description: string
  icon: ReactNode
  route: string
  badge?: string
}

const SuiteToolCard = ({ title, description, icon, route, badge }: SuiteToolCardProps) => {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="suite-tool-card"
      onClick={() => navigate(route)}
      aria-label={`Open ${title} tool`}
    >
      <span className="suite-tool-card-icon" aria-hidden="true">{icon}</span>
      <span className="suite-tool-card-title">
        {title}
        {badge && <span className="suite-tool-badge">{badge}</span>}
      </span>
      <span className="suite-tool-card-copy">{description}</span>
      <span className="suite-tool-card-arrow" aria-hidden="true">→</span>
    </button>
  )
}

export default SuiteToolCard
