# Plan: SkyKnight Talent Network MVP

## Context

SkyKnight's Deal Team runs ~3,000 executive contacts and ~200 active C-suite searches through shared Excel files and Outlook threads. The PRD (v1.0 MVP) calls for a single source-of-truth web app that (a) replaces the Sunday-night pivot table with an auto-generated Monday digest, (b) enforces comp confidentiality between Partners and Associates *at the data layer*, and (c) ingests outreach via a BCC mailbox so Partners don't change behavior. The PRD intentionally omits stack decisions — those land in ADR-0002 as the first unit. Rollout window is 7 weeks: 4 weeks build, 1 week internal beta, 2 weeks parallel use.

The plan below decomposes the PRD into 18 PR-sized units across 6 milestones. Tracer-bullet ordering: Milestone 1 delivers a working executive list end-to-end (auth → DB → UI → deploy) before any pipeline logic exists.

---

## 1. Spec list

| # | Slug | Summary |
|---|---|---|
| 0001 | `auth-and-roles` | **Simulated** Netflix-style profile selector; user picks a profile that is either Partner or Associate. No real auth integration in MVP. |
| 0002 | `executive-records` | CRUD + global search for Executive records |
| 0003 | `search-records` | CRUD for Search records (portfolio company, role, status) |
| 0004 | `pipeline-entries` | Add executive to Search; stage transitions; owner assignment |
| 0005 | `comp-access-control` | Data-layer enforcement that Associates cannot read Base/Bonus/Equity |
| 0006 | `email-ingestion` | BCC mailbox parsing → Interaction rows + Unmatched Inbound queue |
| 0007 | `duplicate-outreach-alerts` | 14-day window detection; auto-reply to BCCing Partner |
| 0008 | `monday-digest` | Two-edition HTML email + on-demand web view |
| 0009 | `dealcloud-export` | Manual CSV export of open Pipeline Entries |
| 0010 | `interaction-history` | Executive-level history view across Searches and Interactions |

10 specs, mapped 1:1 to the 10 functional surfaces in PRD §6 plus auth.

---

## 2. Milestones

| M | Title | Demonstrable outcome |
|---|---|---|
| 0 | Foundations | Stack chosen, app deploys, CI gates pass |
| 1 | Tracer: authed exec list | Logged-in user sees a list of Executives in production |
| 2 | Pipeline core | Partner builds a Search and walks a candidate through stages |
| 3 | Comp confidentiality | Associate cannot see comp anywhere; tests prove it |
| 4 | Email ingestion + alerts | BCC'd email creates Interaction; duplicate-outreach reply fires |
| 5 | Monday digest + export | Two-edition digest sends on schedule; CSV button works |

---

## 3. Units per milestone

### Milestone 0 — Foundations

**U0.1 — `chore(arch): adopt stack and infra (ADR-0002)`**
- Spec ref: none (ADR only)
- Tier: **Significant**
- Acceptance: ADR-0002 merged choosing app framework, DB, hosting, email-ingestion provider, secrets store; CLAUDE.md §1 "Stack" and §6 invariants updated; `.env.example` enumerates required vars.
- Files: `docs/decisions/0002-stack-and-infra.md`, `CLAUDE.md`, `.env.example`
- Dependencies: none
- Size: S
- Risks: Wrong choice forces costly retrofit. Mitigation: write ADR against PRD §7 NFRs (managed services, zero DevOps, single region).
- complexity:opus

**U0.2 — `chore(scaffold): bootstrap app + CI gates`**
- Spec ref: none
- Tier: Standard
- Acceptance: `dev`/`test`/`lint`/`typecheck`/`build` real commands; `.github/workflows/ci.yml` runs them; placeholder home route returns 200; deploys to staging.
- Files: framework scaffold, `package.json`, `.github/workflows/ci.yml`, `scripts/`
- Dependencies: U0.1
- Size: M
- Risks: Scope creep into premature abstractions. Stay minimal.

**U0.3 — `feat(db): schema for core objects + migration tooling`**
- Spec ref: none (cross-cuts 0002–0006)
- Tier: Significant
- Acceptance: Migration creates tables for Executive, Search, PipelineEntry, Interaction, User; foreign keys + indices per access patterns; rollback works; seed script for dev.
- Files: migration files, schema module, `scripts/seed.*`
- Dependencies: U0.2
- Size: M
- Risks: Comp fields must be modeled to support row/column-level enforcement (M3). Schema decision here constrains 0005.
- complexity:opus

---

### Milestone 1 — Tracer: authed executive list

