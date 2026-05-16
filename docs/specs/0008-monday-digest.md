# Monday digest

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

The Sunday-night pivot table that Ops produces by hand is the meeting artifact for SkyKnight's Monday staffing meeting — and it's the most expensive recurring labor in the current process. The MVP must replace it with an automatically generated email that Partners read in Outlook, and Associates read without ever seeing comp.

## Goals

- Every Monday at 6:00 AM Pacific, two emails go out: a Partner edition (with comp) and an Associate edition (without comp).
- Both editions are HTML-rendered inside the email body — not a link to a dashboard.
- The same view is available on demand in the web UI for any week.
- The digest is the Monday meeting artifact; no human assembly is required.

## Non-goals

- Per-Partner customization of the digest.
- Reports beyond the weekly digest — PRD non-goal.
- A "wins this week" section celebrating Placed candidates — PRD §10 question 4. Resolved during spec authoring: not in MVP.
- An admin UI for managing recipients — recipient list is derived from seeded profiles + their roles.

## Users / actors

- **Recipients:** all profiles with role `partner` receive Partner edition; all profiles with role `associate` receive Associate edition.
- **Trigger:** a Monday-6am-PT scheduled job.
- **On-demand viewers:** any authenticated user via web UI.

## Acceptance criteria

- [ ] A digest builder produces a structured digest object for a given week, with sections grouped by portfolio company.
- [ ] For each portfolio company: list of Open Searches; for each Search: list of *active* Pipeline Entries (stage ∉ `placed`, `passed`); for each entry: executive name, current stage, last contact date (from most recent Interaction), owner, and comp values (Partner edition only).
- [ ] Top of digest: a callout summarizing the week's duplicate-outreach alerts from spec 0007 (count + brief list).
- [ ] Comp redaction is performed by the same data-layer guard from spec 0005 — the digest builder receives a role-scoped query result, not a raw query plus a "should I show comp" flag.
- [ ] The scheduled job runs at 06:00 America/Los_Angeles every Monday and sends both editions; failed sends are logged and retried once after 5 minutes.
- [ ] An admin-only "send now" button in the web UI triggers an immediate send to all recipients of the appropriate edition.
- [ ] The web UI route `/digest?week=YYYY-Www` renders the same digest for any week (current and historical), again role-scoped.

## Approach

- A pure builder function takes `(week, role)` and returns the structured digest.
- A renderer takes the structured digest and produces email HTML.
- A scheduled job invokes builder + renderer + transactional email provider.

## Out of scope

- Mobile-optimized HTML (Outlook desktop and OWA are the targets).
- Tracking opens/clicks.

## Open questions

- *(none)*

## Risks

- Scheduler missing a Monday. Mitigation: log the run; the "send now" admin button provides a manual recovery path.
- HTML rendering inconsistencies across Outlook clients. Mitigation: keep the template simple — tables and inline styles; no JavaScript, no images beyond inline.

## References

- PRD §6.7 (Monday Digest)
- Spec 0005 (Comp Access Control)
- Spec 0007 (Duplicate Outreach Alerts)
