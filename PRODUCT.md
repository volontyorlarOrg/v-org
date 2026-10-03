# Volontyorlar organization portal

## Audience and ownership

One administrator-issued account represents one organization. Its login handle is the organization's stable slug. It has the `partner` role and a permanent password. The organization can sign in and sign out, but cannot change or recover its password in this portal. An administrator issues or replaces the password and can block or unblock the account in `v-admin`.

The account can see and act on vacancies it created under its own organization. The backend enforces both creator and organization ownership on every record operation. Organization identity is derived from the authenticated account, never trusted from a form field. Volunteers are visible only through applications to those vacancies. The portal cannot reset volunteer passwords.

## Work sequence

Create draft → edit details, image and XP rewards → submit for administrator approval → publish after approval → decide on applicants → send instructions → record attendance → submit results for administrator verification. Changes requested by the administrator return the draft for correction; rejection keeps it read-only. The account can archive its own vacancies.

The opportunity detail has Details, Applications and Attendance tabs.

- **Decisions** are staged per applicant (accept, reject, hold) and reach applicants only through "Review and send", which rechecks withdrawn applications and capacity first. Hold keeps an application pending.
- **Instructions** (a message and an optional Telegram group link) go to every accepted applicant through the bot and in-app, with per-person delivery status and an explicit retry that never duplicates a delivered message.
- **Attendance** is a draft until the organization submits it. Hours and XP count only after an administrator verifies it; the administrator can return it with flagged rows. Corrections to verified results go through the same verification and re-score only the rows that changed.
- **XP rewards** belong to each vacancy: XP per verified hour for volunteering, winner / contributor / attendee XP for competitions, and an unexcused no-show penalty. They can change until the vacancy is published.

The dashboard, opportunity list, application list, attendance, activity, and volunteer directory reflect this same scope.

## Privacy and language

Applicant data can include minors. Do not put personal data or tokens in URLs, logs, analytics, client storage, or public responses. Private pages are not indexable. Uzbek is the default language, with Russian and English translations.

## Out of scope for the first release

Organization self-registration, multiple organization users, self-service password change, adding volunteers to Telegram groups on their behalf, and access to other organizations' vacancies.
