import type { ReactNode } from 'react'

interface FeatureBadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

export const FeatureBadge = ({ children, variant = 'primary' }: FeatureBadgeProps) => {
  return (
    <span className={`feature-badge feature-badge-${variant}`}>
      {children}
    </span>
  )
}
