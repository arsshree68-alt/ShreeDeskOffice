import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ToolCardProps {
  title: string;
  description: string;
  path: string;
  icon?: ReactNode;
  badge?: string;
  isFeatured?: boolean;
}

export const ToolCard = ({ title, description, path, icon, badge, isFeatured }: ToolCardProps) => (
  <Link to={path} className={`tool-card group ${isFeatured ? 'featured' : ''}`}>
    <div className="tool-card-top">
      {icon && <div className="tool-card-icon">{icon}</div>}
      <h3>{title}</h3>
      {badge && <span className="tool-badge">{badge}</span>}
    </div>
    <p className="tool-card-description">{description}</p>
    <div className="tool-card-link">
      Open Tool
      <ChevronRight className="tool-card-link-icon" />
    </div>
  </Link>
);
