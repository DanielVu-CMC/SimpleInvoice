import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App, { queryClient } from './app';
import { api, ApiError } from './services/api/client';
import type { Invoice, InvoiceList } from './services/api/types';
vi.mock('./services/api/client', async (original) => ({
  ...(await original<typeof import('./services/api/client')>()),
  api: vi.fn(),
}));
const user = {
  id: 'user-1',
  email: 'reviewer@example.com',
  fullname: 'Alex Morgan',
  createdAt: '2026-06-03T12:00:00Z',
};
const invoice: Invoice = {
  invoiceId: 'invoice-1',
  invoiceNumber: 'INV-0001',
  invoiceReference: 'PO-2101',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  currencySymbol: 'AU$',
  description: 'Thank you.',
  status: 'Pending',
  customer: {
    fullname: 'Paul',
    email: 'paul@example.com',
    mobileNumber: '123',
    address: 'Singapore',
  },
  items: [
    {
      id: 'item-1',
      invoiceId: 'invoice-1',
      name: 'Honda RC150',
      quantity: 2,
      rate: '1000.00',
    },
  ],
  taxPercent: '10.0000',
  invoiceSubTotal: '2000.00',
  totalTax: '200.00',
  totalDiscount: '20.00',
  totalAmount: '2180.00',
  totalPaid: '1451.34',
  balanceAmount: '728.66',
  createdAt: '2026-06-03T12:00:00Z',
  createdBy: 'user-1',
};
const mockApi = vi.mocked(api);
beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  mockApi.mockImplementation(async (path) => {
    if (path === '/auth/me') return user as never;
    if (path === '/auth/login') return { user } as never;
    if (path === '/auth/logout') return undefined as never;
    if (path.startsWith('/invoices?')) {
      const parameters = new URLSearchParams(path.split('?')[1]);
      return {
        data: [invoice],
        paging: {
          page: Number(parameters.get('page') || 1),
          pageSize: Number(parameters.get('pageSize') || 10),
          total: 41,
        },
      } as InvoiceList as never;
    }
    return invoice as never;
  });
});
const open = (path: string) => {
  window.history.replaceState({}, '', path);
  render(<App />);
};
describe('Authentication and protected routes', () => {
  it('redirects unauthenticated users to login and validates empty fields', async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, ['Unauthorized']));
    open('/invoices/new');
    await screen.findByRole('heading', { name: 'Make yourself at home.' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
  it('logs in with validated inputs and lands on the invoice list', async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, ['Unauthorized']));
    open('/login');
    await userEvent.type(
      await screen.findByLabelText('Email address'),
      'reviewer@example.com',
    );
    await userEvent.type(screen.getByLabelText('Password'), 'demo-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { name: 'Invoices.' });
    expect(mockApi).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'reviewer@example.com',
          password: 'demo-password',
        }),
      }),
    );
  });
  it('shows rejected credentials and supports password visibility', async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, ['Unauthorized']));
    open('/login');
    await userEvent.type(
      await screen.findByLabelText('Email address'),
      'reviewer@example.com',
    );
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    mockApi.mockRejectedValueOnce(
      new ApiError(401, ['Invalid email or password']),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    );
  });
  it('redirects to login after session expiry', async () => {
    open('/invoices');
    await screen.findByRole('heading', { name: 'Invoices.' });
    fireEvent(window, new Event('session-expired'));
    await screen.findByRole('heading', { name: 'Make yourself at home.' });
  });
  it('expires a protected creation screen without waiting for another API request', async () => {
    mockApi.mockResolvedValueOnce({
      ...user,
      tokenExpiresAt: Date.now() + 500,
    });
    open('/invoices/new');
    await screen.findByRole('heading', { name: 'Create invoice.' });
    await screen.findByRole('heading', { name: 'Make yourself at home.' });
  });
  it('signs out and clears protected content', async () => {
    open('/invoices');
    await screen.findByRole('heading', { name: 'Invoices.' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Make yourself at home.' });
    expect(mockApi).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
  });
  it('shows API unavailability with a working retry', async () => {
    mockApi.mockRejectedValueOnce(new Error('offline'));
    open('/invoices');
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { name: 'Invoices.' });
  });
});
describe('Invoice list controls', () => {
  it('restores all list controls from the URL and retains them across detail navigation', async () => {
    open(
      '/invoices?page=2&pageSize=5&keyword=Paul&status=Paid&sortBy=totalAmount&ordering=ASC&fromDate=2026-01-01&toDate=2026-12-31',
    );
    await screen.findByRole('link', { name: 'INV-0001' });
    expect(screen.getByLabelText('Search invoices')).toHaveValue('Paul');
    expect(screen.getByLabelText('Filter by status')).toHaveValue('Paid');
    expect(screen.getByLabelText('Records per page')).toHaveValue('5');
    expect(screen.getByLabelText('From date')).toHaveValue('2026-01-01');
    const original = window.location.search;
    await userEvent.click(screen.getByRole('link', { name: 'INV-0001' }));
    await screen.findByRole('heading', { name: 'INV-0001' });
    await userEvent.click(
      screen.getByRole('link', { name: 'Back to invoices' }),
    );
    await screen.findByRole('heading', { name: 'Invoices.' });
    expect(window.location.search).toBe(original);
    expect(screen.getByText('Page 2 of 9')).toBeInTheDocument();
  });
  it('links login validation errors to their fields and focuses the first error', async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, ['Unauthorized']));
    open('/login');
    await screen.findByLabelText('Email address');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Email is required');
    const email = screen.getByLabelText('Email address');
    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription('Email is required');
    expect(email).toHaveAttribute('aria-required', 'true');
  });

  it('renders invoice fields, amounts and status', async () => {
    open('/invoices');
    await screen.findByRole('link', { name: 'INV-0001' });
    expect(screen.getByText('Paul')).toBeInTheDocument();
    expect(screen.getByText('AUD 2,180.00')).toBeInTheDocument();
    expect(
      screen.getByText('Pending', { selector: '.status-badge' }),
    ).toBeInTheDocument();
  });
  it('debounces search and sends server-side filters and sorting', async () => {
    open('/invoices');
    await screen.findByRole('link', { name: 'INV-0001' });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Search invoices' }),
      'Paul',
    );
    await waitFor(() =>
      expect(
        mockApi.mock.calls.some(([path]) => path.includes('keyword=Paul')),
      ).toBe(true),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Filter by status'),
      'Paid',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Sort by'),
      'totalAmount',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sort ascending' }),
    );
    await waitFor(() =>
      expect(
        mockApi.mock.calls.some(
          ([path]) =>
            path.includes('status=Paid') &&
            path.includes('sortBy=totalAmount') &&
            path.includes('ordering=ASC'),
        ),
      ).toBe(true),
    );
  });
  it('changes pagination and page size on the server', async () => {
    open('/invoices');
    await screen.findByRole('link', { name: 'INV-0001' });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(mockApi.mock.calls.some(([path]) => path.includes('page=2'))).toBe(
        true,
      ),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Records per page'),
      '20',
    );
    await waitFor(() =>
      expect(
        mockApi.mock.calls.some(
          ([path]) => path.includes('page=1') && path.includes('pageSize=20'),
        ),
      ).toBe(true),
    );
  });
  it('shows an empty search result and allows clearing filters', async () => {
    open('/invoices');
    await screen.findByRole('link', { name: 'INV-0001' });
    mockApi.mockResolvedValueOnce({
      data: [],
      paging: { page: 1, pageSize: 10, total: 0 },
    });
    await userEvent.selectOptions(
      screen.getByLabelText('Filter by status'),
      'Overdue',
    );
    await screen.findByText('No invoices match your search.');
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear filters' }),
    );
    await screen.findByRole('link', { name: 'INV-0001' });
  });
  it('prevents requests for an inverted invoice date range', async () => {
    open('/invoices');
    await screen.findByRole('link', { name: 'INV-0001' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Toggle invoice date filters' }),
    );
    fireEvent.change(screen.getByLabelText('From date'), {
      target: { value: '2026-07-03' },
    });
    fireEvent.change(screen.getByLabelText('To date'), {
      target: { value: '2026-06-03' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'To date must be on or after from date.',
    );
    expect(
      mockApi.mock.calls.some(([path]) => path.includes('toDate=2026-06-03')),
    ).toBe(false);
  });
});
describe('Invoice creation and details', () => {
  it('validates critical creation fields before contacting the API', async () => {
    open('/invoices/new');
    await screen.findByRole('heading', { name: 'Create invoice.' });
    await userEvent.click(screen.getByRole('button', { name: 'Save invoice' }));
    await screen.findByText('Customer name is required');
    expect(screen.getByText('Customer email is required')).toBeInTheDocument();
    expect(screen.getByText('Invoice number is required')).toBeInTheDocument();
    expect(
      mockApi.mock.calls.some(
        ([path, options]) => path === '/invoices' && options?.method === 'POST',
      ),
    ).toBe(false);
  });
  it('creates one item with numeric inputs and redirects on success', async () => {
    open('/invoices/new');
    await screen.findByRole('heading', { name: 'Create invoice.' });
    for (const [label, value] of [
      ['Customer name', 'New Customer'],
      ['Customer email', 'new@example.com'],
      ['Invoice number', 'NEW-001'],
      ['Item name', 'Consulting'],
      ['Rate', '100.25'],
    ])
      await userEvent.type(
        screen.getByLabelText(new RegExp(`^${label}`)),
        value,
      );
    await userEvent.click(screen.getByRole('button', { name: 'Save invoice' }));
    await screen.findByRole('heading', { name: 'Invoices.' });
    const body = JSON.parse(
      mockApi.mock.calls.find(
        ([path, options]) => path === '/invoices' && options?.method === 'POST',
      )![1]!.body as string,
    );
    expect(body).toMatchObject({
      item: { quantity: 1, rate: 100.25, name: 'Consulting' },
      taxPercent: 10,
      discount: 0,
    });
    expect(body).not.toHaveProperty('totalAmount');
    expect(body).not.toHaveProperty('status');
  });
  it('shows invoice detail and the backend-computed outstanding balance', async () => {
    open('/invoices/invoice-1');
    await screen.findByRole('heading', { name: 'INV-0001' });
    expect(screen.getByText('Honda RC150')).toBeInTheDocument();
    expect(screen.getByText('Singapore')).toBeInTheDocument();
    expect(screen.getAllByText('AUD 728.66')).toHaveLength(2);
    expect(screen.getByText('AUD 1,451.34')).toBeInTheDocument();
  });
  it('shows a useful missing invoice message', async () => {
    mockApi
      .mockImplementationOnce(async () => user as never)
      .mockRejectedValueOnce(new ApiError(404, ['Invoice not found']));
    open('/invoices/missing');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invoice could not be found.',
    );
  });
});
