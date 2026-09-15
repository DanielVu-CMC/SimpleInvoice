import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';
import { StoredStatus } from '../domain/invoice.logic';
import { InvoiceItemEntity } from './invoice-item.entity';
@Entity('invoices')
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid') invoiceId: string;
  @Column({ unique: true, length: 80 }) invoiceNumber: string;
  @Column({ nullable: true, type: 'varchar', length: 200 }) invoiceReference:
    | string
    | null;
  @Column({ type: 'date' }) invoiceDate: string;
  @Column({ type: 'date' }) dueDate: string;
  @Column({ length: 3 }) currency: string;
  @Column({ length: 20 }) currencySymbol: string;
  @Column({ nullable: true, type: 'text' }) description: string | null;
  @Column({ length: 10, default: 'Draft' }) status: StoredStatus;
  @Column({ length: 200 }) customerName: string;
  @Column({ length: 254 }) customerEmail: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) customerMobile:
    | string
    | null;
  @Column({ nullable: true, type: 'text' }) customerAddress: string | null;
  @Column({ type: 'numeric', precision: 8, scale: 4, default: 10 })
  taxPercent: string;
  @Column({ type: 'numeric', precision: 24, scale: 2 }) invoiceSubTotal: string;
  @Column({ type: 'numeric', precision: 24, scale: 2 }) totalTax: string;
  @Column({ type: 'numeric', precision: 24, scale: 2, default: 0 })
  totalDiscount: string;
  @Column({ type: 'numeric', precision: 24, scale: 2 }) totalAmount: string;
  @Column({ type: 'numeric', precision: 24, scale: 2, default: 0 })
  totalPaid: string;
  @Column({ type: 'numeric', precision: 24, scale: 2 }) balanceAmount: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'uuid' }) createdBy: string;
  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  creator: UserEntity;
  @OneToMany(() => InvoiceItemEntity, (item) => item.invoice, {
    cascade: ['insert'],
  })
  items: InvoiceItemEntity[];
}
