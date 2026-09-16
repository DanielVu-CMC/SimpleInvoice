# SimpleInvoice

A responsive React/TypeScript and NestJS/TypeScript invoice application backed by PostgreSQL. It implements authentication, searchable invoice listing, invoice details, and creation with exactly one line item. The application was initialized from the requested [NestJS boilerplate](https://github.com/brocoders/nestjs-boilerplate) and [extensive React boilerplate](https://github.com/brocoders/extensive-react-boilerplate); Next.js was replaced with Vite and React Router. See [template provenance](docs/BOILERPLATES.md) for upstream revisions, retained components, and scope reductions.

A [short reviewer demo](docs/demo/index.html) shows exact decimal totals, concurrent duplicate-number protection, and derived Overdue filtering. See the [walkthrough and evidence](docs/DEMO.md) for the reproducible checks.

The specification is [Assessment_Fullstack_v3.0.0.md](requirements/Assessment_Fullstack_v3.0.0.md). Its document version is v2.3.1, despite the source filename.

## Run with Docker

Requirements: Docker Engine with Docker Compose, or a compatible runtime such as OrbStack or Colima. No application dependencies need to be installed locally for Docker use. Node.js 24 is required for the startup helper.

```sh
# Generate configuration, build, seed, and wait for all services to be healthy.
npm start
```

`npm start` works before installing npm dependencies and preserves an existing `.env`. Docker must be running and the configured ports must be available. It starts services in the background and waits for health checks.

Once images are built, `docker compose up` starts the entire stack. The legacy `docker-compose up` command also works when installed. Configuration must exist before starting; alternatively copy `.env.example` to `.env` and replace the database password in both `DATABASE_PASSWORD` and `DATABASE_URL`, plus `JWT_SECRET` with a random value of at least 32 characters.

| Service        | Default URL / port                  |
| -------------- | ----------------------------------- |
| Frontend       | http://localhost:5180               |
| Backend        | http://localhost:3001               |
| Swagger UI     | http://localhost:3001/api/docs      |
| OpenAPI JSON   | http://localhost:3001/api/docs-json |
| Database       | localhost:5432                      |
| Backend health | http://localhost:3001/health        |

Ports are bound to localhost. The default frontend port is **5180**, with `CORS_ORIGIN=http://localhost:5180`. Change `FRONTEND_PORT`, `APP_PORT`, or `DATABASE_PORT` in `.env` as needed. If changing the frontend port, update `CORS_ORIGIN` too. The frontend proxies `/api/*` to the backend; the backend exposes the exact assessment routes without a version or API prefix. Each service has its own Dockerfile. PostgreSQL data persists in the `invoice-data` named volume.

```sh
# Run in the background and wait for all health checks.
docker compose up -d --build --wait

# Review status or logs.
docker compose ps
docker compose logs backend

# Stop the stack and retain your data.
docker compose down
```

`docker compose down -v` removes the demo database permanently and is only appropriate when deliberately resetting all local data.

## Reviewer login

The public demo credentials supplied by `.env.example` and `npm run setup` are:

| Field    | Default demo value       |
| -------- | ------------------------ |
| Email    | `reviewer@example.com`   |
| Password | `reviewer-demo-password` |

The seed script reads these values exclusively from `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`; there are no hardcoded application credentials. Change them before deploying anywhere. The existing seeded user's password is left unchanged on repeated seeds; changing the environment password does not reset an existing account. This avoids silently altering accounts while restarting the stack.

## Run without Docker

Requirements: Node.js 24, npm, and PostgreSQL 17 (including the `pg_trgm` extension, supplied with the official PostgreSQL image and standard installations).

```sh
npm ci
npm run install:all
npm run setup
```

Create a PostgreSQL user/database matching your `.env`, or edit `DATABASE_URL` to an existing local development database. The database owner must be able to create tables and the `pg_trgm` extension. With Homebrew PostgreSQL on macOS, for example:

```sh
brew services start postgresql@17
# Create the user interactively so the password is not written into command history.
/opt/homebrew/opt/postgresql@17/bin/createuser --pwprompt simpleinvoice
/opt/homebrew/opt/postgresql@17/bin/createdb --owner=simpleinvoice simpleinvoice
```

If using Docker only for PostgreSQL, `docker compose up -d database` also works, with the generated `.env` already configured for its exposed port.

```sh
# Apply migrations and populate the database with one command.
npm run seed

# Terminal 1: backend development server
npm --prefix backend run start:dev

# Terminal 2: frontend development server
npm --prefix frontend run dev
```

Use the URLs and reviewer credentials above. `API_PROXY_TARGET` configures Vite's backend proxy; it must match the backend port for local development. `DATABASE_URL` must use the exposed database port for host processes. Docker overrides only the backend's database URL to address its internal database service.

```sh
# Production builds and TypeScript checks
npm run build
npm run typecheck

# Backend production start after building
npm --prefix backend start

# Apply migrations independently
npm --prefix backend run migration:run
```

## Database seeding

```sh
# From the repository root; also applies pending migrations.
npm run seed

# Or from backend/
npm run seed

# In the Docker stack (uses the compiled seed entrypoint automatically)
docker compose exec backend npm run seed
```

The idempotent seed adds Appendix A's invoice plus 40 records with varied names, dates, amounts, and Draft/Pending/Paid statuses. Generated dates are relative to the seed date so search, status filters, and pagination remain useful as time passes. Existing invoices are not overwritten. Appendix A's `Overdue` value is represented by stored `Pending`; the overdue status is derived on reads. Its legacy `type`, `invoiceGrossTotal`, and alternate paging keys are not part of the assessment API/model.

## Architecture and decisions

A monorepo keeps the API, web app, and Docker setup reviewable together. Each app has its own manifest and lockfile so it can also be built independently.

```text
backend/src/
  auth/             Login, logout, profile, Passport JWT authentication
  users/            User persistence model (bcrypt password hashes)
  invoices/
    domain/         Decimal calculations and overdue derivation
    dto/            Request validation and Swagger schemas
    infrastructure/ TypeORM entities and parameterized repository queries
  common/           Exception filter, date validators, error schemas
  config/           Validated environment configuration
  database/         Data source, versioned migration, idempotent seeds
frontend/src/
  components/       Shared feedback, navigation, status and upstream UI components
  features/auth/    Login screen
  features/invoices/ List, creation, detail, formatting and client validation
  services/         Typed fetch API and session context
```

- **Database:** PostgreSQL with TypeORM and explicit migrations. `synchronize` is disabled. Customer details are embedded as invoice columns to preserve the billed customer's snapshot. Items use a separate table with a foreign key, permitting future multi-item support. Creation accepts exactly one `item` object. There is no endpoint to add further items.
- **Money:** `decimal.js` calculations run exclusively on the backend. Rates and fixed currency discount amounts support two decimal places; tax percentages support four. Each subtotal and tax component is rounded half up to two decimal places before calculating total and balance. Database money values are `numeric(24,2)` and API amounts are decimal strings. The frontend formats returned amounts and never computes invoice totals. All currencies use two decimal places for this assessment, including JPY/VND.
- **Limits:** Item quantities are positive integers up to 1,000,000; rates/discounts are capped at 999,999,999,999.99 and tax at 9,999.9999% to fit explicit column precision. A discount greater than subtotal plus tax is rejected to prevent a negative payable amount. Invoice numbers are trimmed, unique, and case-sensitive, enforced by a database constraint. Customer/name/email limits prevent unbounded inputs.
- **Dates and statuses:** Dates are valid `YYYY-MM-DD` calendar dates. Due date is validated both server-side and with a database constraint. Today means UTC. Persisted statuses are only Draft, Pending, and Paid; non-Paid invoices with a due date before UTC today return Overdue. That includes overdue Draft invoices, as the specification states. A newly created invoice is always persisted as Draft, even if its derived response status is Overdue. Status filtering applies to this derived status before pagination.
- **Listing:** Case-insensitive, literal partial search on invoice number or customer name, inclusive `invoiceDate` bounds, three allowed sort columns, ASC/DESC ordering, stable UUID tie-breaking, server-side pagination (default 10, maximum 100), and correct match totals. LIKE wildcard characters are escaped. B-tree indexes support ordering/status/date lookups, and trigram GIN indexes support partial search.
- **Authentication:** Passwords use bcrypt (12 rounds). JWT access tokens default to 3,600 seconds, configurable via `JWT_EXPIRES_IN`. HS256, issuer, audience, signature, expiry, and user existence are checked. Browser JWT storage is an HttpOnly, SameSite=Strict cookie; `COOKIE_SECURE=true` enables Secure cookies with HTTPS. Tokens are never persisted in browser local/session storage. Login also returns `accessToken` for API tools, as required. All invoice routes and `/auth/me` use a JWT guard; unauthenticated pages redirect to `/login`.
- **Browser security:** Cookie mutations require `X-Requested-With: SimpleInvoice` and reject untrusted supplied Origins; CORS uses an explicit allowlist. The typed client sets the header automatically. Swagger supplies it as a default. Login is rate-limited to 10 requests/minute; all routes have a 120 requests/minute per-IP limit. Error bodies are consistent and do not expose internal stack traces.
- **UI:** Responsive navigation, searchable/sortable list, all status filters, optional date filters, page-size controls, loading/error/empty states, validated creation, duplicate-number feedback, creation success notification, session-expiry redirects, and a printable detail view. Keyboard focus moves to the main content on page navigation; mobile navigation traps focus, closes with Escape and restores trigger focus. Validation errors are linked to inputs, list updates are announced politely, and reduced-motion preferences are respected. Browser tests exercise keyboard-only flows and axe accessibility checks; tables retain native headers and link navigation.
- **Configuration:** All secrets and runtime settings come from environment variables. `.env.example` contains public demo values/placeholders; setup generates local secrets without replacing an existing `.env`. Production mode requires `COOKIE_SECURE=true`; use HTTPS and set `CORS_ORIGIN` to the exact deployed frontend origin. Frontend `VITE_*` settings are public build-time settings and require rebuilding when changed.

## REST API

| Method | Endpoint        | Authentication | Behavior                                             |
| ------ | --------------- | -------------- | ---------------------------------------------------- |
| POST   | `/auth/login`   | Public         | Validate credentials, return JWT/user and set cookie |
| GET    | `/auth/me`      | JWT            | Current profile, no password hash                    |
| POST   | `/auth/logout`  | Public         | Clear browser cookie (204)                           |
| GET    | `/invoices`     | JWT            | List/search/filter/sort/paginate                     |
| GET    | `/invoices/:id` | JWT            | Full detail, derived status                          |
| POST   | `/invoices`     | JWT            | Create Draft, one item, server-calculated totals     |
| GET    | `/health`       | Public         | Database connectivity check                          |

`GET /invoices` accepts `page`, `pageSize`, `sortBy`, `ordering`, `status`, `keyword`, `fromDate`, and `toDate` and returns `{ data: [...], paging: { page, pageSize, total } }`. Swagger documents all payloads, query parameters, response schemas, and HTTP status codes at `/api/docs`.

Example creation payload (send `X-Requested-With: SimpleInvoice` and an authorized cookie or `Authorization: Bearer <accessToken>`):

```json
{
  "invoiceNumber": "INV-2026-NEW",
  "invoiceDate": "2026-09-15",
  "dueDate": "2026-10-15",
  "currency": "AUD",
  "customer": { "fullname": "Paul", "email": "paul@example.com" },
  "item": { "name": "Honda RC150", "quantity": 2, "rate": 1000 },
  "taxPercent": 10,
  "discount": 20
}
```

For this example, subtotal is `2000.00`, tax `200.00`, total/balance `2180.00`, and initial total paid `0.00`. `taxPercent` and `discount` may be omitted and default to 10 and 0. Supplying server-owned fields such as `status`, `totalAmount`, `createdBy`, or `totalPaid` is rejected.

## Tests

```sh
# Mandatory frontend/backend unit tests
npm test

# Formatting check
npm run format:check

# Create an isolated test database in the running Compose PostgreSQL service.
npm run test:database

# Real PostgreSQL integration/end-to-end tests
npm run test:e2e

# Browser flows against the running full stack
# Uses installed Chrome on macOS; otherwise install the test Chromium browser first.
npx playwright install chromium
npm run test:browser
```

`npm run test:database` creates `simpleinvoice_test` and writes its connection URL into the ignored `.env.test`. Integration tests refuse databases whose names do not end in `_test`, and clear data only in that disposable test database. For non-Docker PostgreSQL, set `TEST_DATABASE_URL` to a separate database ending in `_test` before running `npm run test:e2e`; it takes precedence over `.env.test`.

Backend tests cover calculations, half-cent rounding, precision, overdue boundary conditions, date validation, required inputs, unique invoice constraints (including concurrency), auth/cookies/JWT expiry, error shapes, search, status filtering, sorting, pagination, date bounds, seeding, and Swagger. Frontend tests cover protected navigation, login validation, login failure, logout/expiry, unavailable APIs, listing controls, empty states, creation validation/success, and invoice details. Browser tests exercise actual login, creation/detail, filtering, pagination, logout, and mobile rendering.

## Request and authentication logs

Every backend HTTP request receives a fresh UUID in the `X-Request-ID` response header, including failed requests. The server generates this ID even if a caller supplies one. Browser clients can read the header through CORS. Find it in the browser Network panel and search the backend logs for the same value:

```sh
docker compose logs backend
```

Nest logs contain JSON event messages with `requestId`. `http.request` records the method, matched route template (or `unmatched`), response status, duration in milliseconds, and completion/abort outcome. `http.error` links unexpected server errors to the same ID and includes stack frames without the exception message. An aborted request has no completed response status.

Authentication events include `auth.login_success` (with the authenticated user's ID), `auth.login_failure` (bad credentials), `auth.login_rejected` (such as validation, origin, or rate-limit rejection), `auth.login_error`, `auth.login_aborted`, and `auth.access_denied` (other HTTP 401 responses). `auth.logout_cookie_cleared` records successful cookie clearing, not token revocation or a verified user logout.

Logs omit request/response bodies, query strings, submitted emails, passwords, tokens, cookies, and authorization headers. They use the existing Nest console logger; no external monitoring service is required. Requests served entirely by frontend Nginx do not receive a backend request ID.

## Scope and limitations

- Editing/deleting invoices, changing their status, recording payments, registration, password resets, and multi-item creation are outside the four-feature assessment scope. Seed data demonstrates Pending/Paid and partially paid invoices.
- Authenticated users share the invoice register as requested (all available invoices). This is a single-workspace app, without tenant isolation or role management.
- Logout clears the browser cookie; stateless bearer tokens already copied elsewhere remain valid until expiry. There are no refresh tokens or revocation store; expiration requires signing in again. The verified token expiry accompanies the profile, and the client automatically redirects when it expires, including on the creation screen.
- Search, status, invoice-date bounds, sorting, page size and pagination are stored in validated URL parameters and survive refresh, browser history and detail/back navigation. Monetary values remain exact in backend JSON/storage and are displayed using BigInt formatting with the server's original cents.
- Printing uses the browser print dialog; it is an extra convenience, not a server PDF endpoint. The backend remains the source of totals for the single item.
- Production TLS termination, monitoring, backups, and deployment-specific proxy/rate-limit settings require configuration for the target environment. The included Compose environment is for local review.

## Submission

The implementation is local and has not been submitted or published. The assessment requires a repository ID/URL and candidate submission email, alongside source code and this README, sent by the candidate to the contacts listed in the assessment document.
