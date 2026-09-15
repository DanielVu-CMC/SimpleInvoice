import 'reflect-metadata';
import { config } from 'dotenv';
config({ path: ['.env', '../.env'], quiet: true });
import { DataSource, DataSourceOptions } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { InvoiceEntity } from '../invoices/infrastructure/invoice.entity';
import { InvoiceItemEntity } from '../invoices/infrastructure/invoice-item.entity';
import { InitialSchema1760000000000 } from './migrations/1760000000000-initial-schema';
import { WidenMoney1790000000000 } from './migrations/1790000000000-widen-money';
export function databaseOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [UserEntity, InvoiceEntity, InvoiceItemEntity],
    migrations: [InitialSchema1760000000000, WidenMoney1790000000000],
    synchronize: false,
    logging: false,
  };
}
export function createDataSource(url = process.env.DATABASE_URL): DataSource {
  if (!url) throw new Error('DATABASE_URL is required');
  return new DataSource(databaseOptions(url));
}
