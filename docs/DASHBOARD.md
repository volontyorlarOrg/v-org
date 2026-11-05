# Dashboard

`/dashboard` is where an organization lands after signing in. It reads top to bottom in the order the work is done:

1. **Volunteer journey**: the organization's work as one line of five stations: published vacancies (now), applications received (all time), accepted volunteers (now), attendances (all time) and confirmed hours (all time), from `GET /org/statistics`. Every figure carries its scope. Under each station hangs what waits there, tagged with whose move it is: amber for the organization, blue for the administrator. Stations and waiting lines are links into the queue below or a filtered list. The line is blue up to Applications and orange from Accepted on, as in the administrator portal.
2. **Waiting on you**: what only the organization can move. Each row leads with how long it has waited, on one scale for the whole queue, oldest first within a section. The header's count is the sum of the section counts shown below it, and its line names the oldest wait.
3. **Recent activity**: the six most recent audit events from `GET /org/activity`, under the queue.
4. **With the administrator** and **Decided today**: the side column.

The page header's action is New vacancy. The rules are pure functions in `src/lib/queue/dashboard.ts`, tested beside them; `src/components/dashboard/desk.tsx` renders them. The journey, the queue and the side column fail independently: if the queue cannot load, the journey keeps its totals and draws no waiting lines, because it never claims "nothing waiting" when it does not know. An unverified organization sees a notice above the journey, since nothing can be approved until an administrator verifies it.

## Waiting on you

| Section                      | An entry is                                                                                                       | Action                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Returned for changes         | a vacancy an administrator returned, with the note and what sending again still needs                             | Edit · Send for approval                                        |
| Results returned for changes | a vacancy whose attendance sheet an administrator returned (`changes_requested`)                                  | Correct results (attendance)                                    |
| Applications to decide       | **one row per vacancy**: how many sent applications wait, how old the oldest is, how many are staged but not sent | Review applications                                             |
| Roll calls due               | a vacancy whose event ended with results not yet submitted (not one already returned above)                       | Take roll call, or Review and submit once every row is recorded |
| Drafts to send               | a draft, with what sending it for approval still needs                                                            | Edit · Send for approval                                        |

Send for approval is disabled until the vacancy has what the wizard requires, venue and places included, and the reason is the row's side line. `missingForApproval` in `src/lib/vacancies/approval.ts` is the one list of those rules.

A roll call counts a saved draft as recorded: a volunteer is "to record" only while nobody has entered an outcome. The call stays until the sheet is submitted.

## With the administrator

One row per item, longest wait first: a vacancy waiting for approval, a set of results waiting for verification (`attendanceSheet.status === "submitted"`), or a past event with participants still waiting (from the first 100 rosters of `GET /org/past-event-rosters`). The first six are shown and the rest are counted. Nothing here is counted in "Waiting on you". Rows leave when an administrator decides.

## Decided today

Decisions on the organization's work on the current Tashkent day, newest first: its own decisions on applications, and an administrator's on its vacancies (approved, returned, rejected) and results (verified). Vacancy and results decisions count whoever made them, because an organization never makes them itself. Each entry is a status chip in the decision's tone, the record and the time. An empty day says so in one line.

## Rail badges

Vacancies shows `changesRequested`, Applications `pendingReview` and Attendance `attendanceDue`, all from `GET /org/statistics` and all work the organization moves. `attendanceDue` counts accepted volunteers on ended events with no verified outcome, and leaves out sheets already submitted to an administrator.

## Activity

My activity and the dashboard's recent activity draw the same `AuditTimeline` as the administrator portal: events grouped by Tashkent day, the action, and the record it touched named from the organization's own vacancies, applications and past events. `GET /org/activity` takes no paging parameters, so My activity pages the list it receives. `AUDIT_ACTIONS` lists what an organization account can do; an action missing from the catalog would print its raw code, so add a label with any new backend action.
