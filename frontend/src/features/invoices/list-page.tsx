import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { api, errorMessage } from '@/services/api/client';
import type {
  InvoiceList,
  InvoiceQuery,
  InvoiceStatus,
} from '@/services/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading, ErrorState } from '@/components/feedback';
import { StatusBadge } from '@/components/status-badge';
import { dateLabel, money } from './format';
import { PAGE_SIZES, parseListQuery, serializeListQuery } from './list-query';
export function InvoiceListPage() {
  const [parameters, setParameters] = useSearchParams();
  const parameterKey = parameters.toString();
  const query = useMemo(
    () => parseListQuery(new URLSearchParams(parameterKey)),
    [parameterKey],
  );
  const canonical = serializeListQuery(query).toString();
  const keyword = query.keyword ?? '';
  // A draft belongs to the URL it was edited from. History navigation
  // invalidates an old draft, so a pending debounce cannot overwrite Back/Forward.
  const [draft, setDraft] = useState({ source: parameterKey, value: keyword });
  const search = draft.source === parameterKey ? draft.value : keyword;
  const setSearch = (value: string) =>
    setDraft({ source: parameterKey, value });
  useEffect(() => {
    setDraft({ source: parameterKey, value: keyword });
  }, [parameterKey, keyword]);
  const navigationQuery =
    search.trim() === keyword
      ? query
      : {
          ...query,
          keyword: search.trim().slice(0, 200) || undefined,
          page: 1,
        };
  const navigationKey = serializeListQuery(navigationQuery).toString();
  const [datesOpen, setDatesOpen] = useState(
    Boolean(query.fromDate || query.toDate),
  );
  useEffect(() => {
    if (query.fromDate || query.toDate) setDatesOpen(true);
  }, [query.fromDate, query.toDate]);
  useEffect(() => {
    if (parameterKey !== canonical) setParameters(canonical, { replace: true });
  }, [parameterKey, canonical, setParameters]);
  useEffect(() => {
    if (search.trim() === keyword) return;
    const timer = window.setTimeout(() => {
      setParameters(
        serializeListQuery({
          ...query,
          keyword: search.trim().slice(0, 200) || undefined,
          page: 1,
        }),
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, keyword, query, setParameters]);
  const dateError = Boolean(
    query.fromDate && query.toDate && query.toDate < query.fromDate,
  );
  const result = useQuery({
    queryKey: ['invoices', query],
    queryFn: ({ signal }) => {
      const parameters = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '')
          parameters.set(key, String(value));
      });
      return api<InvoiceList>(`/invoices?${parameters}`, { signal });
    },
    placeholderData: keepPreviousData,
    enabled: !dateError,
  });
  const update = (values: Partial<InvoiceQuery>) =>
    setParameters(
      serializeListQuery({ ...navigationQuery, ...values, page: 1 }),
    );
  const total = result.data?.paging.total ?? 0,
    totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  useEffect(() => {
    if (
      result.data &&
      !result.isPlaceholderData &&
      !result.isFetching &&
      !dateError &&
      query.page > totalPages
    ) {
      setParameters(serializeListQuery({ ...query, page: totalPages }), {
        replace: true,
      });
    }
  }, [
    result.data,
    result.isPlaceholderData,
    result.isFetching,
    dateError,
    query,
    totalPages,
    setParameters,
  ]);
  const isFiltered = Boolean(
    query.keyword || query.status || query.fromDate || query.toDate,
  );
  const clear = () => {
    setSearch('');
    setParameters(
      serializeListQuery({
        ...query,
        page: 1,
        keyword: undefined,
        status: undefined,
        fromDate: undefined,
        toDate: undefined,
      }),
    );
  };
  return (
    <div className="page-body">
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">YOUR WORKSPACE</div>
          <h1>
            Invoices<span className="title-dot">.</span>
          </h1>
          <p>A clear view of what’s sent, settled, and still to come.</p>
        </div>
        <Button asChild size="lg">
          <Link to={`/invoices/new?${navigationKey}`}>
            <Plus size={18} />
            Create invoice
          </Link>
        </Button>
      </div>
      <div className="register-overview">
        <div>
          <span className="overview-icon">
            <FileText size={21} />
          </span>
          <div>
            <span className="eyebrow muted">
              {isFiltered ? 'MATCHING INVOICES' : 'INVOICE REGISTER'}
            </span>
            <strong>
              {result.isPending ? '—' : total.toLocaleString()}
              <small>{total === 1 ? 'invoice' : 'invoices'}</small>
            </strong>
          </div>
        </div>
        <p>
          Every detail accounted for.
          <br />
          <span>Search your records or start something new.</span>
        </p>
        <span className="overview-label">
          <span className="live-dot" />
          YOUR RECORDS, ORGANIZED
        </span>
      </div>
      <section className="panel invoice-register" aria-label="Invoice register">
        <div className="register-heading">
          <h2>All invoices</h2>
          <span role="status" aria-live="polite" aria-atomic="true">
            {result.isFetching || search.trim() !== (query.keyword ?? '')
              ? 'Updating…'
              : `${total} ${isFiltered ? 'matching' : 'total'}`}
          </span>
        </div>
        <div className="filter-toolbar">
          <div className="search-input">
            <Search size={18} />
            <Input
              aria-label="Search invoices"
              maxLength={200}
              placeholder="Search invoice number or customer…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <select
            aria-label="Filter by status"
            value={query.status ?? ''}
            onChange={(event) =>
              update({
                status: (event.target.value as InvoiceStatus) || undefined,
              })
            }
          >
            <option value="">All statuses</option>
            {['Draft', 'Pending', 'Paid', 'Overdue'].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select
            aria-label="Sort by"
            value={query.sortBy}
            onChange={(event) =>
              update({ sortBy: event.target.value as InvoiceQuery['sortBy'] })
            }
          >
            <option value="invoiceDate">Invoice date</option>
            <option value="dueDate">Due date</option>
            <option value="totalAmount">Total amount</option>
          </select>
          <Button
            variant="outline"
            size="icon"
            aria-label={
              query.ordering === 'ASC' ? 'Sort descending' : 'Sort ascending'
            }
            title={`Currently ${query.ordering === 'ASC' ? 'ascending' : 'descending'}`}
            onClick={() =>
              update({ ordering: query.ordering === 'ASC' ? 'DESC' : 'ASC' })
            }
          >
            {query.ordering === 'ASC' ? (
              <ArrowUp size={17} />
            ) : (
              <ArrowDown size={17} />
            )}
          </Button>
          <Button
            variant={datesOpen ? 'secondary' : 'outline'}
            size="icon"
            aria-label="Toggle invoice date filters"
            aria-expanded={datesOpen}
            aria-controls="invoice-date-filters"
            onClick={() => setDatesOpen(!datesOpen)}
          >
            <SlidersHorizontal size={17} />
          </Button>
        </div>
        {datesOpen && (
          <div className="date-filters" id="invoice-date-filters">
            <CalendarDays size={18} />
            <label>
              From date
              <Input
                type="date"
                aria-invalid={dateError}
                aria-describedby={dateError ? 'invoice-date-error' : undefined}
                value={query.fromDate ?? ''}
                onChange={(event) =>
                  update({ fromDate: event.target.value || undefined })
                }
              />
            </label>
            <label>
              To date
              <Input
                type="date"
                aria-invalid={dateError}
                aria-describedby={dateError ? 'invoice-date-error' : undefined}
                value={query.toDate ?? ''}
                onChange={(event) =>
                  update({ toDate: event.target.value || undefined })
                }
              />
            </label>
            <span>Filters apply to the invoice date.</span>
          </div>
        )}
        {dateError && (
          <p className="filter-error" id="invoice-date-error" role="alert">
            To date must be on or after from date.
          </p>
        )}
        {isFiltered && (
          <div className="active-filters">
            <span>
              Filters applied{query.status ? ` · ${query.status}` : ''}
              {query.fromDate || query.toDate
                ? ` · ${query.fromDate ?? 'Any date'} → ${query.toDate ?? 'Any date'}`
                : ''}
            </span>
            <button onClick={clear}>
              Clear all
              <X size={13} />
            </button>
          </div>
        )}
        {dateError ? (
          <div className="empty-state">
            <p>Adjust the date range to load invoices.</p>
          </div>
        ) : result.isPending ? (
          <Loading label="Loading your invoices…" />
        ) : result.isError && !result.data ? (
          <ErrorState
            message={errorMessage(result.error)}
            retry={() => void result.refetch()}
          />
        ) : (
          <>
            {result.isError && (
              <ErrorState
                message={errorMessage(result.error)}
                retry={() => void result.refetch()}
              />
            )}
            {!result.data?.data.length ? (
              <div className="empty-state">
                <span className="empty-icon">
                  <FileText size={28} />
                </span>
                <h3>
                  {isFiltered
                    ? 'No invoices match your search.'
                    : 'Your next chapter starts here.'}
                </h3>
                <p>
                  {isFiltered
                    ? 'Try another customer name, invoice number, or filter.'
                    : 'Create your first invoice to get your register started.'}
                </p>
                {isFiltered ? (
                  <Button variant="outline" onClick={clear}>
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to={`/invoices/new?${navigationKey}`}>
                      <Plus size={16} />
                      Create invoice
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={`table-scroll ${result.isPlaceholderData ? 'table-updating' : ''}`}
                aria-busy={result.isFetching}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Invoice number</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Invoice date</th>
                      <th scope="col">Due date</th>
                      <th scope="col" className="amount-cell">
                        Total amount
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="sr-only">View details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.data.map((invoice) => (
                      <tr key={invoice.invoiceId}>
                        <td>
                          <Link
                            className="invoice-link"
                            to={`/invoices/${invoice.invoiceId}?${navigationKey}`}
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <span className="table-subtext">
                            {invoice.invoiceReference || '—'}
                          </span>
                        </td>
                        <td>
                          <strong className="customer-name">
                            {invoice.customer.fullname}
                          </strong>
                          <span className="table-subtext">
                            {invoice.customer.email}
                          </span>
                        </td>
                        <td>{dateLabel(invoice.invoiceDate)}</td>
                        <td
                          className={
                            invoice.status === 'Overdue' ? 'overdue-date' : ''
                          }
                        >
                          {dateLabel(invoice.dueDate)}
                        </td>
                        <td className="amount-cell">
                          {money(invoice.totalAmount, invoice.currency)}
                        </td>
                        <td>
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td>
                          <Link
                            className="row-action"
                            aria-label={`View invoice ${invoice.invoiceNumber}`}
                            to={`/invoices/${invoice.invoiceId}?${navigationKey}`}
                          >
                            <ArrowUpRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <div className="pagination">
          <div>
            <span>
              {total && result.data?.data.length
                ? `${(query.page - 1) * query.pageSize + 1}–${Math.min(query.page * query.pageSize, total)} of ${total}`
                : '0 invoices'}
            </span>
            <label>
              Per page
              <select
                aria-label="Records per page"
                value={query.pageSize}
                onChange={(event) =>
                  update({ pageSize: Number(event.target.value) })
                }
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span>
              Page {query.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={query.page <= 1 || result.isFetching || dateError}
              onClick={() =>
                setParameters(
                  serializeListQuery({ ...query, page: query.page - 1 }),
                )
              }
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={
                query.page >= totalPages || result.isFetching || dateError
              }
              onClick={() =>
                setParameters(
                  serializeListQuery({ ...query, page: query.page + 1 }),
                )
              }
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>
      </section>
      <p className="list-note">
        Overdue labels update automatically when an unpaid invoice passes its
        due date.
      </p>
    </div>
  );
}
