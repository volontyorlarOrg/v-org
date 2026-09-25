# Release sequence

1. Merge and deploy `v-backend` with the OrganizationAccount migration and org routes. Check the target database branch and run Prisma migrations through unpooled `DIRECT_URL` only after production database approval.
2. Deploy `v-admin` with the Organizations account controls. Issue a password through the admin UI; convey it privately. The password is never returned by the API or stored in portal logs.
3. Deploy `v-org` at `org.volontyorlar.uz` with `VOLONTYORLAR_API_URL`, `VOLONTYORLAR_ORG_SESSION_SECRET`, and `NEXT_PUBLIC_PORTAL_URL`. Use a distinct secret and cookie from staff/admin.
4. Verify login, organization-only draft creation, admin approval, applicant decisions, attendance, block and password replacement session revocation, all three locales, mobile, and private/noindex headers against an isolated development account before production issuance.

A GitHub push alone does not deploy or migrate any service. Record provider revisions and live checks separately.