**U1.1 — `feat(auth): simulated profile selector (netflix-style)`**
- Spec ref: `0001-auth-and-roles`
- Tier: Standard
- Acceptance: Landing page shows a grid of seeded profiles (mix of Partners and Associates) rendered with anime-style avatar graphics, à la Netflix profile picker; clicking a profile creates a session with that profile's role; a "switch profile" affordance returns to the picker; `/whoami` returns `{ name, role }`. **No real auth integration** — session is a simple signed cookie keyed to the chosen profile row. Seed data lives in the dev seed script and ships with the app.
- Files: profile picker route + page, anime avatar assets, session cookie module, `/whoami` route, seed updates, tests
- Dependencies: U0.3
- Size: M
- Risks: Must be unambiguously labeled as a simulation so it isn't mistaken for production auth; the data-layer comp boundary (U3.1) must still hold against a forged/swapped session cookie. Document in CLAUDE.md §6 that real SSO is deferred post-MVP.

**U1.2 — `feat(executives): list and detail views (read-only)`**
- Spec ref: `0002-executive-records`
- Tier: Standard
- Acceptance: Authenticated user sees paginated list of Executives; clicking opens a detail view showing static fields; no edit yet.
- Files: list route, detail route, data-access module, tests
- Dependencies: U1.1
- Size: S

**U1.3 — `feat(executives): create, edit, global search`**
- Spec ref: `0002-executive-records`
- Tier: Standard
- Acceptance: Create form persists; edit form updates; global search box matches name/role/tag with case-insensitive partial match; tests cover happy + invalid inputs.
- Files: forms, server actions/handlers, search query, tests
- Dependencies: U1.2
- Size: M

---

### Milestone 2 — Pipeline core

**U2.1 — `feat(searches): CRUD and status`**
- Spec ref: `0003-search-records`
- Tier: Standard
- Acceptance: User creates Search with portfolio company, role title, hiring manager, status Open/Filled/Paused; list and detail views render; tests cover transitions.
- Files: search routes, forms, data-access, tests
- Dependencies: U1.3
- Size: S

**U2.2 — `feat(pipeline): add executive to search and stage transitions`**
- Spec ref: `0004-pipeline-entries`
- Tier: Standard
- Acceptance: From a Search, add an existing Executive → creates Pipeline Entry at stage Identified; can advance through fixed stage set; owner assignment dropdown lists Partners + Associates.
- Files: pipeline entry routes, transition handler, owner select, tests
- Dependencies: U2.1
- Size: M

**U2.3 — `feat(pipeline): search detail grouped by stage`**
- Spec ref: `0003-search-records`, `0004-pipeline-entries`
- Tier: Standard
- Acceptance: Search detail view shows Pipeline Entries grouped by stage; per entry shows executive name, owner, last contact (placeholder until M4).
- Files: search detail enhancements, tests
- Dependencies: U2.2
- Size: S
- complexity:haiku

---

### Milestone 3 — Comp confidentiality (hard requirement)

**U3.1 — `feat(comp): partner-only comp fields on pipeline entries`**
- Spec ref: `0005-comp-access-control`
- Tier: Significant
- Acceptance: Base, Target Bonus, Equity Percentage columns added; Partner can read/write via UI and API; Associate gets 403 (or filtered nulls per spec) on every read path including list, detail, exports; tests enumerate every read surface; data-layer policy (e.g. RLS or repository-level guard) — not just UI hiding.
- Files: schema migration (add columns), data-access policy, form fields gated by role, API handlers, tests + eval task
- Dependencies: U2.2
- Size: M
- Risks: This is the most consequential security boundary in the system. Eval task in `evals/tasks/` captures the failure mode per CLAUDE.md.
- complexity:opus

**U3.2 — `feat(executives): interaction history tab`**
- Spec ref: `0010-interaction-history`
- Tier: Standard
- Acceptance: Executive detail shows tab with every Search the executive has been in and every Interaction logged, in reverse chronological order; respects comp visibility from U3.1.
- Files: history view, query, tests
- Dependencies: U3.1
- Size: S

---

### Milestone 4 — Email ingestion + duplicate-outreach alerts

