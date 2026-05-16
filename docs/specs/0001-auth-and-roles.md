# Auth and roles

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

The MVP needs a way for the Deal Team to act as either a Partner or an Associate so the comp-confidentiality boundary can be exercised end-to-end. Real Microsoft Entra SSO integration carries tenant-config and group-claim risk that is out of scope for the 4-week build. The Deal Team can validate every UI and policy surface against a simulated identity so long as the role on the session is unambiguous.

## Goals

- Anyone hitting the app sees a profile selector before any data view loads.
- Selecting a profile creates a session that carries one of two roles: `partner` or `associate`.
- A "switch profile" affordance returns the user to the selector at any time.
- The simulated identity is the *only* source of `role` on the request — there is no other path to gain Partner privileges.

## Non-goals

- Real SSO (Entra, Okta, Google) — deferred post-MVP.
- Password or magic-link auth.
- Per-user permissions beyond the two roles.
- Profile management (create/edit/delete profiles from the UI). Profiles ship in seed data only.
- Anti-tampering hardening beyond a signed session cookie. This is explicitly a simulation.

## Users / actors

- Anyone browsing the app on the corporate network or beta deploy URL. No prior account required.

## Acceptance criteria

- [ ] The root route (`/`) renders a Netflix-style profile picker with all seeded profiles, each showing an anime-style avatar, display name, and role label.
- [ ] Clicking a profile sets a signed session cookie identifying that profile and redirects to the post-login landing page.
- [ ] An authenticated request to `/whoami` returns `{ name, role }` for the active profile.
- [ ] A "switch profile" control clears the session and returns to `/`.
- [ ] Requests without a valid session cookie to any non-public route redirect to `/`.
- [ ] Seed data ships at least 3 Partner profiles and 3 Associate profiles.

## Approach

- Session state is a signed cookie (HMAC) keyed to a `profile_id`. Profiles live in the `users` (or equivalent) table from the schema migration.
- A request middleware loads the profile, exposes `{ user, role }` to handlers, and short-circuits unauthenticated requests.
- The picker page is a static-ish server-rendered grid; avatar art is committed to the repo under a known path.

## Out of scope

- Linking simulated profiles to real email identities for Monday digest delivery — addressed in spec 0008.
- Audit logging of profile switches.

## Open questions

- *(none — all resolved during plan review)*

## Risks

- A reader could mistake simulated auth for production auth. Mitigation: a persistent "Simulated identity — not production auth" banner on every page, and a note in `CLAUDE.md` §6.
- The comp-access boundary (spec 0005) must hold even if a user forges a session cookie. Mitigation: role is always re-derived from the profile row server-side per request, never read from the cookie payload itself.

## References

- PRD §4 (Users & Roles)
- `docs/decisions/0001-operating-model.md`
