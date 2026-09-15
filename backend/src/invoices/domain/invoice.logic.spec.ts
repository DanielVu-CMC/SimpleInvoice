import { calculateAmounts, deriveStatus, utcToday } from './invoice.logic';
describe('Invoice amounts', () => {
  it('reproduces the Appendix A amounts', () =>
    expect(calculateAmounts(2, 1000, 10, 20, '1451.34')).toEqual({
      invoiceSubTotal: '2000.00',
      totalTax: '200.00',
      totalDiscount: '20.00',
      totalAmount: '2180.00',
      totalPaid: '1451.34',
      balanceAmount: '728.66',
    }));
  it('uses defaults for tax, discount and payment', () =>
    expect(calculateAmounts(1, 100)).toMatchObject({
      totalTax: '10.00',
      totalDiscount: '0.00',
      totalAmount: '110.00',
      balanceAmount: '110.00',
    }));
  it('handles fractional rates without floating point errors', () =>
    expect(calculateAmounts(3, '0.10', 0).totalAmount).toBe('0.30'));
  it('rounds half cents up for tax', () =>
    expect(calculateAmounts(1, '0.05', 10).totalTax).toBe('0.01'));
  it('supports tax-free invoices and full payment', () =>
    expect(calculateAmounts(2, 50, 0, 10, 90)).toMatchObject({
      totalTax: '0.00',
      totalAmount: '90.00',
      balanceAmount: '0.00',
    }));
  it('preserves cents when the largest allowed rate, quantity and tax are combined', () => {
    expect(
      calculateAmounts(1000000, '999999999999.99', '9999.9999').totalAmount,
    ).toBe('100999998999998990000.01');
  });
  it('preserves high precision large totals', () =>
    expect(calculateAmounts(1000000, '999999999999.99', 0).totalAmount).toBe(
      '999999999999990000.00',
    ));
});
describe('Derived overdue status', () => {
  it.each(['Draft', 'Pending'] as const)(
    'derives overdue for past-due %s invoices',
    (status) =>
      expect(deriveStatus(status, '2026-06-02', '2026-06-03')).toBe('Overdue'),
  );
  it('keeps past-due Paid invoices Paid', () =>
    expect(deriveStatus('Paid', '2026-01-01', '2026-06-03')).toBe('Paid'));
  it.each(['Draft', 'Pending', 'Paid'] as const)(
    'does not mark invoices due today overdue (%s)',
    (status) =>
      expect(deriveStatus(status, '2026-06-03', '2026-06-03')).toBe(status),
  );
  it('keeps future invoices as persisted', () =>
    expect(deriveStatus('Draft', '2026-07-03', '2026-06-03')).toBe('Draft'));
  it('uses UTC calendar boundaries', () =>
    expect(utcToday(new Date('2026-06-03T23:00:00-04:00'))).toBe('2026-06-04'));
});
