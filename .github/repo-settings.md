# GitHub Repository Settings

These settings are part of the contract. They enforce in GitHub what
`CLAUDE.md` enforces in process. Apply them to every new repo from this template.

GitHub does not load most of these from a file in the repo. Apply them via the
UI, the `gh` CLI, the REST API, or — ideally — the
[Probot Settings app](https://github.com/apps/settings) using
`.github/settings.yml` (provided alongside this doc).

If you change a setting, update this file in the same PR.

---

## General

| Setting | Value | Why |
|---|---|---|
| Default branch | `main` | Single trunk. |
| Wikis | Off | `docs/` is the wiki. |
| Issues | On | We file out-of-scope work as issues. |
| Projects | On | Optional, but useful. |
| Discussions | Off until needed | Avoid scattering decisions. |
| Allow forking | Off (private repos) | Reduces leak surface. |
| Sponsorships | Off | N/A for product repos. |

## Pull requests

| Setting | Value | Why |
|---|---|---|
| Allow merge commits | **Off** | `CLAUDE.md` §5 — squash only. |
| Allow squash merging | **On** | The only merge style. |
| Allow rebase merging | **Off** | Rewrites history; breaks the "born from main" invariant. |
| Default commit title for squash | "Pull request title" | PR title is the squash commit. |
| Default commit message for squash | "Pull request title and description" | Keeps context in history. |
| Always suggest updating PR branches | **On** | Surfaces drift before merge. |
| Allow auto-merge | **On** | Lets agents auto-merge once checks pass + reviews approve. |
| Automatically delete head branches | **On** | No stale branches. |

## Branch protection — `main`

Apply the following ruleset (Settings → Rules → Rulesets, or branch protection):

- **Require a pull request before merging**
  - Require approvals: **1** (raise to 2 once team > 5)
  - Dismiss stale approvals on new commits: **On**
  - Require review from Code Owners: **On**
  - Require approval of the most recent reviewable push: **On**
- **Require status checks to pass**
  - Require branches to be up to date before merging: **On**
  - Required checks (must match job names in `.github/workflows/ci.yml`):
    - `Lint`
    - `Types`
    - `Test`
    - `Build`
    - `Secret scan`
    - `Evals` *(once enabled — see CI workflow comment)*
    - `Analyze` *(CodeQL)*
- **Require conversation resolution before merging**: **On**
- **Require signed commits**: **On** (raise this bar early; it's painful to add later)
- **Require linear history**: **On** (squash-only enforces this; belt + suspenders)
- **Do not allow bypassing the above settings**: **On** — including admins
- **Restrict who can push to matching branches**: nobody
- **Restrict deletions**: **On**
- **Block force pushes**: **On**

## Actions

| Setting | Value | Why |
|---|---|---|
| Actions permissions | "Allow [org] actions and reusable workflows" + selected third-party | Least privilege. |
| Allowed third-party actions | Pinned to SHA in workflows | Supply-chain hygiene. |
| Workflow permissions (default `GITHUB_TOKEN`) | **Read repository contents and packages permissions** | Per-job scope where needed. |
| Allow GitHub Actions to create and approve PRs | **Off** | Humans approve. |
| Fork PR workflows | "Require approval for first-time contributors" | Stops drive-by token theft. |

## Secrets and security

- **Secret scanning**: On
- **Push protection** (blocks pushes that contain secrets): **On**
- **Dependabot alerts**: On
- **Dependabot security updates**: On
- **Code scanning** (CodeQL — see `.github/workflows/codeql.yml`): On
- **Private vulnerability reporting**: On (so `SECURITY.md` link works)

## Access

- **Default permission for org members**: Read (raise per-team via teams, not org-wide)
- **Outside collaborators**: avoid; prefer adding contractors to a scoped team
- **Two-factor authentication**: required at the org level (verify in org settings)

## Tags and releases

- **Tag protection rule**: protect `v*.*.*` patterns from deletion and force-update
- **Releases**: drafted by humans; generated notes are fine, edit before publish

---

## Applying these settings

### Option 1 — Probot Settings app (recommended)

Install the [Settings app](https://github.com/apps/settings) on the org. The
sibling file `.github/settings.yml` will be applied on every push to `main`.
Note: it covers most but not all of the above (rulesets and some security
settings still need the API or UI).

### Option 2 — `gh` CLI script

See `scripts/bootstrap-repo-settings.sh` for a script that applies the
settings above via the GitHub REST API. Run once per new repo.

### Option 3 — UI

Walk this document top-to-bottom in the repo's Settings tab. Last resort —
prone to drift.

---

## Audit

Quarterly: diff this file against the live settings. Any drift is either a
bug in the settings (update them) or a bug in this file (update the file).
Don't let them disagree silently.
