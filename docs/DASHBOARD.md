# Dashboard

`/dashboard` is where an organization lands after signing in. It was called
"Today"; it is now **Dashboard** in the rail, the title and all three
languages (`Boshqaruv paneli`, `Панель управления`). It reads top to bottom:

1. **Your work** — one ledger sheet of the organization's all-time totals from
   `GET /org/statistics`: live vacancies, applications received, volunteers
   accepted, attendances confirmed and confirmed hours.
2. **On your desk** — what only the organization can move, counted in the
   dateline ("5 things wait on you").
3. **With the administrator** — what the organization has sent and is waiting
   for an administrator to decide. Nothing here is counted as waiting on you.
4. **Recent activity** beside **Cleared today** — the organization's eight most
   recent audit events from `GET /org/activity`, and its own decisions of the
   Tashkent day, each with its seal.

The page header's action is New vacancy; the desk's is Attendance. The rules
are pure functions in `src/lib/queue/dashboard.ts` (shared with `v-admin`),
tested beside them; `src/components/dashboard/desk.tsx` renders them. Totals and
the desk fail independently and each renders its own `LoadFailure`.

## On your desk

| Section                      | An entry is                                                                                                       | Action                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Returned for changes         | a vacancy an administrator returned, with the note and what sending again still needs                             | Edit · Send for approval     |
| Results returned for changes | a vacancy whose attendance sheet an administrator returned (`changes_requested`)                                  | Correct results (attendance) |
| Drafts to send               | a draft, with what sending it for approval still needs                                                            | Edit · Send for approval     |
| Applications to decide       | **one row per vacancy**: how many sent applications wait, how old the oldest is, how many are staged but not sent | Review applications          |
| Roll calls due               | a vacancy whose event ended with accepted volunteers unrecorded (not one already returned above)                  | Take roll call               |

Applicants used to be listed one per row, each with the same "Review in
vacancy" button, so one popular vacancy filled the page. Decisions are staged
and sent together on the vacancy's applications desk, so the dashboard now
groups them by vacancy and links to that desk.

## With the administrator

Three counts, each a link: vacancies waiting for approval, sets of results
waiting for verification (`attendanceSheet.status === "submitted"`), and past
events with participants still waiting (from the first 100 rosters of
`GET /org/past-event-rosters`). They leave when an administrator decides.

## Activity

My activity and the dashboard's recent activity draw the same `AuditTimeline`
as the administrator portal: events grouped by Tashkent day, the action, and
the record it touched named from the organization's own vacancies, applications
and past events. `GET /org/activity` takes no paging parameters, so My activity
pages the list it receives.
