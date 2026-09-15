import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import Decimal from 'decimal.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import {
  calculateAmounts,
  deriveStatus,
  utcToday,
} from './domain/invoice.logic';
import { InvoiceEntity } from './infrastructure/invoice.entity';
import { InvoicesRepository } from './infrastructure/invoices.repository';
function currencySymbol(currency: string): string {
  return currency === 'AUD'
    ? 'AU$'
    : (new Intl.NumberFormat('en-GB', { style: 'currency', currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency);
}
@Injectable()
export class InvoicesService {
  constructor(private readonly repository: InvoicesRepository) {}
  private present(
    invoice: InvoiceEntity,
    today = utcToday(),
  ): InvoiceResponseDto {
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceReference: invoice.invoiceReference,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      currencySymbol: invoice.currencySymbol,
      description: invoice.description,
      status: deriveStatus(invoice.status, invoice.dueDate, today),
      customer: {
        fullname: invoice.customerName,
        email: invoice.customerEmail,
        ...(invoice.customerMobile !== null
          ? { mobileNumber: invoice.customerMobile }
          : {}),
        ...(invoice.customerAddress !== null
          ? { address: invoice.customerAddress }
          : {}),
      },
      items: invoice.items.map((item) => ({
        id: item.id,
        invoiceId: invoice.invoiceId,
        name: item.name,
        quantity: item.quantity,
        rate: item.rate,
      })),
      taxPercent: invoice.taxPercent,
      invoiceSubTotal: invoice.invoiceSubTotal,
      totalTax: invoice.totalTax,
      totalDiscount: invoice.totalDiscount,
      totalAmount: invoice.totalAmount,
      totalPaid: invoice.totalPaid,
      balanceAmount: invoice.balanceAmount,
      createdAt: invoice.createdAt,
      createdBy: invoice.createdBy,
    };
  }
  async list(dto: ListInvoicesDto) {
    const today = utcToday();
    const [records, total] = await this.repository.list(dto, today);
    return {
      data: records.map((invoice) => this.present(invoice, today)),
      paging: { page: dto.page, pageSize: dto.pageSize, total },
    };
  }
  async detail(id: string) {
    const invoice = await this.repository.find(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.present(invoice);
  }
  async create(dto: CreateInvoiceDto, userId: string) {
    if (dto.dueDate < dto.invoiceDate)
      throw new BadRequestException([
        'dueDate must be on or after invoiceDate',
      ]);
    const amounts = calculateAmounts(
      dto.item.quantity,
      dto.item.rate,
      dto.taxPercent,
      dto.discount,
    );
    if (new Decimal(amounts.totalAmount).isNegative())
      throw new BadRequestException([
        'discount must not exceed subtotal plus tax',
      ]);
    try {
      const invoice = await this.repository.create({
        invoiceNumber: dto.invoiceNumber,
        invoiceReference: dto.invoiceReference ?? null,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        currency: dto.currency,
        currencySymbol: currencySymbol(dto.currency),
        description: dto.description ?? null,
        status: 'Draft',
        customerName: dto.customer.fullname,
        customerEmail: dto.customer.email,
        customerMobile: dto.customer.mobileNumber ?? null,
        customerAddress: dto.customer.address ?? null,
        taxPercent: new Decimal(dto.taxPercent).toFixed(4),
        ...amounts,
        createdBy: userId,
        items: [
          {
            name: dto.item.name,
            quantity: dto.item.quantity,
            rate: new Decimal(dto.item.rate).toFixed(2),
          } as InvoiceEntity['items'][number],
        ],
      });
      // Reload so database defaults and exact decimal column values are reflected in the response.
      return this.detail(invoice.invoiceId);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string; constraint?: string }).code ===
          '23505' &&
        (error.driverError as { constraint?: string }).constraint ===
          'invoices_number_unique'
      )
        throw new ConflictException('Invoice number already exists');
      throw error;
    }
  }
}
