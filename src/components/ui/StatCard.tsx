import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

export const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="stat-card">
    <div className="stat-card-label-wrapper">
      {icon && <span className="stat-card-icon">{icon}</span>}
      <span className="stat-card-label">{label}</span>
    </div>
    <strong className="stat-card-value">{value}</strong>
  </div>
);
