import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ErrorDto } from '../common/error.dto';
import { UserEntity } from '../users/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import {
  InvoiceListResponseDto,
  InvoiceResponseDto,
} from './dto/invoice-response.dto';
import { InvoicesService } from './invoices.service';
@ApiForbiddenResponse({ type: ErrorDto })
@ApiInternalServerErrorResponse({ type: ErrorDto })
@ApiTags('Invoices')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ type: ErrorDto })
@ApiBadRequestResponse({ type: ErrorDto })
@ApiTooManyRequestsResponse({ type: ErrorDto })
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}
  @Get()
  @ApiOperation({
    summary: 'Search, filter, sort and paginate invoices',
    description:
      'Status filters use the derived status. Date bounds apply to invoiceDate, inclusively. Results are ordered by the chosen field with invoiceId as a stable tie-breaker.',
  })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  list(@Query() query: ListInvoicesDto) {
    return this.invoices.list(query);
  }
  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Get full invoice details' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.detail(id);
  }
  @Post()
  @ApiOperation({
    summary: 'Create a Draft invoice with exactly one item',
    description:
      'Totals, balance, createdBy and status are computed by the backend; supplying these fields is rejected.',
  })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiConflictResponse({ type: ErrorDto })
  create(
    @Body() dto: CreateInvoiceDto,
    @Req() request: Request & { user: UserEntity },
  ) {
    return this.invoices.create(dto, request.user.id);
  }
}
