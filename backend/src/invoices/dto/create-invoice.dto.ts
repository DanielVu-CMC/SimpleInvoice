import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../common/trim';
import { IsDateOnly, IsOnOrAfter } from '../../common/date.validators';

export class CustomerDto {
  @ApiProperty({ example: 'Paul' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullname: string;
  @ApiProperty({ example: 'paul@101digital.io' })
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @MaxLength(50)
  mobileNumber?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @MaxLength(1000)
  address?: string;
}
export class CreateItemDto {
  @ApiProperty({ example: 'Honda RC150' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
  @ApiProperty({ example: 2, minimum: 1, maximum: 1000000 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity: number;
  @ApiProperty({ example: 1000, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999.99)
  rate: number;
}
export class CreateInvoiceDto {
  @ApiProperty({ type: CustomerDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;
  @ApiProperty({ example: 'INV-2026-001' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  invoiceNumber: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @MaxLength(200)
  invoiceReference?: string;
  @ApiProperty({ example: '2026-06-03', format: 'date' })
  @IsDateOnly()
  invoiceDate: string;
  @ApiProperty({ example: '2026-07-03', format: 'date' })
  @IsDateOnly()
  @IsOnOrAfter('invoiceDate')
  dueDate: string;
  @ApiProperty({ example: 'AUD' })
  @IsISO4217CurrencyCode()
  @Matches(/^[A-Z]{3}$/)
  currency: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiProperty({
    type: CreateItemDto,
    description: 'Exactly one line item per invoice.',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateItemDto)
  item: CreateItemDto;
  @ApiPropertyOptional({ default: 10, minimum: 0, maximum: 9999.9999 })
  @ValidateIf((_, v) => v !== undefined)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(9999.9999)
  taxPercent = 10;
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @ValidateIf((_, v) => v !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  discount = 0;
}
