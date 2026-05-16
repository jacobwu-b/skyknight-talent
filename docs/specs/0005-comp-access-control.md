# Compensation access control

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

Today, comp expectations live in spreadsheet cells that Associates can read freely. SkyKnight has stated this is unacceptable — Associates must be physically unable to see Base Salary, Target Bonus, and Equity Percentage on any Pipeline Entry. The MVP is failed if a single read path leaks comp to an Associate. This is the highest-stakes invariant in the system (PRD §6.4, success metric #4).

## Goals

- Partners can read and write all three comp fields on any Pipeline Entry.
- Associates cannot read any of the three comp fields on any Pipeline Entry, via any code path — UI, JSON API, CSV export, email digest, or admin tooling.
- Enforcement lives at the data layer, not the presentation layer.

## Non-goals

- Hiding comp columns "by default with a toggle" — there is no toggle. Associates have no read path, period.
- Per-search comp visibility overrides.
- Auditing who *attempted* to read comp data — deferred to v1.1.

## Users / actors

- **Partner:** full read/write on comp.
- **Associate:** zero read on comp under any circumstances.

## Acceptance criteria

- [ ] Three columns added to `pipeline_entries`: `base_salary` (money/int), `target_bonus` (money/int), `equity_percentage` (decimal). All nullable.
- [ ] Partner UI exposes form controls and read views for all three; Associate UI never renders these fields and never receives them in API responses.
- [ ] Every server-side read path that returns a Pipeline Entry filters comp columns when the requesting role is `associate`. Enumerated paths must include: list endpoints, detail endpoints, search results, Monday digest builder, DealCloud CSV export, executive history view.
- [ ] Enforcement is implemented as a single repository-level (or DB-policy-level) guard, not as N independent filters in N route handlers.
- [ ] Tests enumerate every read path with an Associate session and assert no comp value appears in the response payload (string match against known fixture values).
- [ ] An eval task in `evals/tasks/` captures the failure mode "Associate reads comp via path X" and is wired into CI.

## Approach

- Add comp columns via migration.
- Centralize the comp redaction in the Pipeline Entry repository (or via row/column policies in the database — TBD by the stack ADR). All callers go through this single boundary.
- Write the eval task as a parameterized list of every read endpoint × an Associate identity, asserting comp absence.

## Out of scope

- Audit logging of comp access (v1.1).
- Differential access within the Partner cohort.

## Open questions

- Should the API return `null` for comp fields when an Associate calls, or omit the keys entirely? **Decision:** omit the keys entirely — there is no "this exists but you cannot see it" signal that the Associate UI can lean on. Resolved during spec authoring.

## Risks

- A new read path is added later that bypasses the repository guard. Mitigation: the eval task explicitly lists every read surface and CI fails when a new Pipeline Entry endpoint is added without an entry in the eval matrix. Document the convention in CLAUDE.md §6.

## References

- PRD §4 (Users & Roles), §6.4 (Compensation Access Control)
- `docs/decisions/0003-comp-access-boundary.md`
