import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INVOICE_STATUSES, InvoiceStatus } from '../domain/invoice.logic';
import { CustomerDto } from './create-invoice.dto';
class ItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) invoiceId: string;
  @ApiProperty() name: string;
  @ApiProperty({ minimum: 1 }) quantity: number;
  @ApiProperty({ type: String, example: '1000.00' }) rate: string;
}
export class InvoiceResponseDto {
  @ApiProperty({ format: 'uuid' }) invoiceId: string;
  @ApiProperty() invoiceNumber: string;
  @ApiPropertyOptional({ nullable: true, type: String }) invoiceReference:
    | string
    | null;
  @ApiProperty({ format: 'date' }) invoiceDate: string;
  @ApiProperty({ format: 'date' }) dueDate: string;
  @ApiProperty() currency: string;
  @ApiProperty() currencySymbol: string;
  @ApiPropertyOptional({ nullable: true, type: String }) description:
    | string
    | null;
  @ApiProperty({
    enum: INVOICE_STATUSES,
    description:
      'Overdue is derived at read time, including for overdue Draft invoices.',
  })
  status: InvoiceStatus;
  @ApiProperty({ type: CustomerDto }) customer: CustomerDto;
  @ApiProperty({ type: [ItemResponseDto] }) items: ItemResponseDto[];
  @ApiProperty({ type: String, example: '10.0000' }) taxPercent: string;
  @ApiProperty({
    type: String,
    example: '2000.00',
    description: 'Monetary values are decimal strings to preserve precision.',
  })
  invoiceSubTotal: string;
  @ApiProperty({ type: String }) totalTax: string;
  @ApiProperty({ type: String }) totalDiscount: string;
  @ApiProperty({ type: String }) totalAmount: string;
  @ApiProperty({ type: String }) totalPaid: string;
  @ApiProperty({ type: String }) balanceAmount: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'uuid' }) createdBy: string;
}
class PagingDto {
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
}
export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] }) data: InvoiceResponseDto[];
  @ApiProperty({ type: PagingDto }) paging: PagingDto;
}
