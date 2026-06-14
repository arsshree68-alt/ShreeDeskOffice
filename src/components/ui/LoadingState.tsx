import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="loading-state">
    <Loader2 className="spinner" />
    <p className="loading-state-message">{message}</p>
  </div>
);
