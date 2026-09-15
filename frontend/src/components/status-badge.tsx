import type { InvoiceStatus } from '@/services/api/types';
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span aria-hidden="true" className="status-dot" />
      {status}
    </span>
  );
}
