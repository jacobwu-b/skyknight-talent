# Product Requirements Document: SkyKnight Talent Network

**Version:** 1.0 (MVP)
**Owner:** SkyKnight Portfolio Operations
**Status:** Draft for Review

---

## 1. Problem

SkyKnight's 20-person Deal Team manages ~3,000 elite executive contacts across portfolio company C-suite searches using shared Excel files, Outlook threads, and ad-hoc text messages. This produces three concrete failures:

1. **Duplicate outreach.** Multiple Partners contact the same executive about the same or different searches without coordination, damaging SkyKnight's reputation with senior talent.
2. **Dropped pipeline visibility.** No single source of truth for where each candidate stands in each search. The Sunday-night pivot table is reconstructed manually each week.
3. **Comp data leakage risk.** Compensation expectations live in unstructured spreadsheet cells with no access control. Associates can see Partner-only economic data today.

The system of record must move off Excel without forcing Partners — who live in Outlook and have explicitly rejected DealCloud's UI — to adopt heavy new software.

## 2. Goal

Ship an internal web application that becomes the single source of truth for SkyKnight's executive search pipeline, generates the Monday staffing meeting report automatically, and enforces comp confidentiality between Partners and Associates — while requiring near-zero behavior change from Partners.

## 3. Non-Goals (Explicitly Out of Scope for MVP)

- Mobile app (Outlook is the mobile interface)
- AI / NLP parsing of email content
- LinkedIn or third-party data enrichment
- Candidate-facing portal, scheduling, or self-service
- Configurable pipeline stages or custom fields
- Real-time DealCloud sync (quarterly CSV export only)
- Audit log and version history (deferred to v1.1)
- Reporting beyond the Monday digest (Excel export is the escape valve)

## 4. Users & Roles

Two roles. No others in MVP.

**Partner** — full read/write across all data including compensation. Conducts outreach, negotiates economics, owns searches.

**Associate** — full read/write across all data **except** compensation fields, which are physically inaccessible. Sources candidates, manages initial pipeline movement, prepares reports.

Authentication via Microsoft Entra SSO. Role assignment via Microsoft 365 group membership.

## 5. Core Objects

| Object | Description |
|--------|-------------|
| **Executive** | Reference record for a person in the talent network. Persists across searches. |
| **Search** | A C-suite role being filled at a specific portfolio company. |
| **Pipeline Entry** | The atomic unit. Represents one executive being considered for one search. Holds stage, comp expectations, and ownership. |
| **Interaction** | A timestamped contact event, populated automatically from BCC'd email or manually added. |

The same executive can appear in multiple Pipeline Entries across different Searches. Comp expectations attach to the Pipeline Entry, not the Executive — different roles command different terms.

## 6. Functional Requirements

### 6.1 Executive Management
- Create, edit, and search executive records (name, email, phone, LinkedIn, current role, notes, tags)
- Global search across all executives by name, current role, or tag
- View an executive's full history: every Search they've been in, every Interaction logged

### 6.2 Search Management
- Create a Search tied to a portfolio company, role title, and hiring manager
- Search status: Open, Filled, Paused
- View all Pipeline Entries for a Search, grouped by stage

### 6.3 Pipeline Entry Management
- Add an executive to a Search (creates a Pipeline Entry)
- Move a Pipeline Entry through a fixed stage set: **Identified → Contacted → Screening → Partner Interview → Client Interview → Offer → Placed / Passed**
- Assign an owner (the Partner or Associate driving this candidate)
- Attach structured comp expectations: **Base Salary**, **Target Bonus**, **Equity Percentage** (Partner-only fields)

### 6.4 Compensation Access Control (Hard Requirement)
- Associates cannot view Base, Target Bonus, or Equity Percentage on any Pipeline Entry under any circumstances — not in the UI, not via the API, not in any exported report.
- Enforcement must occur at the data layer, not just the presentation layer.
- The Monday digest sent to Associates must omit comp fields entirely. The Partner digest includes them.

### 6.5 Email Ingestion (BCC Workflow)
- Partners BCC `search@skyknightcapital.com` when emailing a candidate.
- System parses the inbound email, matches the recipient (To address) to an existing Executive record, and writes an Interaction row.
- If multiple open Pipeline Entries exist for that executive, attach the Interaction to all of them with a note.
- If no Executive matches the recipient email, route to an **Unmatched Inbound queue** for Associate triage. Do not auto-create executives from inbound mail.
- The system stores: sender, recipient, timestamp, subject, and first ~500 characters of the body. Full email archival is out of scope.

### 6.6 Duplicate Outreach Visibility
- When a new Interaction is logged, check whether another Partner has logged an Interaction with the same executive in the previous 14 days.
- If yes, send an automated reply to the BCCing Partner naming the other Partner, the date, and the relevant Search context. No hard block on the outreach itself.
- Surface the same information in the Monday digest as a callout: "N executives received outreach from multiple Partners this week."

### 6.7 The Monday Digest (Hero Deliverable)
- Generated and sent automatically every Monday at 6:00 AM Pacific.
- Two versions: **Partner edition** (includes comp columns) and **Associate edition** (omits comp).
- Content, grouped by Portfolio Company:
  - Open Roles (one section per Search)
  - For each Search: list of Active Candidates (Pipeline Entries where stage ≠ Placed, Passed)
  - Per candidate: name, current stage, last contact date, owner, comp (Partner edition only)
  - Top-of-email callout: duplicate-outreach alerts from the past week
- Rendered as HTML inside the email body. Not a link to a dashboard. Partners read it in Outlook.
- The web UI must offer the same view on demand for any week.

### 6.8 DealCloud Export
- A manual button in the web UI generates a flat CSV of all open Pipeline Entries suitable for upload to DealCloud.
- No scheduled job, no API integration. Ops runs it quarterly.

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Scale** | Up to 10,000 executives, 200 active Searches, 20 concurrent users |
| **Availability** | Business hours, single region. No high-availability requirement. |
| **Security** | SSO mandatory. Comp access enforced at data layer. All traffic over TLS. |
| **Backup** | Daily point-in-time backup with 30-day retention |
| **Operations** | Must run with zero dedicated DevOps headcount. Managed services only. |

## 8. Success Metrics

Measured 60 days post-launch:

1. **Adoption:** ≥ 90% of Partner outreach to executives is BCC'd to the tracking address (measured by sampling Partner sent-items against logged Interactions for a one-week window).
2. **Replacement:** The Sunday-night pivot table is no longer manually produced; the Monday digest is the meeting artifact.
3. **Duplicate outreach incidents:** Reduced by ≥ 75% versus a baseline count established in the two weeks before launch.
4. **Comp leakage:** Zero incidents of Associates accessing compensation data. Hard requirement, not a target.

## 9. Rollout

- **Weeks 1–4:** Build.
- **Week 5:** Internal beta with 2 Partners and 2 Associates. Fix what they complain about; defer all feature requests to v1.1.
- **Weeks 6–7:** Full team uses the new system in parallel with Excel.
- **End of Week 7:** Excel is killed as the system of record. The new app is canonical.

## 10. Open Questions

1. Should "Passed" Pipeline Entries appear in any view, or are they archived from sight after a configurable window?
2. Who owns the `search@skyknightcapital.com` mailbox administratively, and what happens to bounces or replies sent *to* that address by candidates?
3. Confirm the 14-day duplicate-outreach window. Is this the right threshold, or should it be calibrated against historical data?
4. Should the Monday digest include closed Searches filled in the prior week as a "wins" section?

---

*This PRD intentionally omits technical architecture. See companion design document for stack, schema, and infrastructure decisions.*
