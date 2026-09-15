import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../users/user.entity';
import { InvoiceEntity } from '../../invoices/infrastructure/invoice.entity';
import { InvoiceItemEntity } from '../../invoices/infrastructure/invoice-item.entity';
import {
  calculateAmounts,
  StoredStatus,
  utcToday,
} from '../../invoices/domain/invoice.logic';
export async function seedDatabase(
  source: DataSource,
  credentials: { email: string; password: string; fullname: string },
) {
  const users = source.getRepository(UserEntity);
  const email = credentials.email.trim().toLowerCase();
  let user = await users.findOneBy({ email });
  const fixedId = 'ad1e0902-1928-4345-b513-60c86c94fc91';
  if (!user)
    user = await users.save(
      users.create({
        ...((await users.existsBy({ id: fixedId })) ? {} : { id: fixedId }),
        email,
        passwordHash: await hash(credentials.password, 12),
        fullname: credentials.fullname,
      }),
    );
  const invoices = source.getRepository(InvoiceEntity);
  const records: Partial<InvoiceEntity>[] = [
    {
      invoiceId: '099ca7da-a290-40fa-93b9-1c43ae7bb887',
      invoiceNumber: 'IV1780488206995',
      invoiceReference: '#5721662',
      invoiceDate: '2026-06-03',
      dueDate: '2026-07-03',
      createdAt: new Date('2026-06-03T12:03:26.995Z'),
      customerName: 'Paul',
      customerEmail: 'paul@101digital.io',
      customerMobile: '947717364111',
      customerAddress: 'Singapore',
      description: 'Invoice is issued to Kanglee',
      currency: 'AUD',
      currencySymbol: 'AU$',
      taxPercent: '10.0000',
      status: 'Pending',
      ...calculateAmounts(2, 1000, 10, 20, '1451.34'),
      createdBy: user.id,
      items: [
        {
          id: 'b1c2d3e4-0000-0000-0000-000000000001',
          name: 'Honda RC150',
          quantity: 2,
          rate: '1000.00',
        } as InvoiceItemEntity,
      ],
    },
  ];
  const names = [
    'Northstar Studio',
    'Olivia Chen',
    'Acme Consulting',
    'Cedar & Co.',
    'James Wilson',
    'Atlas Design',
    'Maya Patel',
    'Harbor Coffee',
    'Vertex Labs',
    'Evergreen Supply',
  ];
  const items = [
    'Brand identity design',
    'Website development',
    'Monthly consulting',
    'Product photography',
    'Software license',
    'Print production',
  ];
  const dateOffset = (days: number) => {
    const date = new Date(utcToday() + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return utcToday(date);
  };
  for (let index = 1; index <= 40; index++) {
    const status: StoredStatus = (['Draft', 'Pending', 'Paid'] as const)[
      index % 3
    ];
    const quantity = 1 + (index % 5),
      rate = 85 + index * 37.25,
      tax = index % 4 === 0 ? 0 : 10,
      discount = index % 5 === 0 ? 25 : 0;
    const base = calculateAmounts(quantity, rate, tax, discount);
    const paid =
      status === 'Paid'
        ? base.totalAmount
        : status === 'Pending' && index % 2 === 0
          ? '100.00'
          : '0.00';
    records.push({
      invoiceNumber: `INV-${String(index).padStart(4, '0')}`,
      invoiceReference: `PO-${2100 + index}`,
      invoiceDate: dateOffset(-60 + index),
      dueDate: dateOffset(-30 + index * 2),
      currency: 'AUD',
      currencySymbol: 'AU$',
      customerName: names[(index - 1) % names.length],
      customerEmail: `accounts${index}@example.com`,
      customerAddress:
        index % 2
          ? '120 Collins Street, Melbourne VIC 3000, Australia'
          : '14 Cecil Street, Singapore 049705',
      customerMobile: index % 3 ? '+61 400 123 456' : null,
      description:
        'Thank you for your business. Please include the invoice number with your payment.',
      taxPercent: tax.toFixed(4),
      status,
      createdBy: user.id,
      ...calculateAmounts(quantity, rate, tax, discount, paid),
      items: [
        {
          name: items[index % items.length],
          quantity,
          rate: rate.toFixed(2),
        } as InvoiceItemEntity,
      ],
    });
  }
  let count = 0;
  // Idempotent and non-destructive: existing reviewer-created invoices are untouched.
  for (const values of records) {
    if (await invoices.existsBy({ invoiceNumber: values.invoiceNumber! }))
      continue;
    await invoices.save(invoices.create(values));
    count++;
  }
  return { count, email };
}
