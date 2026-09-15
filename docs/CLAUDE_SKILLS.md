# Focused Claude Code skill setup

Four skills from [Jeffallan/claude-skills](https://github.com/jeffallan/claude-skills) are installed in `.claude/skills/` for this repository only. No marketplace bundle or workflow commands were installed.

## Why these four

| Skill | Project need | Use it for |
| --- | --- | --- |
| nestjs-expert | Required NestJS API, DTO validation, TypeORM, JWT guards, Swagger | Backend implementation and API contract review |
| react-expert | Required responsive React/TypeScript UI | Forms, hooks, navigation, accessibility, loading/error states |
| test-master | Mandatory unit tests and a complete integration workflow | Identify gaps in money/date logic and critical user flows; verify behavior |
| security-reviewer | Secure authentication and guarded invoice resources | Review JWT validation, cookies, origin checks, SQL input handling, and secrets |

NestJS already covers TypeORM and REST/Swagger; React already covers TypeScript and UI testing. Separate TypeScript, API-design, PostgreSQL, Playwright, DevOps, and general review skills would overlap or broaden this small assessment unnecessarily. Add one later only when a concrete task needs its deeper guidance. Docker instructions and existing browser tests remain available without extra skills.

## Provenance

- Upstream revision: `882ef55e377dbf9a4dbe496bb41ac6ccd0e555cf`.
- Selected skill directories, including all their reference files, are copied unchanged.
- MIT license: `.claude/skills/UPSTREAM-LICENSE`.
- Project-specific guidance lives in `CLAUDE.md`, separately from upstream files.
- This setup documents installation, not evidence that Claude authored or reviewed the existing implementation.

## Demonstrate deliberate use

Open a new Claude Code session from the repository root after installation. Use `/nestjs-expert`, `/react-expert`, `/test-master`, or `/security-reviewer`, followed by a scoped task. Example prompts:

```text
/nestjs-expert Compare POST /invoices against the assessment. Trace DTO validation,
server calculations, persistence, and Swagger. Cite file locations and identify
contract mismatches before proposing changes.

/react-expert Review the invoice creation screen for keyboard navigation,
validation feedback, and loading/error states. Keep Vite and React Router.
Explain any tradeoff and propose the smallest useful improvement.

/test-master Map existing tests to the assessment's critical business rules.
Identify missing boundary cases for decimal rounding, UTC overdue derivation,
and concurrent duplicate numbers. Add only meaningful missing tests and run them.

/security-reviewer Review local authentication and invoice access controls.
Trace JWT expiry/signature checks, cookie settings, origin checks, and query input
handling. Report verified findings with file locations, impact, and fixes.
```

Show proficiency through the work: constrain the task, inspect Claude's assumptions,
challenge weak recommendations, review the diff, and run the appropriate checks.
For a real session, record the prompt, relevant recommendation, your decision and
reason, changed files, and actual test results. Do not present installation or
example prompts as completed review evidence.
