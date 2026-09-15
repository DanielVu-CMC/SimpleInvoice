import Decimal from 'decimal.js';
const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const STORED_STATUSES = ['Draft', 'Pending', 'Paid'] as const;
export const INVOICE_STATUSES = [...STORED_STATUSES, 'Overdue'] as const;
export type StoredStatus = (typeof STORED_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
export function deriveStatus(
  status: StoredStatus,
  dueDate: string,
  today = utcToday(),
): InvoiceStatus {
  return status !== 'Paid' && dueDate < today ? 'Overdue' : status;
}
// Decimal arithmetic and explicit cent rounding avoid IEEE-754 money errors.
export function calculateAmounts(
  quantity: number,
  rate: number | string,
  taxPercent: number | string = 10,
  discount: number | string = 0,
  totalPaid: number | string = 0,
) {
  const subTotal = new Money(quantity)
    .mul(rate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const tax = subTotal
    .mul(taxPercent)
    .div(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const totalDiscount = new Money(discount).toDecimalPlaces(
    2,
    Decimal.ROUND_HALF_UP,
  );
  const total = subTotal.plus(tax).minus(totalDiscount);
  return {
    invoiceSubTotal: subTotal.toFixed(2),
    totalTax: tax.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    totalAmount: total.toFixed(2),
    totalPaid: new Money(totalPaid).toFixed(2),
    balanceAmount: total.minus(totalPaid).toFixed(2),
  };
}
