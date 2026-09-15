import { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialSchema1760000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(254) NOT NULL UNIQUE,
      "passwordHash" varchar(60) NOT NULL, fullname varchar(200) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE TABLE invoices (
      "invoiceId" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceNumber" varchar(80) NOT NULL,
      "invoiceReference" varchar(200), "invoiceDate" date NOT NULL, "dueDate" date NOT NULL,
      currency varchar(3) NOT NULL, "currencySymbol" varchar(20) NOT NULL, description text,
      status varchar(10) NOT NULL DEFAULT 'Draft', "customerName" varchar(200) NOT NULL,
      "customerEmail" varchar(254) NOT NULL, "customerMobile" varchar(50), "customerAddress" text,
      "taxPercent" numeric(8,4) NOT NULL DEFAULT 10, "invoiceSubTotal" numeric(20,2) NOT NULL,
      "totalTax" numeric(20,2) NOT NULL, "totalDiscount" numeric(20,2) NOT NULL DEFAULT 0,
      "totalAmount" numeric(20,2) NOT NULL, "totalPaid" numeric(20,2) NOT NULL DEFAULT 0,
      "balanceAmount" numeric(20,2) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
      "createdBy" uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT invoices_number_unique UNIQUE ("invoiceNumber"),
      CONSTRAINT invoices_valid_dates CHECK ("dueDate" >= "invoiceDate"),
      CONSTRAINT invoices_stored_status CHECK (status IN ('Draft','Pending','Paid')),
      CONSTRAINT invoices_positive_amounts CHECK ("invoiceSubTotal" >= 0 AND "totalTax" >= 0 AND "totalDiscount" >= 0 AND "totalAmount" >= 0 AND "totalPaid" >= 0 AND "taxPercent" >= 0)
    )`);
    await runner.query(`CREATE TABLE invoice_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceId" uuid NOT NULL REFERENCES invoices("invoiceId") ON DELETE CASCADE,
      name varchar(200) NOT NULL, quantity integer NOT NULL CHECK (quantity > 0), rate numeric(14,2) NOT NULL CHECK (rate > 0)
    )`);
    await runner.query(
      'CREATE INDEX invoices_invoice_date_idx ON invoices ("invoiceDate", "invoiceId")',
    );
    await runner.query(
      'CREATE INDEX invoices_due_date_idx ON invoices ("dueDate", "invoiceId")',
    );
    await runner.query(
      'CREATE INDEX invoices_total_idx ON invoices ("totalAmount", "invoiceId")',
    );
    await runner.query(
      'CREATE INDEX invoices_status_due_idx ON invoices (status, "dueDate")',
    );
    await runner.query(
      'CREATE INDEX invoice_items_invoice_idx ON invoice_items ("invoiceId")',
    );
    await runner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await runner.query(
      'CREATE INDEX invoices_number_search_idx ON invoices USING gin ("invoiceNumber" gin_trgm_ops)',
    );
    await runner.query(
      'CREATE INDEX invoices_customer_search_idx ON invoices USING gin ("customerName" gin_trgm_ops)',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE invoice_items');
    await runner.query('DROP TABLE invoices');
    await runner.query('DROP TABLE users');
  }
}
