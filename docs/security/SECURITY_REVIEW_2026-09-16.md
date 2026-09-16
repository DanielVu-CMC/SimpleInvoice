# SimpleInvoice security review

## Executive summary

Reviewed on 2026-09-16 using `.claude/skills/security-reviewer/SKILL.md`, against commit `f4a7ba1` and the current working tree. The pre-existing README edit was included as context and left unchanged.

The application has strong baseline controls for its stated local assessment scope. The main verified defect is shared rate-limit buckets behind the included Nginx proxy. Production configuration also accepts public example credentials, which would be a serious risk if deployed unchanged. No SQL injection, unguarded invoice endpoint, or unsafe React HTML rendering was identified in the reviewed paths.

**Assessment context:** The project owner confirmed that this is exclusively a take-home assessment and will never be deployed to production. Evaluation assumes local reviewer use, sample invoice data, and the supplied loopback-bound Compose ports. Production hardening is outside the project scope.

**Risk assessment:** Low practical risk for the intended local assessment use. The technical findings remain documented, but their scenario-based severity scores do not imply assessment blockers. Shared proxy rate limits can still inconvenience a reviewer; password truncation matters only when configuring a password beyond bcrypt's byte limit.

**Review status:** Complete with the assessment-only scope confirmed by the project owner. Remediation is optional within that scope. The recommended disposition is to retain the current implementation and acknowledge the limitations; no application fixes were applied or are required by this report for submission.

## Scope and authorization

The user's request authorized a local repository security review. Activities covered source, npm dependencies, tracked-file secret patterns, container configuration, existing unit tests, and isolated proofs using synthetic inputs. No production or external application was tested. No existing database was modified, no running stack was load-tested, and no application fixes were made.

The assessment specification intentionally requires a documented reviewer account, a shared invoice register, and stateless JWT sessions. Those requirements are considered when classifying findings. Default credentials are acceptable for the local demo; their unchecked reuse in production is the concern.

## Findings summary

CVSS v3.1 scores are analyst estimates for the stated attack scenarios, not measurements of deployment exposure or priorities for this assessment. The original technical scores are retained for transparency; practical applicability and recommended disposition are recorded separately below.

| ID | Severity | CVSS | Finding | Evidence |
| --- | --- | --- | --- | --- |
| SEC-001 | High | 8.2 | Public example credentials accepted in production configuration | Configuration proof and source review; deployment-dependent |
| SEC-002 | Medium | 5.3 | Proxy clients share login rate-limit bucket | Isolated application proof |
| SEC-003 | Low | 3.7 | Passwords exceeding bcrypt's byte limit silently lose their suffix | Library proof and source review |

Technical scenario counts: **0 Critical, 1 High, 1 Medium, 1 Low**. The High finding concerns a production deployment explicitly excluded from this project's scope. Two additional unscored hardening observations appear below. A clean dependency audit is not evidence that the application has no vulnerabilities.

### Assessment disposition

| Item | Applicability to this assessment | Recommended decision |
| --- | --- | --- |
| SEC-001: Public example credentials | Documented reviewer access and automatic demo seeding support the assessment requirements. Production configuration safeguards are outside scope. | Acknowledge; retain demo behavior and the existing setup-generated JWT/database secrets. |
| SEC-002: Shared proxy rate limits | Applies to the included topology; repeated login attempts can temporarily block local reviewer sessions. | Acknowledge; fix optionally if reviewer usability warrants it. |
| SEC-003: bcrypt byte limit | The supplied reviewer password does not reach the limit; custom long seed passwords can. | Acknowledge; byte-length validation is an optional correctness improvement. |
| Database initialization role | Simplifies local initialization, migrations, and seeding of sample data. | Retain for the assessment; no separate runtime role required. |
| Authentication audit records | Operational monitoring is outside the assessment requirements. | Document as a limitation; no monitoring infrastructure required. |

The remediation and acceptance checks below describe how a fix could be implemented and verified if chosen. They are not mandatory submission criteria.

## SEC-001 — Public example credentials accepted in production

