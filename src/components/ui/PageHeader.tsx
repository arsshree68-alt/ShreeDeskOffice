import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, eyebrow, actions }: PageHeaderProps) => (
  <div className="page-header-group">
    {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
    <h1>{title}</h1>
    {description && <p>{description}</p>}
    {actions && <div className="page-actions">{actions}</div>}
  </div>
)
