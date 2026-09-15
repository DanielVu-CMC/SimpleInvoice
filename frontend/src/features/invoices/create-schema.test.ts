import { describe, it, expect } from 'vitest';
import { createSchema, validDate } from './create-schema';
const payload = () => ({
  invoiceNumber: 'INV-1',
  invoiceDate: '2026-06-03',
  dueDate: '2026-06-03',
  currency: 'AUD',
  customer: { fullname: 'Paul', email: 'paul@example.com' },
  item: { name: 'Service', quantity: 1, rate: 20 },
  taxPercent: 10,
  discount: 0,
});
describe('Client-side create validation', () => {
  it('accepts the required values and a same-day due date', async () =>
    expect(await createSchema.validate(payload())).toEqual(payload()));
  it.each([
    { dueDate: '2026-06-02' },
    { invoiceDate: '2026-02-30' },
    { taxPercent: -1 },
    { discount: -1 },
    { item: { name: 'Service', quantity: 1.5, rate: 20 } },
    { item: { name: 'Service', quantity: 1, rate: 0 } },
    { item: { name: 'Service', quantity: 1, rate: 1.111 } },
  ])('rejects invalid values %j', async (override) =>
    expect(
      createSchema.validate({ ...payload(), ...override }),
    ).rejects.toThrow(),
  );
  it('applies defaults for optional blank tax and discount inputs', async () => {
    expect(
      await createSchema.validate({
        ...payload(),
        taxPercent: NaN,
        discount: NaN,
      }),
    ).toMatchObject({ taxPercent: 10, discount: 0 });
  });
  it('recognizes leap days correctly', () => {
    expect(validDate('2028-02-29')).toBe(true);
    expect(validDate('2026-02-29')).toBe(false);
  });
});
