import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../backend/package.json', import.meta.url),
);
const { Client } = require('pg');
const createdIds: string[] = [];
async function login(page: Page) {
  await page.goto('/login');
  await page
    .getByLabel('Email address', { exact: true })
    .fill(process.env.SEED_USER_EMAIL!);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SEED_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Invoices.', exact: true }),
  ).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
}
test.afterAll(async () => {
  if (!createdIds.length) return;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(
      'DELETE FROM invoices WHERE "invoiceId" = ANY($1::uuid[]) AND "invoiceNumber" LIKE \'BROWSER-%\'',
      [createdIds],
    );
  } finally {
    await client.end();
  }
});
test('protected routes, login, and desktop register', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/invoices/new');
  await expect(
    page.getByRole('heading', { name: 'Make yourself at home.' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/login-desktop.png',
    fullPage: true,
  });
  await login(page);
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.screenshot({
    path: 'docs/screenshots/invoices-desktop.png',
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Invoices.', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('server-side search, status filtering, sorting and pagination', async ({
  page,
}) => {
  await login(page);
  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes('keyword=northstar') && response.status() === 200,
  );
  await page
    .getByRole('textbox', { name: 'Search invoices' })
    .fill('northstar');
  await searchResponse;
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.locator('tbody')).toContainText('Northstar Studio');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await page.getByLabel('Filter by status').selectOption('Overdue');
  await expect(
    page.locator('tbody tr').first().locator('.status-badge'),
  ).toHaveText('Overdue');
  const statuses = await page.locator('tbody .status-badge').allTextContents();
  expect(statuses.every((status) => status === 'Overdue')).toBe(true);
  await page.getByLabel('Filter by status').selectOption('');
  await page.getByLabel('Sort by').selectOption('totalAmount');
  await page
    .getByRole('button', { name: 'Sort ascending', exact: true })
    .click();
  await page.getByLabel('Records per page').selectOption('5');
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('.pagination')).toContainText('Page 2');
  await page
    .getByRole('textbox', { name: 'Search invoices' })
    .fill('no-matching-invoice-ever');
  await expect(page.getByText('No invoices match your search.')).toBeVisible();
});
test('creates an invoice, reads server-calculated totals, and rejects a duplicate', async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole('link', { name: 'Create invoice', exact: true })
    .last()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Create invoice.' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/create-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(page.getByText('Customer name is required')).toBeVisible();
  const number = `BROWSER-${Date.now()}`;
  for (const [label, value] of [
    ['Customer name', 'Browser Test Customer'],
    ['Customer email', 'browser-test@example.com'],
    ['Invoice number', number],
    ['Item name', 'Consulting'],
    ['Rate', '1000'],
    ['Quantity', '2'],
    ['Discount amount', '20'],
  ])
    await page.getByLabel(label, { exact: false }).fill(value);
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/invoices'),
  );
  await page.getByRole('button', { name: 'Save invoice' }).click();
  const response = await createdResponse;
  expect(response.status()).toBe(201);
  const created = await response.json();
  createdIds.push(created.invoiceId);
  expect(created).toMatchObject({
    status: 'Draft',
    totalAmount: '2180.00',
    balanceAmount: '2180.00',
  });
  await expect(
    page.getByRole('heading', { name: 'Invoices.', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Invoice created successfully')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search invoices' }).fill(number);
  await page.getByRole('link', { name: number, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: number, exact: true }),
  ).toBeVisible();
  await expect(page.locator('.invoice-totals')).toContainText('AUD 2,180.00');
  await expect(page.getByText('Consulting', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/detail-desktop.png',
    fullPage: true,
  });
  await page.goto('/invoices/new');
  for (const [label, value] of [
    ['Customer name', 'Duplicate Customer'],
    ['Customer email', 'duplicate@example.com'],
    ['Invoice number', number],
    ['Item name', 'Consulting'],
    ['Rate', '1000'],
  ])
    await page.getByLabel(label, { exact: false }).fill(value);
  await page.getByLabel('Tax (%)', { exact: false }).fill('');
  await page.getByLabel('Discount amount', { exact: false }).fill('');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(
    page.getByText('This invoice number already exists. Choose another.'),
  ).toBeVisible();
});
test('mobile navigation and layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/login-mobile.png',
    fullPage: true,
  });
  await login(page);
  await expect(
    page.getByRole('button', { name: 'Open navigation' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/invoices-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Create invoice' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Create invoice.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/create-mobile.png',
    fullPage: true,
  });
  await page.goto('/invoices/099ca7da-a290-40fa-93b9-1c43ae7bb887');
  await expect(
    page.getByRole('heading', { name: 'IV1780488206995' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/detail-mobile.png',
    fullPage: true,
  });
});
test('logout returns to login and blocks protected routes', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { name: 'Make yourself at home.' }),
  ).toBeVisible();
  await page.goto('/invoices');
  await expect(
    page.getByRole('heading', { name: 'Make yourself at home.' }),
  ).toBeVisible();
});

