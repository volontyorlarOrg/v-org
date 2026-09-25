# Organization portal guide

This repository is `v-org`, the private organization portal. Read `PRODUCT.md` for scope and `DESIGN.md` for the shared UI language before changing behavior or screens.

- `src/lib/portal.ts` declares the `partner` role, org cookie, org session secret, and `/auth/org/login`.
- `src/lib/api/endpoints.ts` is the endpoint registry. Keep it aligned with `v-backend` OpenAPI and regenerate `src/lib/api/generated/schema.d.ts` when contracts change.
- Server reads and writes go through `src/lib/api/gateway.server.ts`. Parse responses through Zod schemas and render failures explicitly. Never use runtime fixture data.
- The backend is the authorization boundary. Every org endpoint must check the active account and scope both creator ID and organization ID. The UI must never claim a successful publication before admin approval.
- Never add organization password change, volunteer password reset, self-registration, results approval, XP tiers, or Telegram invitations without an explicit product decision and matching backend contract.
- Use the semantic tokens and existing components inherited from `v-staff` and `v-admin`. Keep Uzbek, Russian, and English keys in parity, accessible controls, mobile layouts, dark mode, and reduced motion.
- Keep secrets out of Git. Local development binds to loopback. Changes to production accounts or database require separate explicit approval.
