# How information moves between this portal and the administrator portal

`v-org` and `v-admin` never talk to each other. Each reads and writes
`v-backend`, which holds every record, enforces every rule and writes the audit
log. What one portal does becomes visible in the other on its next read.
Section names in bold are the dashboards' sections: **Waiting on you** and
**With the administrator** here, **Waiting on you** and **Waiting on
organizers** in `v-admin`. This
page follows each record across that boundary.

```text
 v-org (partner)             v-backend                      v-admin (admin)
 ───────────────             ─────────                      ───────────────
 create / edit draft  ──▶  /org/opportunities        ──▶  Vacancies, Dashboard
 send for approval    ──▶  approvalStatus=pending    ──▶  Waiting on you: approve
 sees note / publish  ◀──  approve | request-changes ◀──  Approve / Return / Reject
                           | reject  (+ note)
 stage + send         ──▶  /org/…/decisions[/send]   ──▶  Waiting on organizers
 decisions                 → volunteers notified (v-app)
 send instructions    ──▶  /org/…/instructions       ──▶  vacancy Applications tab
 record + submit      ──▶  attendance sheet          ──▶  Waiting on you: results
 attendance                status=submitted                to verify
 sees flagged rows    ◀──  request-changes (+ rows)  ◀──  Return with flagged rows
 sees verified        ◀──  verify → hours and XP     ◀──  Verify
 create past event    ──▶  /org/past-event-rosters   ──▶  Waiting on you: past events
 sees each decision   ◀──  approve / reject per      ◀──  Approve all, one by one,
                           participant                     adjust or reject
 propose correction   ──▶  /org/past-events/{id}     ──▶  Past events → corrections
 or removal                [/removal]
 signs in with slug   ◀──  /auth/org/login           ◀──  Organizations: create the
                           (partner account)               account, replace password,
                                                           block / unblock
 own activity         ◀──  /org/activity    audit    ──▶  /admin/audit, Recent activity
```

## The vacancy

An organization's draft is an ordinary vacancy whose `createdById` is the
organization account and whose `organizationId` comes from that account, never
from a form. Sending it sets `approvalStatus` to `pending_review`, and it
appears under **Vacancies to approve**. Approval needs a verified organization
(the administrator verifies it under **Organizations holding vacancies back**), a future
deadline before the start and the required fields; the row says what is
missing. Approval publishes; a return or rejection carries a note the
organization reads on its own dashboard as **Returned for changes**.

## Applications and instructions

Volunteers apply in `v-app`. Applications to an organization's vacancy are the
organization's to decide: it stages accept, reject or hold and sends them
together, which is when volunteers hear. `v-admin` shows those vacancies under
**Waiting on organizers** with the size and age of the backlog, and can open the
same applications desk if one stalls. Instructions — a message and an optional
Telegram group link — go to accepted volunteers from the organization's desk.

## Attendance and results

After the event ends the organization records attendance as a draft and submits
it. A submitted sheet is **Results to verify** in `v-admin`. Verifying it is the moment
hours and XP reach the volunteers; returning it flags rows with notes, which the
organization corrects and resubmits. Corrections to verified results take the
same route and re-score only the rows that changed.

## Past events

An organization records a past event with its participants by exact username.
It arrives in `v-admin` as one event under **Past events to review**; the administrator
approves everyone at once or one by one, adjusting or rejecting anyone, and only
then does the event reach each volunteer's history in `v-app`. Corrections and
removals of one volunteer's recorded past event are proposals that change
nothing until an administrator approves them.

## Accounts

There is no self-registration. An administrator creates the organization and
issues its single `partner` account with a permanent password, can replace that
password and block or unblock the account. The organization cannot change or
recover its password.

## The audit trail

Every write above is recorded by `v-backend` with its actor. This portal reads
the organization's own actions from `GET /org/activity` (My activity and the
dashboard's recent activity); `v-admin` reads everyone's from
`GET /admin/audit` and names the organization's account after the
organization.

The standalone applications list is not available. Review applications on each
vacancy; individual application records remain available from related records.
