# Verification

Baseline verified locally on 2026-09-15, with selected improvements verified on 2026-09-16 using Node.js 24 on Apple Silicon macOS and OrbStack 2.2.3. The table below records that baseline; later logging and print checks are recorded separately below. Historical browser and PostgreSQL results do not imply those suites were rerun after every change.

| Check                                   | Result                            |
| --------------------------------------- | --------------------------------- |
| Backend unit tests                      | 58 passed                         |
| Frontend unit/component tests           | 42 passed                         |
| PostgreSQL integration/end-to-end tests | 43 passed                         |
| Browser workflows                       | 8 passed                          |
| TypeScript checks and production builds | Passed                            |
| Prettier formatting                     | Passed                            |
| Runtime dependency audits               | No known vulnerabilities reported |
| Docker Compose full stack               | All three services healthy        |
| Host and container seed commands        | Passed, idempotent                |

The browser suite runs against the actual Docker stack with an isolated headless Chrome session. It covers protected navigation, login, cookie persistence after reload, search, status filtering, ordering, pagination, empty results, creating an invoice, returned totals, details, duplicate-number handling, blank optional tax/discount inputs, mobile navigation, mobile overflow checks, and logout. Created browser-test invoices are cleaned up by exact UUID and the test-only invoice-number prefix.

Integration tests use a separate `simpleinvoice_test` database and verify actual constraints, concurrent creation, status derivation, validation, expiry, response shapes, dates, exact large-value persistence, and Swagger schemas.

Local app URL: http://localhost:5180. The frontend default in `.env.example` is 5180; backend/database defaults are 3001/5432.

Screenshots are in [screenshots](screenshots/), covering all four screens on desktop and mobile. The in-app Browser was unavailable, so visual QA and interaction tests used the repository's Playwright test suite with installed Chrome. OrbStack's Docker engine, Compose, Buildx, and `hello-world` container were also verified; the runtime is capped at 4 CPUs and 4 GB of dynamically allocated RAM.

This is local verification, not a deployment or a submission. Production-specific settings and scope limitations are documented in the README.

## Selected improvements — 2026-09-16

- Invoice list controls now use normalized URL parameters. Tests verify refresh, detail/back navigation, browser history and malformed URLs. React tests cover restoration of keyword/status/date/sort/page-size/page controls; URL parser tests cover invalid dates and bounded inputs.
- A browser test completes the core login/create/search/detail/back workflow using keyboard input, Tab and Enter, then checks mobile menu focus containment and Escape/restore. Login errors link to fields; the first invalid input receives focus.
- Axe checks pass for login, register, creation before/after validation, details and the open mobile menu, using WCAG 2/2.1 A/AA rule tags. Low-contrast secondary text was darkened. This is targeted automated and keyboard verification, not a claim of full accessibility compliance.
- All 100 unit tests (58 backend, 42 frontend) and all 8 browser tests pass. Type checks and formatting pass; the current frontend production image builds and runs healthy. The 43 PostgreSQL E2E checks passed earlier on 2026-09-16; these backend rules were unchanged by the UI work.
- The [reviewer demo](demo/index.html) and [walkthrough](DEMO.md) document exact decimal calculation, concurrent duplicate-number arbitration, and derived Overdue filtering. Its sanitized evidence is stored alongside the recording. The recorder uses Chrome’s built-in MediaRecorder; the Playwright ffmpeg download timed out and no system ffmpeg dependency was installed.

## Clean startup helper — 2026-09-16

`npm start` generates a missing `.env`, builds/starts Compose in the background, and waits for health checks. Requires Node.js 24 and running Docker Compose; no host npm install is needed.

Verified from a temporary source copy without .env, node_modules, or compiled output, with a fresh database volume. The test copy used a separate Compose project and ports 5281/3301/5543 to avoid the development stack. Docker reused host build cache; this was not an uncached build or remote Git checkout verification.

All services became healthy. Frontend, seeded reviewer login through the proxy, and authenticated listing of 41 invoices passed. Repeat setup preserved configuration byte-for-byte. Temporary containers and their database volume were removed.

## Commit preparation — 2026-09-16

Reran 100 unit tests (58 backend, 42 frontend), TypeScript checks, and formatting successfully before committing. Existing work was grouped into requirements, selected skills, Claude context, implementation, tests, documentation, and demo commits. These commits organize the existing project; they do not reconstruct its original development chronology or establish Claude authorship. Local environment files and generated dependencies/build artifacts remain ignored.

## Logging and printing follow-up — 2026-09-16

- Backend tests increased to 65 across five suites after adding request/authentication logging, and passed. Backend typecheck and build passed; changed backend files passed formatting checks.
- The logging tests verify distinct UUIDs for concurrent requests, response/log correlation, sensitive-data exclusion, failed and rejected login, internal errors, logout cookie clearing, malformed JSON, unknown routes, and CORS exposure. Authentication is stubbed in these focused tests; they do not replace database integration checks.
- The frontend build and Docker frontend rebuild passed after the print stylesheet change. The served CSS was checked for zero page margins and invoice padding. The reviewer confirmed the print issue was resolved after refreshing Chrome’s cached page.
- These follow-up checks did not rerun the PostgreSQL or full browser suites.
