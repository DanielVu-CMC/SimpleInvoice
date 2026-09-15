import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';
import { ListInvoicesDto } from './list-invoices.dto';
const valid = () => ({
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  customer: { fullname: 'Paul', email: 'paul@example.com' },
  item: { name: 'Consulting', quantity: 2, rate: 10.25 },
});
const errors = (value: object) =>
  validate(plainToInstance(CreateInvoiceDto, value), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
describe('Create invoice validation', () => {
  it('accepts the required fields and supplies tax/discount defaults', async () => {
    expect(await errors(valid())).toHaveLength(0);
    expect(plainToInstance(CreateInvoiceDto, valid())).toMatchObject({
      taxPercent: 10,
      discount: 0,
    });
  });
  it('accepts same-day due dates', async () =>
    expect(await errors({ ...valid(), dueDate: '2026-06-03' })).toHaveLength(
      0,
    ));
  it.each([
    '2026-02-30',
    '2025-02-29',
    '06/03/2026',
    '0000-01-01',
    '2026-06-03T00:00:00Z',
  ])('rejects invalid calendar date %s', async (invoiceDate) =>
    expect((await errors({ ...valid(), invoiceDate })).length).toBeGreaterThan(
      0,
    ),
  );
  it('accepts leap dates', async () =>
    expect(
      await errors({
        ...valid(),
        invoiceDate: '2028-02-29',
        dueDate: '2028-02-29',
      }),
    ).toHaveLength(0));
  it('rejects a due date before the invoice date', async () => {
    const result = await errors({ ...valid(), dueDate: '2026-06-02' });
    expect(
      result.find((e) => e.property === 'dueDate')?.constraints,
    ).toMatchObject({ isOnOrAfter: 'dueDate must be on or after invoiceDate' });
  });
  it.each([0, -1, 1.5])('rejects quantity %s', async (quantity) =>
    expect(
      (await errors({ ...valid(), item: { ...valid().item, quantity } }))
        .length,
    ).toBeGreaterThan(0),
  );
  it.each([0, -10, 0.001])('rejects rate %s', async (rate) =>
    expect(
      (await errors({ ...valid(), item: { ...valid().item, rate } })).length,
    ).toBeGreaterThan(0),
  );
  it.each([
    { customer: undefined },
    { item: undefined },
    { taxPercent: null },
    { discount: null },
    { invoiceNumber: '   ' },
    { currency: 'XYZ' },
    { status: 'Paid' },
    { totalAmount: 1 },
    { items: [] },
  ])('rejects missing, invalid or server-owned values %j', async (override) =>
    expect((await errors({ ...valid(), ...override })).length).toBeGreaterThan(
      0,
    ),
  );
  it('validates customer email and name', async () =>
    expect(
      (
        await errors({
          ...valid(),
          customer: { fullname: ' ', email: 'invalid' },
        })
      ).length,
    ).toBeGreaterThan(0));
});
describe('List query validation', () => {
  it('transforms numeric query parameters', async () => {
    const dto = plainToInstance(ListInvoicesDto, { page: '2', pageSize: '20' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
  });
  it.each([
    { page: 0 },
    { pageSize: 101 },
    { sortBy: 'DROP TABLE' },
    { ordering: 'down' },
    { fromDate: '2026-03-02', toDate: '2026-03-01' },
  ])('rejects invalid query %j', async (value) =>
    expect(
      (await validate(plainToInstance(ListInvoicesDto, value))).length,
    ).toBeGreaterThan(0),
  );
});
