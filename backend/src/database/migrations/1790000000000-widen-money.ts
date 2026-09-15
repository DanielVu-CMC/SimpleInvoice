import { MigrationInterface, QueryRunner } from 'typeorm';
const columns = [
  'invoiceSubTotal',
  'totalTax',
  'totalDiscount',
  'totalAmount',
  'totalPaid',
  'balanceAmount',
];
// Retain existing data while increasing capacity for valid large rate/quantity/tax combinations.
export class WidenMoney1790000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE invoices ${columns.map((column) => `ALTER COLUMN "${column}" TYPE numeric(24,2)`).join(', ')}`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE invoices ${columns.map((column) => `ALTER COLUMN "${column}" TYPE numeric(20,2)`).join(', ')}`,
    );
  }
}
