# Plan: feat/comp-access-control

> Tier: Significant
> Spec: docs/specs/0005-comp-access-control.md
> Author: @jacobwu-b
> Status: approved

## Branch

`feat/comp-access-control`

## What

Enforce partner-only access to comp fields (`base_salary_cents`, `target_bonus_cents`, `equity_bps`) on pipeline entries via a single repository-level guard; expose write + read UI for partners; omit keys entirely from associate responses.

## Files

- `src/lib/pipeline.ts` — add `requestingRole` param to `listPipelineEntriesForSearch`; add `updatePipelineEntryComp`; add `CompFields` + `PartnerPipelineEntryRow` types; internal `redactComp` helper
- `src/lib/pipeline.test.ts` — add comp-redaction tests; update existing calls to pass role
- `src/lib/pipeline.guard.test.ts` — **new** static scan: fails if `pipelineEntries` referenced outside `schema.ts` + `pipeline.ts`
- `src/app/searches/[id]/page.tsx` — pass `user.role` to list fn; add comp columns (partner only)
- `src/app/searches/[id]/pipeline/actions.ts` — add `updatePipelineCompAction` (partner-gated)
- `evals/tasks/0001-associate-comp-read.md` — **new** eval task

## Approach

- `listPipelineEntriesForSearch(searchId, requestingRole)` always selects comp from DB; `redactComp` destructures and omits the three keys when role is `associate` — keys are absent from the returned object, not `null`.
- `PartnerPipelineEntryRow` extends `PipelineEntryRow` with the three comp fields; existing callers pass `user.role` and type-narrow before accessing comp.
- `updatePipelineEntryComp` writes comp to DB; server action enforces partner role before calling it.
- Guard test walks `src/**/*.{ts,tsx}` and asserts `pipelineEntries` (the Drizzle table object) only appears in schema + pipeline module.
- No new migration — columns already exist in `0000_init.sql`.

## Tests

- Partner response includes all three comp keys with known fixture values (`pipeline.test.ts`)
- Associate response object has no `baseSalaryCents`/`targetBonusCents`/`equityBps` keys — verified via `in` operator and `JSON.stringify` string-match (`pipeline.test.ts`)
- `updatePipelineEntryComp` updates fields and returns `ok` (`pipeline.test.ts`)
- `updatePipelineEntryComp` returns `not_found` for unknown entry (`pipeline.test.ts`)
- Guard: no TS file outside allow-list references `pipelineEntries` (`pipeline.guard.test.ts`)

## Manual steps

None — no new env vars, no new migrations, no Vercel config changes.

---

## Significant-tier additions

### Blast radius

- `listPipelineEntriesForSearch` signature change — all callers must pass `requestingRole` (currently one caller: `searches/[id]/page.tsx`)
- `PipelineEntryRow` type unchanged; `PartnerPipelineEntryRow` is additive
- `groupPipelineEntriesByStage` unchanged — takes `PipelineEntryRow[]`, `PartnerPipelineEntryRow[]` is assignable

### Risks / open questions

- Future read path added that bypasses the repository → caught by guard test + eval task
- TypeScript optional keys don't enforce runtime omission → `redactComp` using rest destructuring provides the runtime guarantee; associate test string-matches to verify no comp value in serialised output

### ADR

`docs/decisions/0003-comp-access-boundary.md` — approved.
