# [PROJECT NAME] — Claude Code Instructions

The spec is the source of truth. Tests are the contract. This file is the operating system.
Read it before every session. Rules are not suggestions.

---

## Non-negotiables

1. Branch from main, squash-merge to main. Branches never touch other branches.
2. No secrets in code, comments, or logs. Ever.
3. Spec → Plan → Tests → Code. In that order. No exceptions for "small" work above Trivial.
4. Tests are the definition of done. Green tests → auto-open PR. No waiting.
5. No AI attribution anywhere in git history.
6. When in doubt, stop and surface — don't work around.

---

## 1. Project Context

- **What:** [one sentence]
- **Spec:** `docs/specs/` — read the relevant spec before any feature work
- **Stack:** [language] / [framework] / [database] / [hosting]
- **Commands:** test=`X` lint=`Y` typecheck=`Z` build=`W`

---

## 2. Engineering Philosophy

These four govern every decision below. Violations are the most common failure mode.

**Think before coding.** State assumptions. If multiple interpretations exist, present them — don't pick silently. If something's unclear, name it and ask. Hidden confusion compounds.

**Simplicity first.** Write the minimum code that solves the problem. No speculative abstractions, no unrequested flexibility, no error handling for impossible scenarios. If 200 lines could be 50, rewrite.

**Surgical changes.** Touch only what the task requires. Don't "improve" adjacent code, don't refactor what isn't broken, match existing style. Every changed line must trace to the request. Clean up orphans *your* changes created — leave pre-existing dead code alone (file an issue per §7).

**Goal-driven execution.** Convert every task into a verifiable goal before coding. "Add validation" → "tests for invalid inputs pass." "Fix the bug" → "regression test passes." Strong success criteria let the loop run; weak ones produce drift.

---

## 3. Session Start

