# Volontyorlar organization portal

## Audience and ownership

One administrator-issued account represents one organization. Its login handle is the organization's stable slug. It has the `partner` role and a permanent password. The organization can sign in and sign out, but cannot change or recover its password in this portal. An administrator issues or replaces the password and can block or unblock the account in `v-admin`.

The account can see and act on vacancies it created under its own organization. The backend enforces both creator and organization ownership on every record operation. Organization identity is derived from the authenticated account, never trusted from a form field. Volunteers are visible only through applications to those vacancies. The portal cannot reset volunteer passwords.

## Work sequence

Create draft → edit details and image → submit for administrator approval → publish after approval → review applicants → record attendance and hours after the event. Changes requested by the administrator return the draft for correction; rejection keeps it read-only. The account can archive its own vacancies.

The dashboard, opportunity list, application list, attendance, activity, and volunteer directory reflect this same scope. The opportunity detail has Details, Applicants, and Attendance results sections. The results section records the existing attendance outcomes and confirmed hours; it is not a separate results-approval workflow.

## Privacy and language

Applicant data can include minors. Do not put personal data or tokens in URLs, logs, analytics, client storage, or public responses. Private pages are not indexable. Uzbek is the default language, with Russian and English translations.

## Out of scope for the first release

Results-sheet approval, XP tiers, winner or contributor awards, no-show penalties, Telegram invitations, organization self-registration, multiple organization users, self-service password change, and access to other organizations' vacancies.