test('list URL survives refresh, detail back and browser history; malformed values are normalized', async ({
  page,
}) => {
  await login(page);
  await page.getByLabel('Sort by').selectOption('totalAmount');
  await page
    .getByRole('button', { name: 'Sort ascending', exact: true })
    .click();
  await page.getByLabel('Records per page').selectOption('5');
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('.pagination')).toContainText('Page 2');
  const listUrl = page.url();
  await page.reload();
  await expect(page.getByLabel('Sort by')).toHaveValue('totalAmount');
  await expect(page.getByLabel('Records per page')).toHaveValue('5');
  await expect(page.locator('.pagination')).toContainText('Page 2');
  await page.locator('.invoice-link').first().click();
  await expect(
    page.getByRole('heading', { name: 'Invoice details.' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Back to invoices' }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(page.locator('.pagination')).toContainText('Page 2');
  await page.getByLabel('Filter by status').selectOption('Paid');
  await expect(page).toHaveURL(/status=Paid/);
  await page.goBack();
  await expect(page).toHaveURL(listUrl);
  await page.goto(
    '/invoices?page=-1&pageSize=999&sortBy=invalid&status=invalid&fromDate=2026-02-30',
  );
  await expect(page.getByLabel('Sort by')).toHaveValue('invoiceDate');
  await expect(page.getByLabel('Records per page')).toHaveValue('10');
  await expect(page.locator('.pagination')).toContainText('Page 1');
  await expect(page).not.toHaveURL(/invalid|999|-1|2026-02-30/);
  const cleanUrl = page.url();
  await page.getByLabel('Filter by status').selectOption('Paid');
  await page.getByLabel('Search invoices').fill('uncommitted-search');
  await page.goBack();
  await expect(page).toHaveURL(cleanUrl);
  await expect(page.getByLabel('Search invoices')).toHaveValue('');
  await page.waitForTimeout(400); // Ensure the canceled debounce cannot overwrite history.
  await expect(page).toHaveURL(cleanUrl);
  await page.goto('/invoices?page=999999&pageSize=5');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page).not.toHaveURL(/page=999999/);
  await page.goto('/invoices?fromDate=2026-09-20&toDate=2026-09-10');
  await expect(page.getByRole('alert')).toHaveText(
    'To date must be on or after from date.',
  );
  await expect(
    page.getByText('Adjust the date range to load invoices.'),
  ).toBeVisible();
});

async function tabTo(page: Page, target: import('@playwright/test').Locator) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press('Tab');
  }
  throw new Error(
    'Keyboard could not reach ' + (await target.getAttribute('id')),
  );
}
test('keyboard-only login, form validation, creation, detail and mobile focus containment', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email address', { exact: true })).toBeFocused();
  await page.keyboard.type(process.env.SEED_USER_EMAIL!);
  await page.keyboard.press('Tab');
  await page.keyboard.type(process.env.SEED_USER_PASSWORD!);
  await tabTo(page, page.getByRole('button', { name: 'Sign in', exact: true }));
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Invoices.', exact: true }),
  ).toBeVisible();
  await tabTo(
    page,
    page.getByRole('link', { name: 'Create invoice', exact: true }).last(),
  );
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Create invoice.' }),
  ).toBeVisible();
  await tabTo(page, page.getByRole('button', { name: 'Save invoice' }));
  await page.keyboard.press('Enter');
  await expect(
    page.getByLabel('Customer name', { exact: false }),
  ).toBeFocused();
  await expect(
    page.getByLabel('Customer name', { exact: false }),
  ).toHaveAttribute('aria-describedby', 'field-customer.fullname-error');
  const number = `BROWSER-KEYBOARD-${Date.now()}`;
  for (const [label, value] of [
    ['Customer name', 'Keyboard Customer'],
    ['Customer email', 'keyboard@example.com'],
    ['Invoice number', number],
    ['Item name', 'Precision check'],
    ['Rate', '0.10'],
  ]) {
    const input = page.getByLabel(label, { exact: false });
    await tabTo(page, input);
    await page.keyboard.type(value);
  }
  const responsePromise = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/invoices'),
  );
  await tabTo(page, page.getByRole('button', { name: 'Save invoice' }));
  await page.keyboard.press('Enter');
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const invoice = await response.json();
  createdIds.push(invoice.invoiceId);
  await expect(
    page.getByRole('heading', { name: 'Invoices.', exact: true }),
  ).toBeVisible();
  await tabTo(page, page.getByLabel('Search invoices'));
  await page.keyboard.type(number);
  const link = page.getByRole('link', { name: number, exact: true });
  await expect(link).toBeVisible();
  await tabTo(page, link);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: number, exact: true }),
  ).toBeVisible();
  await tabTo(page, page.getByRole('link', { name: 'Back to invoices' }));
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Search invoices')).toHaveValue(number);
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Workspace navigation' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(dialog).toHaveCount(0);
});

test('accessibility checks cover login, register, creation, detail and open mobile navigation', async ({
  page,
}) => {
  const audit = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        null,
        2,
      ),
    ).toEqual([]);
  };
  await page.goto('/login');
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await audit();
  await login(page);
  await audit();
  await page.goto('/invoices/new');
  await expect(
    page.getByRole('heading', { name: 'Create invoice.' }),
  ).toBeVisible();
  await audit();
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(page.getByText('Customer name is required')).toBeVisible();
  await audit();
  await page.goto('/invoices/099ca7da-a290-40fa-93b9-1c43ae7bb887');
  await expect(
    page.getByRole('heading', { name: 'IV1780488206995' }),
  ).toBeVisible();
  await audit();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await audit();
});
