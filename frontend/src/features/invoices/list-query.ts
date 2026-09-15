import type { InvoiceQuery, InvoiceStatus } from '@/services/api/types';
import { validDate } from './create-schema';
export const PAGE_SIZES = [5, 10, 20, 50, 100];
const configuredSize = Number(import.meta.env.VITE_PAGE_SIZE || 10);
const defaultSize = PAGE_SIZES.includes(configuredSize) ? configuredSize : 10;
/** Normalize untrusted URL values before using them in controls or API requests. */
export function parseListQuery(parameters: URLSearchParams): InvoiceQuery {
  const page = parameters.get('page') ?? '1';
  const size = Number(parameters.get('pageSize') ?? defaultSize);
  const sort = parameters.get('sortBy');
  const status = parameters.get('status');
  const date = (key: string) => {
    const value = parameters.get(key) ?? '';
    return validDate(value) ? value : undefined;
  };
  return {
    page:
      /^\d+$/.test(page) && Number(page) >= 1 && Number(page) <= 1000000
        ? Number(page)
        : 1,
    pageSize: PAGE_SIZES.includes(size) ? size : defaultSize,
    sortBy: sort === 'dueDate' || sort === 'totalAmount' ? sort : 'invoiceDate',
    ordering: parameters.get('ordering') === 'ASC' ? 'ASC' : 'DESC',
    status: ['Draft', 'Pending', 'Paid', 'Overdue'].includes(status ?? '')
      ? (status as InvoiceStatus)
      : undefined,
    keyword: parameters.get('keyword')?.trim().slice(0, 200) || undefined,
    fromDate: date('fromDate'),
    toDate: date('toDate'),
  };
}
export function serializeListQuery(query: InvoiceQuery): URLSearchParams {
  const parameters = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') parameters.set(key, String(value));
  });
  return parameters;
}
