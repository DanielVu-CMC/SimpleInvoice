import { addWebmDuration } from './webm-duration.mjs';
import { chromium, expect } from '@playwright/test';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
config({ path: '.env', quiet: true });
const require = createRequire(
  new URL('../backend/package.json', import.meta.url),
);
const { Client } = require('pg');
const baseURL =
  process.env.BROWSER_BASE_URL ||
  `http://localhost:${process.env.FRONTEND_PORT || 5180}`;
const output = new URL('../docs/demo/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(existsSync('/Applications/Google Chrome.app')
    ? { channel: 'chrome' }
    : {}),
});
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
// Encode actual viewport captures with Chrome's MediaRecorder. No ffmpeg or
// additional system runtime is needed; the video is a silent 5fps walkthrough.
const recorderContext = await browser.newContext();
const recorderPage = await recorderContext.newPage();
await recorderPage.setContent('<canvas width="1280" height="800"></canvas>');
await recorderPage.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const drawing = canvas.getContext('2d');
  const chunks = [];
  const recorder = new MediaRecorder(canvas.captureStream(5), {
    mimeType: 'video/webm;codecs=vp8',
    videoBitsPerSecond: 1500000,
  });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  window.demoDraw = async (base64) => {
    const image = new Image();
    image.src = 'data:image/jpeg;base64,' + base64;
    await image.decode();
    drawing.drawImage(image, 0, 0, 1280, 800);
  };
  window.demoStop = () =>
    new Promise((resolve) => {
      recorder.onstop = async () => {
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let text = '';
        for (let i = 0; i < bytes.length; i += 8192)
          text += String.fromCharCode(...bytes.subarray(i, i + 8192));
        resolve({
          data: btoa(text),
          duration: performance.now() - window.demoStartedAt,
        });
      };
      recorder.stop();
    });
  window.demoStartedAt = performance.now();
  recorder.start(1000);
});
let capturing = true,
  capturedFrames = 0;
