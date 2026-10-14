# Cloudflare deployment and shared specimen database

The institute website and companion LIMS app are deployed together by a Cloudflare Worker and use the same Cloudflare D1 database for specimen records.

## Public-access warning

At the project owner's request, specimen API authentication and role checks have been removed. Anyone on the internet who knows the Worker URL can read specimens, create new specimens, and change specimen statuses. The staff portal, IT pages, and app are also public. Writes are recorded under a generic anonymous actor, so there is no reliable per-person audit attribution.

Use this only with fictional demonstration data. Do not store patient or participant information, credentials, confidential research information, or any personal data. Public traffic can also use Cloudflare request and database quotas, and may create unwanted records. To restore access control, re-enable server-side authentication and staff authorization before using non-fictional records.

## Current deployment

- Cloudflare Worker: `lumko-research-demo`
- Shared D1 database: `lumko-shared-records`
- Worker API: `GET`, `POST`, and `PATCH /api/specimens`
- Both sites use the same `/api/specimens` route, so specimens added in either interface appear in the other after refresh.
- API health response identifies the public state: `/api/health` returns `authenticationRequired: false` and `publicReadWrite: true`.

The `staff_users` table remains in D1 because the original schema created it and the audit tables reference it. Migration `0002_public_anonymous_actor.sql` adds a generic system row used to satisfy those foreign-key references. It is not an account and has no password or sign-in.

## Deploy changes

From the project root in a VS Code terminal:

```powershell
npm.cmd test
npm.cmd run deploy
```

The deployment builds the website and LIMS app into `dist/` and uploads both together. The D1 database is a separate resource and is not deleted by normal site deployments.

## Database migrations

Migration `0001_initial.sql` created the schema. Before deploying the unauthenticated API, apply the added anonymous audit actor migration remotely:

```powershell
npx.cmd wrangler d1 migrations apply lumko-shared-records --remote
```

Wrangler tracks migrations and applies only migrations not already recorded. Do not rerun migration SQL manually or modify an already-applied migration; use a new numbered migration for future schema changes.

## Local checks

```powershell
npm.cmd test
npm.cmd run build
```

Local development uses a separate local D1 database by default. It does not automatically contain the remote data.

## Cost and quotas

Cloudflare's published free quotas and provider terms may change. Public unauthenticated access increases the risk of exhausting Worker/D1 usage quotas. Check current Cloudflare usage and pricing before sharing the site widely.