**U4.1 — `feat(ingest): bcc mailbox webhook to interaction rows`**
- Spec ref: `0006-email-ingestion`
- Tier: Significant
- Acceptance: Inbound email provider posts to webhook; matched Executive (by To address) gets Interaction row attached to all open Pipeline Entries; stored fields per PRD §6.5; webhook is signature-verified; tests with fixture payloads.
- Files: webhook route, parser, matcher, tests + fixture emails
- Dependencies: U3.1 (Interactions must respect comp boundary indirectly — they don't store comp but live on entries that do)
- Size: M
- Risks: Provider auth + replay; idempotency on duplicate webhook deliveries.
- complexity:opus

**U4.2 — `feat(ingest): unmatched inbound queue + triage UI`**
- Spec ref: `0006-email-ingestion`
- Tier: Standard
- Acceptance: Inbound mail with no matching Executive lands in queue; Associate UI lets them assign to existing Executive or dismiss; no auto-create.
- Files: queue table migration, queue routes, triage form, tests
- Dependencies: U4.1
- Size: M

**U4.3 — `feat(alerts): duplicate-outreach detection and auto-reply`**
- Spec ref: `0007-duplicate-outreach-alerts`
- Tier: Standard
- Acceptance: On new Interaction, if another Partner logged an Interaction with same Executive in past 14 days, send an automated email to the BCCing Partner naming the other Partner + date + Search context; non-blocking; record alert for digest callout.
- Files: alert detector, outbound email module, tests
- Dependencies: U4.1
- Size: S

---

### Milestone 5 — Monday digest + DealCloud export

**U5.1 — `feat(digest): on-demand web view of weekly digest`**
- Spec ref: `0008-monday-digest`
- Tier: Standard
- Acceptance: Authenticated user picks a week; sees digest rendered with all sections from PRD §6.7; Partner edition includes comp, Associate edition omits; access enforced by U3.1.
- Files: digest builder module, render template, route, tests
- Dependencies: U4.3
- Size: M

**U5.2 — `feat(digest): monday 6am scheduled send`**
- Spec ref: `0008-monday-digest`
- Tier: Standard
- Acceptance: Scheduled job runs every Monday 06:00 PT; sends Partner edition to Partner group and Associate edition to Associate group; failed sends logged + retried once; manual "send now" admin button.
- Files: scheduler config, send job, email template, tests (with frozen clock)
- Dependencies: U5.1
- Size: M
- Risks: Scheduler reliability per PRD §7 (no HA requirement, but Monday delivery is the hero deliverable).

**U5.3 — `feat(export): dealcloud csv button`**
- Spec ref: `0009-dealcloud-export`
- Tier: Standard
- Acceptance: Admin button generates CSV of all open Pipeline Entries with DealCloud-compatible columns; omits comp for Associate downloader; download streams (no email).
- Files: export route, CSV serializer, tests
- Dependencies: U3.1
- Size: S
- complexity:haiku

---

## 4. Critical path

U0.1 → U0.2 → U0.3 → U1.1 → U1.2 → U1.3 → U2.1 → U2.2 → **U3.1** → U4.1 → U4.3 → U5.1 → U5.2

U3.1 is the linchpin — it gates every read path that follows and is the only Significant unit in the security boundary. Schedule the strongest contributor there.

## 5. Parallelizable tracks

Once U3.1 lands, three tracks fan out:

- **Ingestion track:** U4.1 → U4.2 → U4.3
- **Digest track:** U5.1 → U5.2 (depends on U4.3 only for the alerts callout — can stub initially)
- **Export track:** U5.3 (independent of M4 entirely)

Earlier parallelism:
- U2.3 can run alongside U3.1 (read-only view, doesn't touch comp policy).
- U3.2 can run alongside U4.1 once U3.1 lands.

---

## Totals

- **17 units** across 6 milestones (within the 10–25 MVP cap)
- **10 specs**
- **4 Significant** units (U0.1, U0.3, U3.1, U4.1 — all justified by schema/security/integration blast radius)
- **complexity:opus** on 4 units (U0.1, U0.3, U3.1, U4.1); **complexity:haiku** on 2 (U2.3, U5.3); default on the rest

## Top risks

1. **Comp boundary correctness (U3.1).** A single missed read path is a hard-requirement failure per PRD §6.4 and success metric #4. Mitigation: data-layer enforcement, exhaustive read-path test enumeration, eval task.
2. **Stack ADR lock-in (U0.1).** Wrong managed-service choice forces M5 (scheduler, email-out, digest send) to retrofit. Mitigation: ADR explicitly weighs scheduler + transactional email + inbound parse against PRD §7 NFRs.
3. **Inbound email provider quirks (U4.1).** Signature schemes, parse fidelity, and idempotency vary widely. Mitigation: pick provider during U0.1; build against fixtures; defer richer parsing per PRD non-goal "AI/NLP parsing of email content."
4. **PRD §10 open questions** resolved during spec authoring with conservative defaults: Passed entries soft-deleted (visible behind a filter), bounces to mailbox auto-replied with "this is a tracking address", 14-day window kept as configurable constant, no wins section in MVP digest.
