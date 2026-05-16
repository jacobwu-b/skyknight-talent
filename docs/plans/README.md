# Plans

Per-branch implementation plans for Significant-tier work (and optionally
Standard-tier work for traceability). Drafted before code. Reviewed.
Approved. Then implemented.

## When to file

- **Always** for Significant work (see `CLAUDE.md` §3).
- **Optional** for Standard work — useful when handing off between
  contributors or running multiple agents in parallel.
- **Never** for Trivial work — overhead.

## Authoring

Use [`_TEMPLATE.md`](./_TEMPLATE.md). Filename: same as the branch
(`feat-payments-refunds.md`). One plan per branch.

## Lifecycle

Plans are short-lived. Once the PR merges, the plan is archival — keep it
for traceability but don't update it. New work gets a new plan on a new
branch.

## Why this exists

The brief: *"Forces commitment before tokens."* A written plan is the
cheapest place to catch a bad approach. It's also the cleanest delegation
contract — give the plan to an agent and the implementation is bounded.