Run `git checkout main && git pull origin main`, then `git status` and `git branch`. If anything is unexpected (uncommitted changes, untracked files you didn't create, lockfile drift), stop and report.

Then, before any work above Trivial:
1. Read this file end-to-end.
2. Read the relevant spec in `docs/specs/`. If none exists for the task, stop and surface — specs come before code.
3. If touching a subtree with its own `CLAUDE.md`, read that too.
4. Skim `docs/decisions/` for ADRs that constrain the area you're touching.

**Definition of Ready:** state acceptance criterion and blast radius in one sentence each. If either is unclear, ask.

**Triage** — when in doubt, treat as one tier larger.

| Tier | Criteria | Process |
|---|---|---|
| **Trivial** | Low blast radius, reversible: typo, comment, rename, formatting, isolated refactor, single-file feature ≲100 lines, no schema/dep/contract changes | Proceed directly. Auto-PR on green. |
| **Standard** | One feature, ≲10 files, no schema or dep changes, no new patterns | Standard plan → approval → Spec/TDD loop → auto-PR. |
| **Significant** | >10 files, multiple domains, schema/dep changes, new architectural patterns, or anything irreversible | Discuss in chat *first*. ADR in `docs/decisions/` (use `_TEMPLATE.md`) if non-obvious. Then full plan → approval. |

---

## 4. The Loop: Spec → Plan → Tests → Code

**Trivial work skips this. Standard and Significant always run it.**

1. **Spec.** Confirm acceptance criteria against the relevant `docs/specs/` file. If the spec is silent or contradicts the request, stop and surface — don't infer. New features without a spec require one first; use `docs/specs/_TEMPLATE.md`.
2. **Plan.** Produce the format below. For Significant work, save the plan to `docs/plans/{branch-name}.md` using `docs/plans/_TEMPLATE.md`. Wait for approval.
3. **Tests (Red).** Write failing tests against the acceptance criteria *before* implementation. The failure is the executable spec.
4. **Code (Green).** Minimum code to pass. No scope expansion mid-loop — if a risk surfaces that wasn't planned, stop and report.
5. **Refactor.** Clean up while staying green.
6. **Ship.** Tests/types/lint/build green → auto-open PR (§5).

### Standard plan
```
Branch: {type}/{scope}-{description}
What:     [1 sentence]
Files:    [paths — create/modify]
Approach: [2–4 bullets]
Tests:    [behavior, location]
Manual:   [migrations/env/dashboard, or "none"]
```

### Significant plan
Standard plan + **Blast radius** (consumers, schemas, types, runtime), **Risks/open questions**, **ADR link or "not needed because…"**.

If a risk surfaces mid-implementation that wasn't in the plan: stop and report. No unilateral architectural decisions.

---

## 5. Git & PR Protocol

**Invariant:** every branch is born from the tip of main and dies by squash-merge into main. A merge conflict means this rule was broken — stop and report, do not resolve.

**Branch:** `{type}/{scope}-{description}`, kebab-case. Types: `feat` `fix` `chore` `test` `docs` `refactor` `perf`.

**PR title** = squash commit on main. Conventional Commits: `{type}({scope}): {imperative, ≤72 chars}`. PR title must reference the Linear issue ID (e.g. `ENG-123`) if one is known for automatic linking/status sync.

**Auto-PR on green.** When tests, types, lint, and build all pass on a feature branch, push and open the PR immediately. Do not wait for confirmation. Use `.github/PULL_REQUEST_TEMPLATE.md` — fill every section, no placeholders. Post the URL.

**Attribution:** zero AI attribution, co-author tags, or agent signatures. Anywhere.

**Aborting a branch:** close PR, `git branch -D {branch}`. Unmerged work is discarded — no recovery protocol.

---

## 6. Architecture Invariants

Violating any of these requires written approval *before* the code is written.

- **Data access:** [where queries live, ORM/client conventions]
- **External calls:** [location, auth, error contract]
- **State:** [client/server boundary, state library policy]
- **Configuration:** all env vars read from [config path]; nowhere else. New env vars → `.env.example` entry in same PR. No secrets in code, comments, or logs.
- **Schema:** any persistent schema change ships with a migration in the same PR. No exceptions.
- **Dependencies:** new deps and version bumps require approval (name, version, justification, why existing deps don't solve it, weekly downloads, last publish). Major bumps need changelog review. Lockfile drift from main without explanation is stop-and-report.
- **Logging:** project logger only — no `console.log`/`print` in committed code. Never catch without logging or re-raising. Never swallow an error to pass a test.
- **Soft-delete:** [policy] — no hard deletes where soft-delete applies.

---

## 7. Tests

Tests are the contract. A PR without appropriate tests is not done.

| Built | Required |
|---|---|
| Pure function / utility | Unit tests: happy + edges |
| API endpoint / server action | Unit tests with mocked boundaries |
| Data transformation | Unit tests with realistic inputs |
| Bug fix | Regression test that would have caught it |
| Refactor | Pre-existing tests still pass |
| UI component (no logic) | None — note in PR |
| Wiring / config | None — manual verify, note in PR |

**Quality bar.** Test behavior, not implementation. Sentence-shaped names (`createNote returns error when unauthenticated`). Cover the unhappy path. Realistic inputs — not `"test"` / `1` / `true`. Mock at the boundary (DB/HTTP client), never deep inside. No real network or DB writes in unit tests.

**Hard prohibitions:** mocking the thing under test, loosening assertions to pass, committing `skip`/`only`, tests that pass against both bug and fix, deleting failing tests instead of fixing the cause.

**Evals.** When a production incident or user-facing bug occurs, add a task to `evals/tasks/` capturing the failure mode. Evals are the regression suite for the agent itself; they run in CI and gate merges.

---

## 8. Issues

Issues capture work that **isn't the current task**. They are not a prerequisite for starting one.

**File one when** mid-implementation you find: out-of-scope bug, broken invariant, tech debt (dead code, duplication, missing tests, fragile pattern). Do not silently fix. Do not expand the current PR. Link from the PR's "Out of scope" section.

**Don't file** for: the current task, trivial fixes you're authorized to make, vague feelings without a concrete problem.

Use the templates in `.github/ISSUE_TEMPLATE/`.

---

## 9. Hard Prohibitions

Stop and surface before any of these:

- Commit to main; manual `merge`/`rebase`; force-push; branch from anything but main; AI attribution in git
- Add or version-bump a dependency without approval
- Read env vars outside the config layer
- Suppress a type/lint error without an explanatory comment
- Build anything outside the current task; refactor unrelated files; fix unrelated bugs without asking
- Introduce a new architectural pattern without approval
- Mark work done before merge is confirmed

---

## 10. Landmines

Document specific things the agent gets wrong here as they happen. Each entry: one-line description + correct behavior. Remove entries that no longer fire. Daily landmine review during the first 60 days.

- *(none yet)*

---

## 11. Definition of Done

All of:
- Feature meets acceptance criteria from the spec
- Tests written and green; types, lint, build green
- PR auto-opened against main, template filled, URL posted
- Manual steps documented in the PR
- Merged and confirmed

Code written ≠ done. Tests passing ≠ done. PR opened ≠ done. **Merged and confirmed = done.**

---

## 12. Repository Map

Where things live. If you're creating something new, check here first — there's probably a template.

| Path | What it's for | Template |
|---|---|---|
| `CLAUDE.md` | This file. Operating system for the agent. | — |
| `README.md` | Human-facing project overview. | — |
| `docs/specs/` | Source of truth for features. Spec before code. | `_TEMPLATE.md` |
| `docs/decisions/` | ADRs. One file per architectural decision. | `_TEMPLATE.md` |
| `docs/plans/` | Significant-tier plans, saved before implementation. | `_TEMPLATE.md` |
| `.github/PULL_REQUEST_TEMPLATE.md` | Auto-loaded into every PR. Fill every section. | — |
| `.github/ISSUE_TEMPLATE/` | Bug, tech debt, and feature issue forms. | — |
| `.github/workflows/ci.yml` | Required checks: lint, types, tests, build, evals. | — |
| `.github/repo-settings.md` | GitHub settings every new repo must mirror. | — |
| `.claude/skills/` | Domain skills loaded on demand. Keep small. | `_TEMPLATE/` |
| `.claude/hooks/` | Deterministic guardrails. Format, lint, danger checks. | — |
| `evals/tasks/` | Real failures captured as agent regression tests. | `_TEMPLATE.md` |
| `scripts/` | Repeatable maintenance scripts (setup, etc.). | — |
| `.env.example` | Every env var the app reads. New var → update this in same PR. | — |

**Subtree CLAUDE.md.** When a subdirectory has conventions that don't apply globally (e.g. a `frontend/` with its own state-management policy), add a `CLAUDE.md` in that subtree. Keep it surgical — only what's specific to the subtree. The agent loads it lazily when it touches files there.

**Skills.** Add a skill when a workflow is repeated, domain-specific, and would otherwise bloat this file. Each skill is a folder with `SKILL.md`. Trigger description must be precise — vague triggers cause uniform context decay. Use `.claude/skills/_TEMPLATE/` as a starting point.
