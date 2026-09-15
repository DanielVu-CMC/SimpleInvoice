import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from './infrastructure/invoice.entity';
import { InvoiceItemEntity } from './infrastructure/invoice-item.entity';
import { InvoicesRepository } from './infrastructure/invoices.repository';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity, InvoiceItemEntity])],
  controllers: [InvoicesController],
  providers: [InvoicesRepository, InvoicesService],
})
export class InvoicesModule {}