- **Locations:** `backend/src/config/environment.ts:18`, `backend/src/config/environment.ts:36`, `.env.example:10`, `.env.example:14`, `backend/docker-entrypoint.sh:4`, `backend/src/database/seed/seed.ts:18`.
- **Classification:** CWE-1392 / CWE-798; High, CVSS `8.2` (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N`). Score assumes a reachable deployment retaining public credentials, with disclosure of invoice/customer information and unauthorized creation of invoices.

**Evidence:** Parsing `.env.example`, changing only `NODE_ENV` to `production` and `COOKIE_SECURE` to `true`, then invoking the actual `validateEnvironment()` function succeeds. The JWT check enforces length but does not reject the known public placeholder. The container always runs the seed entrypoint; seeding creates the configured reviewer account if it does not exist. Its first user ID is deterministic and public in source.

**Impact:** If these public values are retained in a reachable deployment, someone can authenticate using the documented demo password. A retained public JWT key also permits token signing for a known existing user. JWT algorithm, audience, issuer, and user-existence checks do not protect against a known signing key.

**Limits:** `npm run setup` generates random database and JWT secrets for a new `.env`; this materially mitigates the signing-key issue on the recommended setup path. It intentionally keeps the documented reviewer password. The README instructs deployers to change the credentials. No local private secret was printed or evaluated for compromise, and no deployed authentication bypass was attempted.

**Remediation:** Reject known placeholder JWT/database secrets and demo account credentials when production mode is enabled. Gate demo seeding explicitly and keep it off in production. Provision production accounts separately. Rotate an existing seeded account through an explicit administrative action: changing the seed password environment variable does not update an existing user's hash. Rotate any signing key that has actually been deployed with a public value.

**Acceptance check:** Production startup rejects the public example values; the intended local demo still seeds successfully; a production start does not create a demo account implicitly.

## SEC-002 — Nginx clients share login rate limits

- **Locations:** `frontend/nginx.conf:10`, `backend/src/main.ts:7`, `backend/src/auth/auth.controller.ts:53`, `backend/src/app.module.ts:36`.
- **Classification:** CWE-770; Medium, CVSS `5.3` (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L`).

**Evidence:** Nginx forwards requests and client address headers, but the backend never configures Express proxy trust. The installed Nest throttler tracks `req.ip`, which therefore identifies the proxy connection. An isolated Nest application used the real `AuthController`, `setupApplication`, and `ThrottlerGuard`, with a stub authentication service to avoid database access. Ten requests with one synthetic forwarded address returned 200; the eleventh returned 429. A request with a second forwarded address then also returned 429.

**Impact:** One client can consume the shared ten-login-attempts-per-minute budget and temporarily block other users behind the same proxy. Other throttled endpoints also share proxy-based buckets, separately per handler. This is an availability issue; it does not bypass password checks. The isolated proof models the proxy boundary; a live multi-client Docker test was not run.

**Remediation:** Configure proxy trust narrowly for the actual Nginx address/subnet or validated deployment topology. Ensure the trusted edge sanitizes forwarded headers and prevent an alternate direct path from spoofing identities. Do not blindly trust every proxy or read the leftmost supplied forwarded header. Consider account-aware login throttling and shared limiter storage if multiple backend instances are introduced.

**Acceptance check:** Distinct clients through Nginx receive distinct budgets; fabricated forwarded headers on untrusted/direct requests cannot evade limits; one client's login exhaustion does not block another.

