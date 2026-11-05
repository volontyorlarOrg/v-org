---
name: Volontyorlar organization portal
description: The organization's side of the volunteer journey — one line of five stations, the work waiting at each, and whose move it is.
colors:
  institution-blue: "#007fc2"
  institution-ink: "#005e92"
  institution-deep: "#004a73"
  institution-mist: "#cfe5f5"
  action: "#005e92"
  action-hover: "#004a73"
  earned-orange: "#e85d30"
  earned-ink: "#b84a1e"
  earned-mist: "#fdebe3"
  warning: "#b87700"
  warning-ink: "#8a5a00"
  warning-mist: "#fdf3dc"
  success: "#16834a"
  success-ink: "#116b3c"
  success-mist: "#e3f4ea"
  danger: "#a3213f"
  danger-ink: "#8c1c36"
  danger-mist: "#fbe9ec"
  shell: "#eef2f6"
  shell-raised: "#e2e8ef"
  shell-line: "#d8dfe7"
  shell-muted: "#4f5b6a"
  paper: "#f5f7fa"
  surface: "#ffffff"
  surface-sunk: "#f0f3f7"
  surface-soft: "#e8f2fa"
  ink: "#0f1b2a"
  ink-muted: "#5f6b7a"
  ink-faint: "#8a95a1"
  border: "#dfe4ea"
  border-strong: "#c9d1da"
  border-control: "#8a95a1"
  knockout: "#ffffff"
typography:
  page:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  page-compact:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  station:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  section:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  2xl: "12px"
  full: "9999px"
spacing:
  row-x: "16px"
  row-y: "12px"
  section-gap: "24px"
  page-x-phone: "16px"
  page-x-desk: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.knockout}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
  button-row:
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.knockout}"
    rounded: "{rounded.md}"
  chip-waiting:
    backgroundColor: "{colors.warning-mist}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.sm}"
    height: "20px"
  chip-live:
    backgroundColor: "{colors.success-mist}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.sm}"
    height: "20px"
  chip-refused:
    backgroundColor: "{colors.danger-mist}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.sm}"
    height: "20px"
  chip-earned:
    backgroundColor: "{colors.earned-mist}"
    textColor: "{colors.earned-ink}"
    rounded: "{rounded.sm}"
    height: "20px"
  chip-with-organizer:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.institution-ink}"
    rounded: "{rounded.sm}"
    height: "20px"
  count:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    height: "20px"
  count-waiting:
    backgroundColor: "{colors.warning-mist}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.sm}"
  filter-tab-active:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "32px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
  nav-item:
    textColor: "{colors.shell-muted}"
    rounded: "{rounded.md}"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  station-marker:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
    size: "18px"
---

# Design System: Volontyorlar organization portal

This portal follows the administrator portal's system, "The Line". Tokens, primitives, the shell, status chips, queue rows, registers and the journey are the same components and should stay so: a change that belongs to both belongs in the shared shape, applied to both. `v-admin/DESIGN.md` is the fuller statement of the shared rules; this file records what is specific to an organization.

## Overview

**Creative North Star: "The Line"**

A vacancy travels from an organization's draft to a volunteer's confirmed hours through five checkpoints: **Published vacancies, Applications received, Accepted volunteers, Attendances, Confirmed hours**, in the institution's blue up to the applications and the volunteer's orange from acceptance on. Under each station hangs what waits there and whose move it is: **you** (amber) or **the administrator** (blue), because an organization can only ever hand work to an administrator and wait.

Everything else is a quiet working product. A light shell, white sheets on a cool paper ground, one sans for every word and figure, and colour that only ever means something: a brand role or a state. The line is the one signature; it is never repeated as ornament.

The brief is interpretability. Every number says what it counts and how it compares when a comparison exists; waiting is measured in time; a zero is drawn as a zero.

**Key Characteristics:**

- A light rail in three labelled groups: Overview (Dashboard), Volunteering (Vacancies, Applications, Attendance, Past events) and People (Applicants, Participants). Only work the organization moves carries a badge.
- The journey opens the dashboard; on a phone it runs vertically.
- Queues lead with how long each item has waited, on one scale per queue. A header's count is the sum of the section counts below it.
- Only buttons fill. Status is a tinted chip with an icon, a filter is a soft selection, a count is a small tag.

## Colors

Two brand colours with one job each and a state palette that only means a state, on cool neutrals.

- **Institution Blue** (`institution-blue`): the logo, the line's first two stations.
- **Institution Ink** (`institution-ink`): blue that is read: links, the focus ring, the active rail icon, "with the administrator" lines.
- **Action** (`action`, hover `action-hover`): the fill of a primary button, and nothing else.
- **Earned Orange** (`earned-orange`, text `earned-ink`): what a volunteer earned: the line from Accepted on, accepted applications, attendances, confirmed hours, XP.
- **Amber** (`warning`): waits on a decision: waiting for approval, roll calls due, a rail badge, what a draft still needs.
- **Blue** (`institution-ink` on `surface-soft`): returned for changes, or sitting with the administrator.
- **Green** (`success`): live: approved and published, ready to send.
- **Red** (`danger`): refused or destructive: rejected, no-show, an invalid field.
- **Gray** (`surface-sunk`, `ink-muted`): draft, archived, withdrawn, excused.

The dark theme is selected, not inverted: paper `#0d131c`, sheet `#151c27`, sunk `#111823`, raised `#1c2533`.

