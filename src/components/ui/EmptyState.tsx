import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({
  title = 'No results found',
  description = 'Try adjusting your search or filters.',
  icon = <Inbox size={48} className="empty-state-icon" />,
  action,
}: EmptyStateProps) => (
  <div className="empty-state">
    <div className="empty-state-icon-wrapper">{icon}</div>
    <h3 className="empty-state-title">{title}</h3>
    <p className="empty-state-description">{description}</p>
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);
