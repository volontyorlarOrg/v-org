# Release sequence

1. Merge and deploy `v-backend` with the OrganizationAccount migration and org routes. Check the target database branch and run Prisma migrations through unpooled `DIRECT_URL` only after production database approval.
2. Deploy `v-admin` with the Organizations account controls. Issue a password through the admin UI; convey it privately. The password is never returned by the API or stored in portal logs.
3. Deploy `v-org` at `org.volontyorlar.uz` with `VOLONTYORLAR_API_URL`, `VOLONTYORLAR_ORG_SESSION_SECRET`, and `NEXT_PUBLIC_PORTAL_URL`. Use a distinct secret and cookie from staff/admin.
4. Verify login, organization-only draft creation, admin approval, applicant decisions, attendance, block and password replacement session revocation, all three locales, mobile, and private/noindex headers against an isolated development account before production issuance.

A GitHub push alone does not deploy or migrate any service. Record provider revisions and live checks separately.

## Dependency checks

CI runs `npm run security:audit` during verification and in a separate pull-request
job. Both audit the complete lockfile without requiring GitHub Advanced Security.
`npm audit --omit=dev --audit-level=high` checks the production dependency tree
separately. Next.js and its ESLint configuration are pinned together at 16.3.8;
the unused shadcn generator is removed, while checked-in UI components remain.

The audit follows the volunteer application's temporary exception for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), which has
no patched `braces` release. Until 2026-11-07 UTC, only that advisory and its
development-only ESLint chain (`braces`, `micromatch`, `fast-glob`,
`@next/eslint-plugin-next`, `eslint-config-next`) are accepted. Lint patterns are
local project configuration, not user input. A runtime occurrence, another high
or critical advisory, an audit failure, or expiry fails CI. Upgrade the lint chain
when a compatible fix is released; do not extend the exception automatically.
