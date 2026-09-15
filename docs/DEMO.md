# Reviewer walkthrough

Open [the demo player](demo/index.html), or download [the captioned video](demo/simpleinvoice-demo.webm). It is a short recording of the actual local Docker stack, with captions added only by the recording script. The application has no demo overlays or special backend behavior. The video has no audio; its captions and the transcript below explain each step.

The recorder also saves [sanitized evidence](demo/evidence.json). It contains only invoice input/result values, HTTP status codes and the stored/returned status comparison. It does not save access tokens, cookies or database credentials. Generated demo invoices are removed afterward by exact UUID and the `DEMO-` number prefix.

## Transcript and evidence

1. **Sign in and filter Overdue.** The register filters the effective status before server-side pagination. For Appendix A's invoice, the recorder checks PostgreSQL directly: stored `Pending`, returned `Overdue`. Paid invoices remain Paid, and invoices due today are not overdue. An expired Draft is also Overdue according to the specification.
2. **Refresh, open details and return.** Status, sort and page size survive refresh; the Back link returns to the same URL and register view. Keyword, inclusive invoice-date bounds and page number use the same validated URL state. Invalid URL values fall back to safe defaults; inverted real date bounds show an error and prevent a list request. Out-of-range pages normalize after the server returns the match count.
3. **Create a precision example.** Quantity `3`, rate `0.10`, tax `0` produces exactly `0.30`. The frontend sends inputs only. Decimal.js calculates backend totals; PostgreSQL stores numeric values; the API returns decimal strings; the frontend formats the original cents.
4. **Send concurrent duplicate creations.** The recorder sends two simultaneous authenticated POSTs with the same number. One succeeds with `201`; one returns `409`. A database unique constraint protects the number even under contention. The winner also demonstrates half-up tax rounding: `0.05 × 10% = 0.005`, rounded to `0.01`, giving total `0.06`.

## Keyboard and accessibility verification

`tests/browser/invoices.spec.ts` completes login → invalid creation → valid creation → search → detail → back with Tab/Enter and keyboard input. It verifies that the first invalid field receives focus and links to its error. It also checks mobile navigation focus containment and Escape-to-close with focus returned to the trigger.

Automated axe checks cover login, register, creation before/after validation, details and the open mobile menu, using WCAG 2 A/AA and WCAG 2.1 A/AA rule tags. Visible focus, route focus, required-field semantics, polite list-update announcements, higher text contrast and reduced-motion support are included. These checks are useful evidence, not a declaration of complete WCAG compliance or a substitute for testing with assistive technology.

## Re-record

With dependencies installed and the configured Docker stack healthy:

```sh
npm run demo:record
```

The script records actual viewport frames at roughly five frames per second and encodes them with Chrome’s built-in MediaRecorder; no ffmpeg installation is required. This requires a Playwright browser (installed Chrome on macOS, otherwise `npx playwright install chromium`) and a host-accessible `DATABASE_URL` matching the running stack. It uses the configured reviewer account. Output replaces the previous local video/evidence; no material is uploaded or published.

## Interview talking points

- **Why derive Overdue?** Time passing changes the effective status without a write job. Apply that same condition in SQL filtering before counting/pagination so the UI and page totals agree.
- **Why both validation and a unique constraint?** Application feedback is helpful, but only the database safely arbitrates concurrent requests. Catch the unique violation and map it to a stable 409 response.
- **Why decimal strings?** Money must remain exact across calculation, database serialization and display. The chosen policy is half-up rounding to two decimal places, documented as an assessment assumption.
- **Why URL state?** It makes a register view reproducible across refresh, browser history, copied links and a round trip to invoice details without a separate persistence store.
