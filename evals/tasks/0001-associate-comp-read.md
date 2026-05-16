# Eval 0001: associate-comp-read

> Source: spec 0005 / ADR-0003 — pre-emptive regression task (no live incident yet)
> Added: 2026-05-16
> Severity: embarrassing

## What went wrong

(Pre-emptive.) The failure mode being guarded against: a developer adds a new read path
that returns Pipeline Entry data — a new API route, a digest builder, a CSV exporter, an
executive-history view — without routing through `src/lib/pipeline.ts`. Because the
comp-redaction logic lives only in that module, the new path would leak `baseSalaryCents`,
`targetBonusCents`, and `equityBps` to Associate-role callers, violating PRD §6.4.

## Setup

Seed the database with:
- One partner user (e.g. `partner@example.com`)
- One associate user (e.g. `associate@example.com`)
- One search
- One pipeline entry in that search with known comp values:
  - `base_salary_cents = 35000000` ($350,000)
  - `target_bonus_cents = 5000000` ($50,000)
  - `equity_bps = 150` (1.5%)

Sign in as the associate user (set `sk_session` cookie to a valid signed token for the
associate profile ID).

## Input

For each read surface listed below, issue a request as the associate user and capture the
full response payload (JSON body or rendered HTML):

1. `GET /searches/{searchId}` — the search detail page (pipeline table)
2. Future: `GET /api/pipeline/{entryId}` — if a JSON detail endpoint is added
3. Future: digest builder output — if a Monday digest endpoint is added
4. Future: `GET /api/export/dealcloud` — if a CSV export endpoint is added
5. Future: executive history view — if pipeline entries appear on the executive detail page

```
As an associate user, access each read surface enumerated above and record the full
response. Confirm no comp value appears in any response.
```

## Pass criteria

For every enumerated read surface:

- [ ] The string `35000000` does not appear anywhere in the response body
- [ ] The string `5000000` does not appear anywhere in the response body
- [ ] The string `150` does not appear anywhere in the response body (context: equity_bps)
- [ ] The keys `baseSalaryCents`, `base_salary_cents`, `targetBonusCents`,
      `target_bonus_cents`, `equityBps`, `equity_bps` do not appear in any JSON response
- [ ] No comp dollar amount or basis-point value appears in rendered HTML

## Fail criteria

- Any response (JSON or HTML) that contains `35000000`, `5000000`, or `equityBps`/
  `baseSalaryCents`/`targetBonusCents` (in any casing or snake_case variant) when the
  session belongs to an associate user.
- A new route handler that imports `pipelineEntries` directly from `src/lib/db/schema.ts`
  instead of using `src/lib/pipeline.ts` — caught by `src/lib/pipeline.guard.test.ts`.

## Notes

This is the highest-severity security invariant in the system (PRD §6.4, success metric #4).
The `pipeline.guard.test.ts` in CI provides a static layer: it fails if `pipelineEntries`
is referenced outside the allow-list. This eval task provides the dynamic layer: it enumerates
every read surface and verifies no comp value escapes at runtime.

When adding a new read path that returns pipeline data:
1. Route it through `src/lib/pipeline.ts` (never query `pipelineEntries` directly).
2. Add the new surface to the "Input" list above.
3. Add a corresponding unit test in `src/lib/pipeline.test.ts` asserting comp is absent
   from associate responses on that path.

See CLAUDE.md §6 (Architecture Invariants) for the convention.
