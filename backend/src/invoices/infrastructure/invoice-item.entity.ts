import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
@Entity('invoice_items')
export class InvoiceItemEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) invoiceId: string;
  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: InvoiceEntity;
  @Column({ length: 200 }) name: string;
  @Column({ type: 'integer' }) quantity: number;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) rate: string;
}