The [NestJS proxy guidance](https://docs.nestjs.com/security/rate-limiting#proxies) describes the required adapter configuration.

## SEC-003 — Long passwords silently truncate at bcrypt's byte limit

- **Locations:** `backend/src/auth/auth.dto.ts:15`, `backend/src/auth/auth.service.ts:26`, `backend/src/database/seed/seed.ts:24`, `backend/src/config/environment.ts:26`.
- **Classification:** CWE-187; Low, CVSS `3.7` (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N`). This scores the limited password-verification weakness, not a demonstrated full account takeover.

**Evidence:** Login permits 128 characters and seed configuration has no maximum byte length. A local check with the installed bcryptjs hashed a synthetic password containing 72 ASCII characters followed by `X`; comparison with the same prefix followed by `Y` returned true. UTF-8 passwords can reach the byte limit with fewer characters.

**Impact:** Users choosing long passwords receive less effective password material than their input implies. A person who already knows the entire effective 72-byte prefix does not need the suffix. This is not a practical short-password bypass, and the supplied demo password does not trigger it.

**Remediation:** Enforce the supported UTF-8 byte limit consistently at seed/provisioning and login boundaries, with a clear error, or adopt a password hashing scheme that supports the intended input length and plan migration of stored hashes. Avoid silently truncating input in validation.

**Acceptance check:** Passwords above the supported byte limit are rejected explicitly, including multibyte examples; supported passwords authenticate unchanged.

The [bcryptjs documentation](https://github.com/dcodeIO/bcrypt.js#security-considerations) documents its 72-byte input limit.

## Additional hardening observations

### Runtime uses the database initialization role

`docker-compose.yml:6` sets `POSTGRES_USER` from `DATABASE_USERNAME`, and `docker-compose.yml:22` uses the same identity for the backend. On a newly initialized official PostgreSQL image, this role is a superuser, as documented by the [official image](https://hub.docker.com/_/postgres). Actual role privileges in an existing volume were not inspected.

This expands the consequences of stolen backend database credentials or a future database execution vulnerability. It is not a demonstrated standalone remote exploit, so no CVSS score is assigned. Before production, separate initialization/migration credentials from a runtime role restricted to the required schema and operations. Verify `rolsuper = false` for the runtime role.

### Authentication events lack explicit audit records — addressed in follow-up

`backend/src/auth/auth.service.ts:20` handles successful and failed login without explicit security event logging. `backend/src/common/exception.filter.ts:26` logs server errors, not a structured authentication audit trail. Nginx access logs may provide request metadata, but do not replace account-aware events. No operational logging platform was assessed.

Add structured authentication success/failure and limiter events for production monitoring, with retention/access controls and no passwords, JWTs, or cookie contents. No standalone CVSS score is assigned because this is a detection gap.

**Follow-up implementation:** At the owner's request, local request and authentication logging was added after this review. Every backend request receives a server-generated UUID returned in `X-Request-ID`. Structured event messages correlate request completion, unexpected errors, successful and unsuccessful login, rejected login requests (including rate limits), unauthorized access, and logout cookie clearing. Successful login events include the user ID; bodies, submitted emails, credentials, query strings, and raw exception messages are excluded. This addresses the local authentication logging gap without adding external monitoring infrastructure. SEC-001, SEC-002, and SEC-003 remain acknowledged without fixes under the assessment-only decision. The original review test results below describe the review baseline, before this follow-up.

## Controls that held up in source review

- Invoice routes have a controller-level JWT guard; `/auth/me` also requires authentication.
- JWT verification pins HS256, audience and issuer, checks expiry, validates the subject format, and verifies that the user exists.
- Password hashes use bcrypt cost 12, are excluded from default selection, and are omitted from response profiles. Unknown-account login uses a dummy hash and the same credential error.
- Browser sessions use HttpOnly, SameSite=Strict cookies. Production validation requires the Secure flag. The frontend does not store JWTs in localStorage or sessionStorage.
- Mutations require a custom request header and reject supplied untrusted Origins. CORS is an explicit allowlist.
- Validation rejects unexpected properties and limits nested input sizes. Sort columns/directions are allowlisted before query construction; search and filter values are parameterized.
- Totals, initial status, and creator identity come from the backend; client-supplied server-owned fields are rejected.
- API middleware sets `Cache-Control: no-store`; unexpected server errors return a generic message. The frontend Nginx configuration includes a CSP and framing protection.
- The backend image runs as `node`, and Compose binds published ports to loopback.

The shared invoice register is intentional under the specification, not an IDOR finding. Stateless tokens remaining valid after logout are documented behavior; a revocation store would be an additional production requirement rather than an assessment defect. Public Swagger and the health endpoint are likewise expected here.

## Verification and limitations

| Activity | Result |
| --- | --- |
| Root `npm audit --json` | 0 reported vulnerabilities; 7 dependencies reported |
| Backend `npm --prefix backend audit --json` | 0 reported vulnerabilities; 812 dependencies reported |
| Frontend `npm --prefix frontend audit --json` | 0 reported vulnerabilities; 193 dependencies reported |
| `npm test` | 58 backend tests and 42 frontend tests passed; 8 suites total |
| Production example configuration proof | Accepted by real validator |
| Isolated proxy/rate-limit proof | Second synthetic forwarded client received 429 after first exhausted budget |
| Synthetic bcrypt boundary proof | Distinct suffixes after 72 bytes compared equal |
| Automated source-pattern search | Reviewed query construction, execution/HTML sinks, token storage, and credential references manually |
| Tracked-file credential-pattern scan | 110 text files scanned; no matches for the selected AWS/GitHub/Slack/private-key/JWT patterns outside bundled skill files |
| Tracked environment files | Only `.env.example` tracked; private local environment contents not printed |

The dependency audits ran before manual authentication review and included development dependencies. Their results reflect the registry response at review time; they do not cover base-image OS packages or unknown vulnerabilities.

Semgrep, Gitleaks, and Trivy were unavailable on PATH. No claim of a full SAST, entropy-based secrets scan, or container vulnerability scan is made. The limited credential scan excluded bundled skill guidance to avoid matching its example detection patterns and did not scan Git history or binary assets. General password/secret references were additionally reviewed in application code and setup scripts.

Existing PostgreSQL integration tests were read but not executed. Browser tests, live proxy/TLS behavior, database role inspection, cloud infrastructure, backups, and production penetration testing were outside the performed verification. The isolated limiter fixture stubbed authentication, so its successful responses do not prove real database login behavior.

## Recommendations for assessment submission

1. Retain the documented reviewer account, automatic sample-data seeding, loopback port bindings, and setup-generated JWT/database secrets. These support a reproducible local review.
2. Keep the findings and verification limits in this report. No security code changes are required for submission based on the confirmed scope and reviewed evidence.
3. If choosing an optional improvement, prioritize proxy-aware throttling because it can affect the actual reviewer experience. Password byte-length validation is a smaller optional correctness improvement.
4. Do not add production account provisioning, separate database roles, monitoring infrastructure, or additional security tooling solely to close this assessment report. The existing observations explain those tradeoffs.

The owner confirmed the assessment-only scope and that fixes may be chosen or deferred. This report recommends acknowledging the current limitations without expanding project scope. Its conclusion applies to local evaluation with sample data, not to an unrelated future use of the code.
