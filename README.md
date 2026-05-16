# SkyKnight Talent Network

Single source of truth for SkyKnight Capital's executive search pipeline—automatically generates the Monday staffing digest and enforces comp confidentiality between Partners and Associates.

## Quick start

Stack and commands TBD pending architecture design document. See [`CLAUDE.md` §1](./CLAUDE.md#1-project-context).

```bash
# install
[pending]

# run
[pending]

# test
[pending]
```

## Working in this repo

This repo is built for human + AI collaboration. The operating model is documented in [`CLAUDE.md`](./CLAUDE.md). Read it before contributing — humans included.

- **Product requirements** live in [`PRD.md`](./PRD.md).
- **Specs** live in [`docs/specs/`](./docs/specs/). Features start there, not in code.
- **Architectural decisions** live in [`docs/decisions/`](./docs/decisions/) as ADRs.
- **PR protocol** is in `CLAUDE.md` §5. Squash-merge to main only.
- **Repository GitHub settings** are documented in [`.github/repo-settings.md`](./.github/repo-settings.md).

## Stack

TBD — see companion architecture design document referenced in [`PRD.md` §10](./PRD.md#10-open-questions).

## Database

Schema lives in [`src/lib/db/schema.ts`](./src/lib/db/schema.ts); migrations in [`db/migrations/`](./db/migrations/).

```bash
pnpm db:generate   # diff schema → new migration sql
pnpm db:migrate    # apply pending migrations
pnpm db:rollback   # apply the latest .down.sql sibling
pnpm db:seed       # populate dev data (idempotent)
```

Requires `DATABASE_URL` in the environment. The `pg_trgm` extension is created by the initial migration.

## License

Copyright (c) 2026 Zhengyuan Wu. All Rights Reserved.

This product is protected by copyright and distributed under licenses restricting copying, distribution, and decompilation. See [`LICENSE`](./LICENSE) for full terms.
