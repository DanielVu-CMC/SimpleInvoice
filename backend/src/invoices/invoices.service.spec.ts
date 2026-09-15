import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './infrastructure/invoices.repository';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
const create = (): CreateInvoiceDto => ({
  invoiceNumber: 'INV-1',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  customer: { fullname: 'Paul', email: 'paul@example.com' },
  item: { name: 'Consulting', quantity: 2, rate: 100 },
  taxPercent: 10,
  discount: 0,
});
describe('Invoice service boundaries', () => {
  const repository = { create: jest.fn(), find: jest.fn(), list: jest.fn() };
  const service = new InvoicesService(
    repository as unknown as InvoicesRepository,
  );
  beforeEach(() => jest.resetAllMocks());
  it('translates the database unique-number constraint to HTTP conflict', async () => {
    repository.create.mockRejectedValue(
      new QueryFailedError('INSERT', [], {
        code: '23505',
        constraint: 'invoices_number_unique',
      } as unknown as Error),
    );
    await expect(service.create(create(), 'user')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('does not disguise unrelated database failures as duplicate invoice errors', async () => {
    const error = new Error('connection');
    repository.create.mockRejectedValue(error);
    await expect(service.create(create(), 'user')).rejects.toBe(error);
  });
  it('rejects negative invoice totals before inserting', async () => {
    await expect(
      service.create({ ...create(), discount: 221 }, 'user'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('guards due dates at the service boundary', async () => {
    await expect(
      service.create({ ...create(), dueDate: '2026-06-02' }, 'user'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('returns a clear not-found error', async () => {
    repository.find.mockResolvedValue(null);
    await expect(service.detail('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
