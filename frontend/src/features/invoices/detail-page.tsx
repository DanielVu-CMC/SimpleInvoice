import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/services/api/client';
import type { Invoice } from '@/services/api/types';
import { Loading, ErrorState } from '@/components/feedback';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { money, dateLabel } from './format';
export function InvoiceDetailPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const listHref = `/invoices${search}`;
  const result = useQuery({
    queryKey: ['invoices', id],
    queryFn: ({ signal }) => api<Invoice>(`/invoices/${id}`, { signal }),
  });
  if (result.isPending) return <Loading label="Loading invoice details…" />;
  if (result.isError)
    return (
      <div className="page-body">
        <Link to={listHref} className="back-link">
          <ArrowLeft size={16} />
          Back to invoices
        </Link>
        <ErrorState
          message={
            result.error instanceof ApiError && result.error.status === 404
              ? 'This invoice could not be found.'
              : errorMessage(result.error)
          }
          retry={() => void result.refetch()}
        />
      </div>
    );
  const invoice = result.data;
  return (
    <div className="page-body detail-page">
      <Link to={listHref} className="back-link">
        <ArrowLeft size={16} />
        Back to invoices
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">THE FULL PICTURE</div>
          <h1>
            Invoice details<span className="title-dot">.</span>
          </h1>
          <p>Everything you need, all in one place.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer size={17} />
          Print invoice
        </Button>
      </div>
      <div className="detail-grid">
        <article className="panel invoice-document">
          <header className="document-header">
            <div className="document-brand">
              <span className="brand-mark">
                <FileText size={24} />
              </span>
              <strong>simpleinvoice</strong>
            </div>
            <div>
              <span className="eyebrow muted">INVOICE</span>
              <h2>{invoice.invoiceNumber}</h2>
              <StatusBadge status={invoice.status} />
            </div>
          </header>
          <div className="invoice-meta">
            <div>
              <span className="eyebrow muted">BILL TO</span>
              <h3>{invoice.customer.fullname}</h3>
              <p>{invoice.customer.email}</p>
              {invoice.customer.mobileNumber && (
                <p>{invoice.customer.mobileNumber}</p>
              )}
              {invoice.customer.address && (
                <p className="address-text">{invoice.customer.address}</p>
              )}
            </div>
            <dl>
              <div>
                <dt>Invoice date</dt>
                <dd>{dateLabel(invoice.invoiceDate)}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{dateLabel(invoice.dueDate)}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>
                  {invoice.currency} ({invoice.currencySymbol})
                </dd>
              </div>
              {invoice.invoiceReference && (
                <div>
                  <dt>Reference</dt>
                  <dd>{invoice.invoiceReference}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="table-scroll line-items">
            <table>
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col" className="amount-cell">
                    Qty
                  </th>
                  <th scope="col" className="amount-cell">
                    Rate
                  </th>
                  <th scope="col" className="amount-cell">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="amount-cell">{item.quantity}</td>
                    <td className="amount-cell">
                      {money(item.rate, invoice.currency)}
                    </td>
                    <td className="amount-cell">
                      {money(invoice.invoiceSubTotal, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="invoice-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(invoice.invoiceSubTotal, invoice.currency)}</dd>
            </div>
            <div>
              <dt>Tax ({Number(invoice.taxPercent)}%)</dt>
              <dd>{money(invoice.totalTax, invoice.currency)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>−{money(invoice.totalDiscount, invoice.currency)}</dd>
            </div>
            <div className="grand-total">
              <dt>Total amount</dt>
              <dd>{money(invoice.totalAmount, invoice.currency)}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{money(invoice.totalPaid, invoice.currency)}</dd>
            </div>
            <div className="balance-total">
              <dt>Outstanding balance</dt>
              <dd>{money(invoice.balanceAmount, invoice.currency)}</dd>
            </div>
          </dl>
          {invoice.description && (
            <div className="invoice-notes">
              <span className="eyebrow muted">NOTES</span>
              <p>{invoice.description}</p>
            </div>
          )}
          <div className="document-footer">Thank you for your business.</div>
        </article>
        <aside className="detail-aside">
          <div className="balance-panel">
            <span className="eyebrow">OUTSTANDING BALANCE</span>
            <strong>{money(invoice.balanceAmount, invoice.currency)}</strong>
            <div>
              <StatusBadge status={invoice.status} />
            </div>
            <p>Due {dateLabel(invoice.dueDate)}</p>
          </div>
          <div className="panel record-panel">
            <h3>Record details</h3>
            <dl>
              <dt>Created</dt>
              <dd>
                {new Intl.DateTimeFormat('en-GB', {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
                }).format(new Date(invoice.createdAt))}
              </dd>
              <dt>Invoice ID</dt>
              <dd className="record-id">{invoice.invoiceId}</dd>
            </dl>
            <p>
              Status reflects today’s date. Unpaid invoices past their due date
              are marked Overdue automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
