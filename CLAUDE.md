# SimpleInvoice working context

Read `requirements/Assessment_Fullstack_v3.0.0.md` for requirements and `README.md` for implemented behavior and run commands before proposing changes.

## Stack and boundaries

- Backend: NestJS 11, TypeScript, PostgreSQL 17, TypeORM migrations, class-validator, Swagger, Passport JWT.
- Frontend: React 19, TypeScript, Vite, React Router. This is a browser SPA; do not introduce Next.js, Server Components, or server actions.
- Scope: authentication, invoice list, detail, and creation with exactly one item. Preserve existing API contracts.
- Calculate money only on the backend with decimal.js. API money values are decimal strings. Preserve half-up rounding and database precision.
- Persist Draft/Pending/Paid only; derive Overdue on reads using UTC dates, including before filtering/pagination.
- Enforce unique invoice numbers in PostgreSQL, including concurrent requests. Keep synchronize disabled.
- Keep JWTs in HttpOnly cookies for browser sessions and preserve existing origin/header checks. Never print or commit local environment secrets.

## Selected skills

Project skills are in `.claude/skills/`; selection and provenance are in `docs/CLAUDE_SKILLS.md`.
Use only the skill relevant to the task and load references as needed. Related-skill metadata is not a requirement to install additional skills. Project requirements and existing behavior take precedence over generic examples.

## Verification

Use existing scripts rather than generic skill commands: there is no lint script.
- `npm run typecheck` and `npm run build` for compilation.
- `npm test` for backend Jest and frontend Vitest/Testing Library.
- `npm run format:check` for project formatting.
- `npm run test:e2e` requires a disposable PostgreSQL database ending in `_test`; see README setup instructions.
- `npm run test:browser` requires the running stack and Playwright browser setup.

For changes, explain the requirement, proposed approach, and tradeoffs; implement a focused change, verify observable behavior, and report actual results and remaining limitations. Never claim a check passed without running it. Security review should focus on local source, dependencies, and authentication; external active testing requires an explicitly defined scope.