**The One Job Rule.** Blue is the institution and orange is the person; the line changes colour exactly where a volunteer starts to earn.

**The Only Buttons Fill Rule.** The solid action colour is reserved for primary buttons. A selected filter, an active tab, a status or a count never wears it.

**The State Means State Rule.** Amber, green and red only ever say a state and always come with an icon or words.

Use semantic tokens, never a literal hex.

## Typography

**One family:** Onest (with ui-sans-serif, system-ui) for every title, label, figure and control. There is no serif in this portal.

- **Page** (600, 1.5rem from the small breakpoint, 1.375rem below): the one `h1`.
- **Station** (600, 1.75rem, proportional figures): the journey's figures.
- **Figure** (600, 1.5rem, proportional figures): record figures.
- **Section** (600, 0.9375rem): the `h2`/`h3` of a sheet.
- **Body** (400, 0.875rem) and **Meta** (400, 0.8125rem): rows and their secondary lines.
- **Label** (600, 0.75rem, sentence case): column heads and list labels, never tracked capitals.

Columns of numbers, times and ages use tabular figures; standalone figures use proportional ones.

## Layout

A light rail of 15rem from the large breakpoint, with the brand at the top, the groups, and My activity, Sign out, language and theme at its foot. Below it the rail becomes a drawer behind a menu button in a white header. The content column is capped at 84rem, with 24px between blocks.

A screen is a page header (back link, title, meta, description; actions on the right), then sheets. The dashboard is the journey across the full width; then the queue with recent activity under it, beside a 23rem side column of what is with the administrator and what was decided today. Records put what needs doing above the tabs and details in a main column with rewards and approval in an aside. Tables scroll inside their own frame; the vacancy list folds into single rows on a phone.

Filters are a GET form and pagination is links, so both work without JavaScript and can be shared.

## Elevation, shapes and motion

Depth is tonal: a sheet is one step lighter than the paper with a hairline, and carries no shadow. Only what is truly above the page (dialogs, menus, the phone drawer, the sticky decision bar) takes the raised shadow. No glass, no blur, no glow, no decoration behind the screens.

Sheets 10px, dialogs 10 to 12px, buttons, fields, filter tabs and rail items 6px, chips and counts 4px. Circles are kept for avatars, status dots and the journey's markers. A form step fades in over 180ms; reduced motion turns it off.

## Components

### Buttons

Row 32px, small 36px, medium 40px, icon 36px. **Primary** fills with `action`; on a list row it is used only when the organization holds the next move, and otherwise the same action is **Outline**, so the rows that need attention stand out. **Danger outline** triggers a destructive action; **Danger** confirms it.

### Status chips

20px, 4px corners, tinted background, icon and sentence-case label. Vacancies speak one vocabulary, the stage, on the list and on the record: Draft, Waiting for approval, Changes requested, Published, Ended, Results returned, Results in review, Results verified, Rejected, Archived.

### The vacancy register

A register with a filter tab per stage that has any vacancies (and Saved), a search, and a table: photo, title and kind; stage; applications with a "to decide" tag; when applications close; when it starts; then the next step, the bookmark and a menu. The menu offers only what applies: no Edit once the event has started, no Applications or Attendance before a vacancy has been public.

### Steps

Both wizards (a vacancy, a past event) use `src/components/forms/steps.tsx`: the current step is a soft selection like a filter tab, finished steps carry a check, nothing fills. It is not a second journey line.

### Queue rows

A row leads with its age (`AgeLead`: "3d" and a 4px bar on the queue's shared scale), then the record and its meta, then the side facts, then the decision. Applicants are the one group decided together, so the queue shows one row per vacancy.

### Inline Decision

A row's decisions are row buttons; one that needs a confirmation replaces them with the question and a single confirm. Success is a toast that survives revalidation and the row leaves the queue; a failure stays inline in red. Focus returns to the trigger on cancel.

### Staged decisions and sheets

Applicants are staged in the row (an amber "Not sent" dot) and leave only through the floating "Review and send" bar. The Attendance tab is a draft until it is submitted; flagged rows carry the administrator's note in danger tint, and XP previews are in earned ink.

### Audit Timeline

My activity and the dashboard's recent activity are a timeline inside a sheet: a sunk heading per Tashkent day with its count, then rows of time, a family icon on a soft 6px tile, the action in semibold and the named record beneath it as a link.

## Do's and Don'ts

### Do:

- **Do** give every figure its scope (now, all time).
- **Do** lead a queue with how long its items have waited, oldest first.
- **Do** say why a control is disabled, in words, next to it.
- **Do** warn before an action takes a live vacancy off the volunteer app, in the wizard and on its save button.
- **Do** open long forms as their own page, with a sticky footer holding the actions.
- **Do** keep modals for what needs protected focus: archiving a vacancy, sending decisions, submitting results.
- **Do** ship every list with loading, empty, no-matches, denied, failed and awaiting-contract states, and every write with pending, error and success.
- **Do** keep one `h1` per page, label every control, and honour reduced motion globally.
- **Do** write every string in Uzbek, Russian and English.

### Don't:

- **Don't** fill anything with the action colour that is not a primary button.
- **Don't** use orange for anything a volunteer did not earn, or amber, green or red as decoration.
- **Don't** promise XP the backend will not pay; show the vacancy's own rules.
- **Don't** add decoration behind the screens, rotated stamps, a serif title, or an eyebrow above a heading.
- **Don't** use glass, blur, glows or hard offset shadows.