const captureLoop = (async () => {
  while (capturing) {
    const frame = await page.screenshot({ type: 'jpeg', quality: 80 });
    await recorderPage.evaluate(
      (data) => window.demoDraw(data),
      frame.toString('base64'),
    );
    capturedFrames++;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
})();
const createdIds = [];
const receipt = {
  recordedAt: new Date().toISOString(),
  decimal: {},
  concurrentUniqueness: {},
  overdue: {},
};
async function caption(title, detail) {
  await page.evaluate(
    ({ title, detail }) => {
      let el = document.getElementById('recording-caption');
      if (!el) {
        el = document.createElement('div');
        el.id = 'recording-caption';
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText =
          'position:fixed;bottom:20px;left:270px;right:20px;z-index:9999;background:#152d27f5;color:white;border:1px solid #b8d0ac;padding:16px 20px;border-radius:12px;pointer-events:none;font:15px/1.5 system-ui;box-shadow:0 8px 30px #0003';
        document.body.append(el);
      }
      el.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = title;
      strong.style.cssText = 'display:block;font-size:19px;margin-bottom:4px';
      const p = document.createElement('span');
      p.textContent = detail;
      el.append(strong, p);
    },
    { title, detail },
  );
}
try {
  await page.goto('/login');
  await caption(
    'SimpleInvoice · a short reviewer walkthrough',
    'React + NestJS + PostgreSQL. Four required features, with correctness you can verify.',
  );
  await page
    .getByLabel('Email address', { exact: true })
    .fill(process.env.SEED_USER_EMAIL);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SEED_USER_PASSWORD);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Invoices.', exact: true }),
  ).toBeVisible();
  await caption(
    '1 / Derived Overdue status, including filtering',
    'An unpaid past-due invoice is Overdue on reads. The database still stores Draft, Pending or Paid.',
  );
  await page.getByLabel('Filter by status').selectOption('Overdue');
  await expect(page.locator('tbody .status-badge').first()).toHaveText(
    'Overdue',
  );
  const sample = await context.request.get(
    '/api/invoices/099ca7da-a290-40fa-93b9-1c43ae7bb887',
  );
  const sampleData = await sample.json();
  expect(sampleData.status).toBe('Overdue');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await db.connect();
    const { rows } = await db.query(
      'SELECT status FROM invoices WHERE "invoiceId"=$1',
      [sampleData.invoiceId],
    );
    receipt.overdue = {
      invoiceNumber: sampleData.invoiceNumber,
      storedStatus: rows[0].status,
      returnedStatus: sampleData.status,
      dueDate: sampleData.dueDate,
    };
    expect(rows[0].status).toBe('Pending');
  } finally {
    await db.end();
  }
  await page.waitForTimeout(4500);
  await page.getByLabel('Sort by').selectOption('totalAmount');
  await page.getByLabel('Records per page').selectOption('5');
  const listURL = page.url();
  await page.reload();
  await caption(
    'Your register view survives refresh and detail navigation',
    'Search, status, dates, sort and pagination live in a validated URL. Back returns to the same view.',
  );
  await page.waitForTimeout(2000);
  await page.locator('.invoice-link').first().click();
  await expect(
    page.getByRole('heading', { name: 'Invoice details.' }),
  ).toBeVisible();
  await caption(
    'A full detail view, down to the outstanding balance',
    'Every subtotal, tax, discount, total and balance comes from the backend.',
  );
  await page.waitForTimeout(3000);
  await page.getByRole('link', { name: 'Back to invoices' }).click();
  await expect(page).toHaveURL(listURL);
  await page.waitForTimeout(1500);
  await page.goto('/invoices/new');
  await caption(
    '2 / Decimal precision, without frontend totals',
    'Create one line item: quantity 3 × AUD 0.10, tax 0%. The server must return exactly AUD 0.30.',
  );
  const number = `DEMO-PRECISION-${Date.now()}`;
  for (const [label, value] of [
    ['Customer name', 'Reviewer Demo'],
    ['Customer email', 'demo@example.com'],
    ['Invoice number', number],
    ['Item name', 'Decimal precision'],
    ['Quantity', '3'],
    ['Rate', '0.10'],
    ['Tax (%)', '0'],
  ])
    await page.getByLabel(label, { exact: false }).fill(value);
  await page
    .getByRole('heading', { name: 'Line item', exact: true })
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(3500);
  const responsePromise = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/invoices'),
  );
  await page.getByRole('button', { name: 'Save invoice' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const decimal = await response.json();
  createdIds.push(decimal.invoiceId);
  expect(decimal.totalAmount).toBe('0.30');
  receipt.decimal = {
    quantity: 3,
    rate: '0.10',
    taxPercent: 0,
    returnedTotalAmount: decimal.totalAmount,
  };
  await page.goto(`/invoices/${decimal.invoiceId}`);
  await expect(page.locator('.invoice-totals')).toContainText('AUD 0.30');
  await page
    .locator('.invoice-totals')
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await caption(
    'Exact result: AUD 0.30',
    'Decimal.js on the server, PostgreSQL numeric storage, decimal strings in JSON, exact cents in the UI.',
  );
  await page.waitForTimeout(4500);
  const date = new Date().toISOString().slice(0, 10),
    numberRace = `DEMO-RACE-${Date.now()}`;
  const payload = {
    invoiceNumber: numberRace,
    invoiceDate: date,
    dueDate: date,
    currency: 'AUD',
    customer: {
      fullname: 'Concurrent Reviewer Demo',
      email: 'race-demo@example.com',
    },
    item: { name: 'Half-cent tax rounding', quantity: 1, rate: 0.05 },
    taxPercent: 10,
  };
  const results = await Promise.all(
    [1, 2].map(() =>
      context.request.post('/api/invoices', {
        headers: { 'X-Requested-With': 'SimpleInvoice' },
        data: payload,
      }),
    ),
  );
  const statuses = results.map((r) => r.status()).sort();
  expect(statuses).toEqual([201, 409]);
  const winner = await results.find((r) => r.status() === 201).json();
  createdIds.push(winner.invoiceId);
  expect(winner.totalTax).toBe('0.01');
  expect(winner.totalAmount).toBe('0.06');
  receipt.concurrentUniqueness = {
    simultaneousRequests: 2,
    invoiceNumber: numberRace,
    statusCodes: statuses,
    returnedTax: winner.totalTax,
    returnedTotalAmount: winner.totalAmount,
  };
  await page.goto(`/invoices/${winner.invoiceId}`);
  await expect(page.locator('.invoice-totals')).toContainText('AUD 0.06');
  await page
    .locator('.invoice-totals')
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await caption(
    '3 / Two simultaneous creates → 201 + 409',
    'The recorder sent real concurrent POSTs. A database unique constraint accepts one and rejects the duplicate.',
  );
  await page.waitForTimeout(5000);
  await caption(
    'Rounding is explicit, too: AUD 0.05 + 10% tax = AUD 0.06',
    'Tax of 0.005 rounds half up to 0.01. These results and the Overdue database check are saved in evidence.json.',
  );
  await page.waitForTimeout(5000);
  await page.getByRole('link', { name: 'Back to invoices' }).click();
  await caption(
    'Small scope. Verified behavior.',
    'URL-backed register state, keyboard navigation and accessibility scans. See README and docs/DEMO.md for the evidence.',
  );
  await page.waitForTimeout(3500);
  await writeFile(
    new URL('evidence.json', output),
    JSON.stringify(receipt, null, 2) + '\n',
  );
  capturing = false;
  await captureLoop;
  const encoded = await recorderPage.evaluate(() => window.demoStop());
  await writeFile(
    new URL('simpleinvoice-demo.webm', output),
    addWebmDuration(Buffer.from(encoded.data, 'base64'), encoded.duration),
  );
  console.log(`Captured ${capturedFrames} real viewport frames`);
  console.log(
    'Recorded docs/demo/simpleinvoice-demo.webm and sanitized evidence.json',
  );
} finally {
  capturing = false;
  await captureLoop;
  await recorderContext.close();
  await context.close();
  await browser.close();
  if (createdIds.length) {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await db.connect();
      await db.query(
        'DELETE FROM invoices WHERE "invoiceId" = ANY($1::uuid[]) AND "invoiceNumber" LIKE \'DEMO-%\'',
        [createdIds],
      );
    } finally {
      await db.end();
    }
  }
}
