import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { INVOICE_STATUSES, InvoiceStatus } from '../domain/invoice.logic';
import { IsDateOnly, IsOnOrAfter } from '../../common/date.validators';
import { Trim } from '../../common/trim';
export class ListInvoicesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
  @ApiPropertyOptional({
    enum: ['invoiceDate', 'dueDate', 'totalAmount'],
    default: 'invoiceDate',
  })
  @IsIn(['invoiceDate', 'dueDate', 'totalAmount'])
  sortBy: 'invoiceDate' | 'dueDate' | 'totalAmount' = 'invoiceDate';
  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsIn(['ASC', 'DESC'])
  ordering: 'ASC' | 'DESC' = 'DESC';
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @MaxLength(200)
  keyword?: string;
  @ApiPropertyOptional({
    format: 'date',
    description: 'Inclusive invoice date lower bound (UTC calendar date).',
  })
  @ValidateIf((_, v) => v !== undefined)
  @IsDateOnly()
  fromDate?: string;
  @ApiPropertyOptional({
    format: 'date',
    description: 'Inclusive invoice date upper bound.',
  })
  @ValidateIf((_, v) => v !== undefined)
  @IsDateOnly()
  @IsOnOrAfter('fromDate')
  toDate?: string;
}
