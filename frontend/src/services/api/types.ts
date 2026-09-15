export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue';
export type User = {
  tokenExpiresAt?: number;
  id: string;
  email: string;
  fullname: string;
  createdAt: string;
};
export type Invoice = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference: string | null;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description: string | null;
  status: InvoiceStatus;
  customer: {
    fullname: string;
    email: string;
    mobileNumber?: string;
    address?: string;
  };
  items: {
    id: string;
    invoiceId: string;
    name: string;
    quantity: number;
    rate: string;
  }[];
  taxPercent: string;
  invoiceSubTotal: string;
  totalTax: string;
  totalDiscount: string;
  totalAmount: string;
  totalPaid: string;
  balanceAmount: string;
  createdAt: string;
  createdBy: string;
};
export type InvoiceQuery = {
  page: number;
  pageSize: number;
  sortBy: 'invoiceDate' | 'dueDate' | 'totalAmount';
  ordering: 'ASC' | 'DESC';
  keyword?: string;
  status?: InvoiceStatus;
  fromDate?: string;
  toDate?: string;
};
export type InvoiceList = {
  data: Invoice[];
  paging: { page: number; pageSize: number; total: number };
};
export type CreateInvoice = {
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  description?: string;
  customer: {
    fullname: string;
    email: string;
    mobileNumber?: string;
    address?: string;
  };
  item: { name: string; quantity: number; rate: number };
  taxPercent: number;
  discount: number;
};
