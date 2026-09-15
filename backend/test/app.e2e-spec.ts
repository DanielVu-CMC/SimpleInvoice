import 'reflect-metadata';
import { config } from 'dotenv';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createDataSource } from '../src/database/data-source';
import { seedDatabase } from '../src/database/seed/seed';
import { setupApplication } from '../src/setup';
import { UserEntity } from '../src/users/user.entity';
import { utcToday } from '../src/invoices/domain/invoice.logic';
config({ path: ['../.env.test', '../.env'], quiet: true });
const headers = { 'X-Requested-With': 'SimpleInvoice' };
const credentials = {
  email: 'tests@example.com',
  password: 'test-only-password',
  fullname: 'Test Reviewer',
};
const dateOffset = (days: number) => {
  const date = new Date(utcToday() + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return utcToday(date);
};
const invoice = (number = 'E2E-NEW') => ({
  invoiceNumber: number,
  invoiceDate: utcToday(),
  dueDate: dateOffset(30),
  currency: 'AUD',
  customer: { fullname: 'Workflow Customer', email: 'customer@example.com' },
  item: { name: 'Consulting', quantity: 2, rate: 1000 },
  taxPercent: 10,
  discount: 20,
});
describe('SimpleInvoice / real PostgreSQL', () => {
  let app: INestApplication;
  let source: DataSource;
  let token: string;
  let id: string;
  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error(
        'TEST_DATABASE_URL must point to an isolated database ending in _test. These tests reset its data.',
      );
    process.env.DATABASE_URL = url;
    process.env.NODE_ENV = 'test';
    source = createDataSource(url);
    await source.initialize();
    await source.runMigrations();
    await source.query('TRUNCATE invoice_items, invoices, users CASCADE');
    await seedDatabase(source, credentials);
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    setupApplication(app);
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send({ email: credentials.email, password: credentials.password });
    expect(login.status).toBe(200);
    token = login.body.accessToken;
  });
  afterAll(async () => {
    if (app) await app.close();
    if (source?.isInitialized) {
      await source.query('TRUNCATE invoice_items, invoices, users CASCADE');
      await source.destroy();
    }
  });
  const auth = () => ({ ...headers, Authorization: `Bearer ${token}` });
  it('protects all invoice routes', async () => {
    for (const [method, url] of [
      ['get', '/invoices'],
      ['get', '/invoices/099ca7da-a290-40fa-93b9-1c43ae7bb887'],
      ['post', '/invoices'],
    ] as const)
      expect(
        (await request(app.getHttpServer())[method](url).set(headers)).status,
      ).toBe(401);
  });
  it('returns the authenticated profile without the password hash', async () => {
    const result = await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth())
      .expect(200);
    expect(result.body.email).toBe(credentials.email);
    expect(result.body.tokenExpiresAt).toBeGreaterThan(Date.now());
    expect(result.body).not.toHaveProperty('passwordHash');
  });
  it('rejects wrong credentials with a consistent response', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send({ email: credentials.email, password: 'wrong' })
      .expect(401);
    expect(response.body).toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
  });
  it('validates login input server-side', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send({ email: 'invalid', password: '' })
      .expect(400);
  });
  it('supports the HttpOnly cookie and clears it on logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/auth/login')
      .set(headers)
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Strict');
    await agent.get('/auth/me').expect(200);
    await agent.post('/auth/logout').set(headers).expect(204);
    await agent.get('/invoices').expect(401);
  });
  it('rejects expired JWTs', async () => {
    const user = await source
      .getRepository(UserEntity)
      .findOneByOrFail({ email: credentials.email });
    const expired = await app
      .get(JwtService)
      .signAsync({ sub: user.id }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/invoices')
      .set({ Authorization: `Bearer ${expired}` })
      .expect(401);
  });
  it('rejects forged JWTs', async () => {
    await request(app.getHttpServer())
      .get('/invoices')
      .set({ Authorization: `Bearer ${token.slice(0, -6)}forged` })
      .expect(401);
  });
  it('creates, lists, and reads an invoice with server-side totals', async () => {
    const created = await request(app.getHttpServer())
      .post('/invoices')
      .set(auth())
      .send(invoice())
      .expect(201);
    id = created.body.invoiceId;
    expect(created.body).toMatchObject({
      status: 'Draft',
      invoiceSubTotal: '2000.00',
      totalTax: '200.00',
      totalDiscount: '20.00',
      totalAmount: '2180.00',
      totalPaid: '0.00',
      balanceAmount: '2180.00',
    });
    expect(created.body.items).toHaveLength(1);
    const list = await request(app.getHttpServer())
      .get('/invoices?keyword=e2e-new')
      .set(auth())
      .expect(200);
    expect(
      list.body.data.map((record: { invoiceId: string }) => record.invoiceId),
    ).toContain(id);
    const detail = await request(app.getHttpServer())
      .get(`/invoices/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.customer.fullname).toBe('Workflow Customer');
    expect(
      (
        await source.query('SELECT status FROM invoices WHERE "invoiceId"=$1', [
          id,
        ])
      )[0].status,
    ).toBe('Draft');
  });
  it('persists the largest supported invoice amount without overflow or rounding loss', async () => {
    const payload = {
      ...invoice('E2E-LARGE'),
      item: { name: 'Large order', quantity: 1000000, rate: 999999999999.99 },
      taxPercent: 9999.9999,
      discount: 0,
    };
    const response = await request(app.getHttpServer())
      .post('/invoices')
      .set(auth())
      .send(payload)
      .expect(201);
    expect(response.body.totalAmount).toBe('100999998999998990000.01');
    const stored = await source.query(
      'SELECT "totalAmount" FROM invoices WHERE "invoiceId"=$1',
      [response.body.invoiceId],
    );
    expect(stored[0].totalAmount).toBe(response.body.totalAmount);
  });
  it('rejects duplicate numbers at the database boundary', async () => {
    await request(app.getHttpServer())
      .post('/invoices')
      .set(auth())
      .send(invoice())
      .expect(409);
  });
  it('handles concurrent unique-number creation safely', async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/invoices')
          .set(auth())
          .send(invoice('E2E-RACE')),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
  it.each([
    { status: 'Paid' },
    { totalAmount: 1 },
    { totalPaid: 50 },
    { createdBy: 'forged' },
    { taxPercent: null },
    { discount: -1 },
    { dueDate: dateOffset(-1) },
    { invoiceDate: '2026-02-30' },
    { item: { name: 'Item', quantity: 1.5, rate: 20 } },
  ])('rejects invalid invoice payload %j', async (override) => {
    const response = await request(app.getHttpServer())
      .post('/invoices')
      .set(auth())
      .send({ ...invoice('E2E-INVALID'), ...override })
      .expect(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });
    expect(Array.isArray(response.body.message)).toBe(true);
  });
  it('applies default tax and discount', async () => {
    const payload: Record<string, unknown> = invoice('E2E-DEFAULTS');
    delete payload.taxPercent;
    delete payload.discount;
    const result = await request(app.getHttpServer())
      .post('/invoices')
      .set(auth())
      .send(payload)
      .expect(201);
    expect(result.body).toMatchObject({
      totalTax: '200.00',
      totalDiscount: '0.00',
      totalAmount: '2200.00',
    });
  });
  it('derives Overdue for an expired newly created Draft without persisting Overdue', async () => {
    const payload = {
      ...invoice('E2E-OVERDUE'),
      invoiceDate: dateOffset(-5),
      dueDate: dateOffset(-1),
    };
    const result = await request(app.getHttpServer())
      .post('/invoices')
      .set(auth())
      .send(payload)
      .expect(201);
    expect(result.body.status).toBe('Overdue');
    expect(
      (
        await source.query('SELECT status FROM invoices WHERE "invoiceId"=$1', [
          result.body.invoiceId,
        ])
      )[0].status,
    ).toBe('Draft');
  });
  it.each(['Draft', 'Pending', 'Paid', 'Overdue'])(
    'filters by effective %s status',
    async (status) => {
      const result = await request(app.getHttpServer())
        .get(`/invoices?status=${status}&pageSize=100`)
        .set(auth())
        .expect(200);
      expect(result.body.data.length).toBeGreaterThan(0);
      expect(
        result.body.data.every((r: { status: string }) => r.status === status),
      ).toBe(true);
    },
  );
  it('never stores an Overdue status', async () => {
    expect(
      (
        await source.query(
          "SELECT count(*)::int AS count FROM invoices WHERE status='Overdue'",
        )
      )[0].count,
    ).toBe(0);
  });
  it('searches customer names case-insensitively and partially', async () => {
    const result = await request(app.getHttpServer())
      .get('/invoices?keyword=FLOW%20cus')
      .set(auth())
      .expect(200);
    expect(result.body.data.length).toBeGreaterThan(0);
    expect(
      result.body.data.every(
        (r: { customer: { fullname: string } }) =>
          r.customer.fullname === 'Workflow Customer',
      ),
    ).toBe(true);
  });
  it('treats search wildcards as literal characters', async () => {
    const result = await request(app.getHttpServer())
      .get('/invoices?keyword=%25')
      .set(auth())
      .expect(200);
    expect(result.body.paging.total).toBe(0);
  });
  it.each(['ASC', 'DESC'])(
    'sorts amounts numerically (%s)',
    async (ordering) => {
      const result = await request(app.getHttpServer())
        .get(`/invoices?sortBy=totalAmount&ordering=${ordering}&pageSize=100`)
        .set(auth())
        .expect(200);
      const values = result.body.data.map((r: { totalAmount: string }) =>
        Number(r.totalAmount),
      );
      expect(values).toEqual(
        [...values].sort((a: number, b: number) =>
          ordering === 'ASC' ? a - b : b - a,
        ),
      );
    },
  );
  it('paginates on the server with correct totals and no overlaps', async () => {
    const first = await request(app.getHttpServer())
      .get('/invoices?page=1&pageSize=5')
      .set(auth())
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/invoices?page=2&pageSize=5')
      .set(auth())
      .expect(200);
    expect(first.body.data).toHaveLength(5);
    expect(second.body.paging).toMatchObject({
      page: 2,
      pageSize: 5,
      total: first.body.paging.total,
    });
    expect(
      second.body.data.some((r: { invoiceId: string }) =>
        first.body.data.some(
          (f: { invoiceId: string }) => f.invoiceId === r.invoiceId,
        ),
      ),
    ).toBe(false);
  });
  it('filters inclusive invoice date bounds', async () => {
    const result = await request(app.getHttpServer())
      .get(`/invoices?fromDate=${utcToday()}&toDate=${utcToday()}`)
      .set(auth())
      .expect(200);
    expect(result.body.data.length).toBeGreaterThan(0);
    expect(
      result.body.data.every(
        (r: { invoiceDate: string }) => r.invoiceDate === utcToday(),
      ),
    ).toBe(true);
  });
  it.each([
    'page=0',
    'pageSize=101',
    'sortBy=invalid',
    'ordering=invalid',
    'fromDate=2026-02-30',
    'fromDate=2026-06-03&toDate=2026-06-02',
  ])('validates query %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/invoices?${query}`)
      .set(auth())
      .expect(400);
  });
  it('returns consistent detail errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/invoices/00000000-0000-4000-8000-000000000000')
      .set(auth())
      .expect(404);
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Invoice not found',
      error: 'Not Found',
    });
    await request(app.getHttpServer())
      .get('/invoices/invalid-id')
      .set(auth())
      .expect(400);
  });
  it('protects cookie mutations from CSRF', async () => {
    await request(app.getHttpServer())
      .post('/invoices')
      .set({ Authorization: `Bearer ${token}` })
      .send(invoice('E2E-CSRF'))
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set({ ...headers, Origin: 'https://untrusted.example' })
      .send({ email: credentials.email, password: credentials.password })
      .expect(403);
  });
  it('provides documented endpoints and response schemas at /api/docs', async () => {
    await request(app.getHttpServer()).get('/api/docs/').expect(200);
    const document = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(document.body.paths).toHaveProperty('/auth/login');
    expect(document.body.paths).toHaveProperty('/auth/me');
    expect(document.body.paths).toHaveProperty('/invoices/{id}');
    expect(
      document.body.paths['/invoices'].get.parameters.map(
        (p: { name: string }) => p.name,
      ),
    ).toEqual(
      expect.arrayContaining([
        'page',
        'pageSize',
        'sortBy',
        'ordering',
        'status',
        'keyword',
        'fromDate',
        'toDate',
      ]),
    );
  });
  it('seeds idempotently without overwriting created invoices', async () => {
    const result = await seedDatabase(source, credentials);
    expect(result.count).toBe(0);
    expect(
      (
        await source.query(
          'SELECT count(*)::int AS count FROM invoices WHERE "invoiceNumber"=$1',
          ['E2E-NEW'],
        )
      )[0].count,
    ).toBe(1);
  });
});
