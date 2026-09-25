# Volontyorlar Organization Portal

The private portal for organizations that publish volunteering opportunities on Volontyorlar. An administrator creates one account for an organization and gives it its organization handle and permanent password. The organization cannot change that password; an administrator can replace it or block the account.

This repository owns the UI at `org.volontyorlar.uz`. `v-backend` owns authentication, permissions, approval, and records; `v-admin` owns account issuance and vacancy approval. The screenshots supplied for this project are approximate screen direction. This portal uses the component system and visual language of `v-staff` and `v-admin`.

## Workflow

1. Sign in with the organization slug and admin-issued password.
2. Create a vacancy assigned to this organization. It starts as a draft.
3. Submit it for administrator review. It becomes public only after approval in `v-admin`.
4. Review applicants to vacancies created by this account.
5. After an event ends, record attendance and confirmed hours for accepted volunteers.

The first release uses the current application and attendance behavior. It does not add results-sheet approval, XP tiers, or Telegram invitation flows shown in the approximate references.

## Local development

Run `npm ci` and `npm run dev`. The server binds to `127.0.0.1:3004` and loads the ignored `../env/local/org.local.env`. It needs `VOLONTYORLAR_API_URL` and a 32-character or longer `VOLONTYORLAR_ORG_SESSION_SECRET`. Use a real local `v-backend` instance; runtime fixtures are not used.

`npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` check the portal. `npm run api:types` regenerates the checked-in contract types from the sibling backend's OpenAPI output after that backend is updated.

## Security boundary

All portal reads and writes go through server-side API calls. Tokens stay in an encrypted, HttpOnly cookie. The backend checks account status and scopes vacancies, applications, attendance, volunteers, counts, and activity to the account. Replacing a password or blocking an account revokes existing sessions.

See [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and [docs/RELEASE.md](docs/RELEASE.md).
