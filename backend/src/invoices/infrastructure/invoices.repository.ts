import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { ListInvoicesDto } from '../dto/list-invoices.dto';
@Injectable()
export class InvoicesRepository {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly records: Repository<InvoiceEntity>,
  ) {}
  async list(dto: ListInvoicesDto, today: string) {
    const query = this.records
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'item');
    if (dto.keyword) {
      // Escape LIKE wildcards so searches are literal partial text matches.
      const keyword = `%${dto.keyword.replace(/[\\%_]/g, '\\$&')}%`;
      query.andWhere(
        '(invoice.invoiceNumber ILIKE :keyword OR invoice.customerName ILIKE :keyword)',
        { keyword },
      );
    }
    if (dto.status === 'Overdue')
      query.andWhere('invoice.status != :paid AND invoice.dueDate < :today', {
        paid: 'Paid',
        today,
      });
    else if (dto.status) {
      query.andWhere('invoice.status = :status', { status: dto.status });
      if (dto.status !== 'Paid')
        query.andWhere('invoice.dueDate >= :today', { today });
    }
    if (dto.fromDate)
      query.andWhere('invoice.invoiceDate >= :fromDate', {
        fromDate: dto.fromDate,
      });
    if (dto.toDate)
      query.andWhere('invoice.invoiceDate <= :toDate', { toDate: dto.toDate });
    return query
      .orderBy(`invoice.${dto.sortBy}`, dto.ordering)
      .addOrderBy('invoice.invoiceId', 'ASC')
      .skip((dto.page - 1) * dto.pageSize)
      .take(dto.pageSize)
      .getManyAndCount();
  }
  find(id: string) {
    return this.records.findOne({
      where: { invoiceId: id },
      relations: { items: true },
    });
  }
  create(values: Partial<InvoiceEntity>) {
    return this.records.save(this.records.create(values));
  }
}
