import { describe, expect, it } from "vitest";

import {
  applicationSchema,
  organizationSchema,
  vacancySchema,
  type Application,
  type Vacancy,
} from "@/lib/api/schemas";
import { isSameTashkentDay, tashkentDay } from "@/lib/datetime";
import {
  applicationsByVacancy,
  applicationsToDecide,
  clearedToday,
  deskOf,
  resultsReturned,
  rollCallsDue,
  withAdministrator,
} from "@/lib/queue/dashboard";

const NOW = new Date("2026-09-24T09:00:00.000Z");
const ME = "organization-account";

const verified = organizationSchema.parse({
  id: "org-1",
  name: "Reading Corners",
  verified: true,
});
function vacancy(overrides: Record<string, unknown> = {}): Vacancy {
  return vacancySchema.parse({
    id: "vacancy-1",
    slug: "library-day",
    title: "Library day",
    kind: "volunteering",
    description: "Help at the library.",
    region: "tashkent-city",
    format: "onsite",
    status: "open",
    startsAt: "2026-10-10T05:00:00.000Z",
    applicationDeadline: "2026-10-05T05:00:00.000Z",
    createdAt: "2026-09-01T05:00:00.000Z",
    updatedAt: "2026-09-02T05:00:00.000Z",
    organizationId: "org-1",
    approvalStatus: "draft",
    ...overrides,
  });
}

function application(overrides: Record<string, unknown> = {}): Application {
  return applicationSchema.parse({
    id: "application-1",
    status: "submitted",
    submittedAt: "2026-09-20T05:00:00.000Z",
    createdAt: "2026-09-19T05:00:00.000Z",
    updatedAt: "2026-09-20T05:00:00.000Z",
    volunteerId: "volunteer-1",
    opportunityId: "vacancy-1",
    ...overrides,
  });
}

describe("the Tashkent day", () => {
  it("rolls over at Tashkent midnight, not UTC midnight", () => {
    expect(tashkentDay(new Date("2026-09-23T19:30:00.000Z"))).toBe("2026-09-24");
    expect(tashkentDay(new Date("2026-09-23T18:30:00.000Z"))).toBe("2026-09-23");
  });

  it("matches only the same local day", () => {
    expect(isSameTashkentDay("2026-09-24T02:00:00.000Z", NOW)).toBe(true);
    expect(isSameTashkentDay("2026-09-22T12:00:00.000Z", NOW)).toBe(false);
    expect(isSameTashkentDay(undefined, NOW)).toBe(false);
  });
});

describe("applications waiting for a decision", () => {
  it("leaves out decided applications and those on archived vacancies", () => {
    const rows = applicationsToDecide(
      [
        application({ id: "new", submittedAt: "2026-09-22T05:00:00.000Z" }),
        application({
          id: "old",
          status: "under_review",
          submittedAt: "2026-09-18T05:00:00.000Z",
        }),
        application({ id: "done", status: "accepted" }),
        application({ id: "archived", opportunityId: "vacancy-2" }),
      ],
      [vacancy(), vacancy({ id: "vacancy-2", archivedAt: "2026-09-21T00:00:00.000Z" })],
    );

    expect(rows.map((row) => row.application.id)).toEqual(["old", "new"]);
  });
});

describe("roll calls", () => {
  const ended = vacancy({
    id: "ended",
    startsAt: "2026-09-20T05:00:00.000Z",
    endsAt: "2026-09-20T09:00:00.000Z",
    applicationDeadline: "2026-09-18T05:00:00.000Z",
  });
  const row = (
    id: string,
    attendance: Record<string, unknown>,
    opportunityId = "ended",
  ) =>
    application({
      id,
      status: "accepted",
      opportunityId,
      attendance: { id: `att-${id}`, ...attendance },
    });

  it("opens a roll call only once the event has ended and someone is still unrecorded", () => {
    const upcoming = vacancy({ id: "upcoming" });
    const calls = rollCallsDue(
      [
        row("1", { outcome: "awaiting_confirmation" }),
        row("2", { outcome: "attended", confirmedHours: 4 }),
        row("3", { outcome: "awaiting_confirmation" }, "upcoming"),
      ],
      [ended, upcoming],
      NOW,
    );

    expect(calls).toEqual([
      expect.objectContaining({
        vacancyId: "ended",
        awaiting: 1,
        drafted: 0,
        resolved: 1,
      }),
    ]);
  });

  it("counts a saved draft as recorded, and keeps the call until it is submitted", () => {
    expect(
      rollCallsDue(
        [row("1", { outcome: "awaiting_confirmation", draftOutcome: "attended" })],
        [ended],
        NOW,
      ),
    ).toEqual([expect.objectContaining({ awaiting: 0, drafted: 1, resolved: 0 })]);
  });

  it("leaves the call once the results are with an administrator", () => {
    expect(
      rollCallsDue(
        [row("1", { outcome: "awaiting_confirmation", draftOutcome: "attended" })],
        [{ ...ended, attendanceSheet: { status: "submitted", correction: false } }],
        NOW,
      ),
    ).toEqual([]);
  });
});

describe("what was decided today", () => {
  const today = "2026-09-24T06:00:00.000Z";

  it("counts an administrator's decisions on the organization's vacancies and results", () => {
    const cleared = clearedToday({
      me: ME,
      now: NOW,
      vacancies: [
        vacancy({
          id: "approved",
          approvalStatus: "approved",
          approvalReviewedById: "an-administrator",
          approvalReviewedAt: today,
        }),
        vacancy({
          id: "yesterday",
          approvalStatus: "rejected",
          approvalReviewedById: "an-administrator",
          approvalReviewedAt: "2026-09-22T06:00:00.000Z",
        }),
        vacancy({
          id: "verified",
          attendanceSheet: {
            status: "verified",
            verifiedAt: "2026-09-24T07:00:00.000Z",
          },
        }),
      ],
      applications: [],
    });

    expect(cleared.map((item) => item.kind)).toEqual(["results", "vacancy"]);
  });

  it("counts only its own final decisions on applications", () => {
    const cleared = clearedToday({
      me: ME,
      now: NOW,
      vacancies: [],
      applications: [
        application({
          id: "accepted",
          status: "accepted",
          reviewedById: ME,
          reviewedAt: "2026-09-24T07:00:00.000Z",
        }),
        application({
          id: "looking",
          status: "under_review",
          reviewedById: ME,
          reviewedAt: "2026-09-24T07:30:00.000Z",
        }),
        application({
          id: "someone-else",
          status: "rejected",
          reviewedById: "an-administrator",
          reviewedAt: "2026-09-24T07:30:00.000Z",
        }),
      ],
    });

    expect(cleared).toEqual([expect.objectContaining({ kind: "application" })]);
  });
});

describe("the organization's desk", () => {
  it("separates returned vacancies from drafts, longest wait first", () => {
    const desk = deskOf(
      [
        vacancy({
          id: "returned",
          approvalStatus: "changes_requested",
          approvalReviewedAt: "2026-09-22T05:00:00.000Z",
        }),
        vacancy({ id: "newer", updatedAt: "2026-09-23T05:00:00.000Z" }),
        vacancy({ id: "older", updatedAt: "2026-09-21T05:00:00.000Z" }),
        vacancy({ id: "sent", approvalStatus: "pending_review" }),
      ],
      [verified],
      NOW,
    );

    expect(desk.returned.map((entry) => entry.vacancy.id)).toEqual(["returned"]);
    expect(desk.drafts.map((entry) => entry.vacancy.id)).toEqual(["older", "newer"]);
  });

  it("says what sending still needs, so the row explains a disabled button", () => {
    const desk = deskOf([vacancy()], [verified], NOW);
    expect(desk.drafts[0]?.missing).toEqual(["location", "capacity"]);
  });
});

describe("applications grouped by vacancy", () => {
  const library = vacancy({ id: "vacancy-1", approvalStatus: "approved" });
  const park = vacancy({
    id: "vacancy-2",
    title: "Park day",
    approvalStatus: "approved",
  });

  it("counts what waits per vacancy and puts the longest wait first", () => {
    const groups = applicationsByVacancy(
      applicationsToDecide(
        [
          application({ id: "a1", submittedAt: "2026-09-20T05:00:00.000Z" }),
          application({
            id: "a2",
            status: "under_review",
            stagedDecision: "accept",
            submittedAt: "2026-09-18T05:00:00.000Z",
          }),
          application({
            id: "a3",
            opportunityId: "vacancy-2",
            submittedAt: "2026-09-19T05:00:00.000Z",
          }),
        ],
        [library, park],
      ),
    );

    expect(
      groups.map((group) => [
        group.vacancyId,
        group.title,
        group.waiting,
        group.underReview,
        group.staged,
        group.oldestAt,
      ]),
    ).toEqual([
      ["vacancy-1", "Library day", 2, 1, 1, "2026-09-18T05:00:00.000Z"],
      ["vacancy-2", "Park day", 1, 0, 0, "2026-09-19T05:00:00.000Z"],
    ]);
  });
});

describe("results an administrator returned", () => {
  it("lists returned sheets oldest first and ignores archived vacancies", () => {
    const sheet = (status: string) => ({ attendanceSheet: { status } });
    const returned = resultsReturned([
      vacancy({
        id: "v1",
        updatedAt: "2026-09-22T05:00:00.000Z",
        ...sheet("changes_requested"),
      }),
      vacancy({
        id: "v2",
        updatedAt: "2026-09-21T05:00:00.000Z",
        ...sheet("changes_requested"),
      }),
      vacancy({ id: "v3", ...sheet("submitted") }),
      vacancy({
        id: "v4",
        archivedAt: "2026-09-23T05:00:00.000Z",
        ...sheet("changes_requested"),
      }),
    ]);
    expect(returned.map((item) => item.vacancy.id)).toEqual(["v2", "v1"]);
  });
});

describe("what is with the administrator", () => {
  it("lists vacancies in review, submitted results and waiting past events, oldest first", () => {
    const items = withAdministrator(
      [
        vacancy({
          id: "v1",
          approvalStatus: "pending_review",
          approvalSubmittedAt: "2026-09-22T05:00:00.000Z",
        }),
        vacancy({
          id: "v2",
          approvalStatus: "approved",
          attendanceSheet: {
            status: "submitted",
            submittedAt: "2026-09-20T05:00:00.000Z",
          },
        }),
        vacancy({
          id: "v3",
          approvalStatus: "approved",
          attendanceSheet: { status: "verified" },
        }),
      ],
      [
        {
          id: "e1",
          title: "Waiting",
          pending: 2,
          createdAt: "2026-09-21T05:00:00.000Z",
        },
        {
          id: "e2",
          title: "Decided",
          pending: 0,
          createdAt: "2026-09-01T05:00:00.000Z",
        },
      ],
    );

    expect(items.map((item) => [item.kind, item.id])).toEqual([
      ["results", "v2"],
      ["pastEvent", "e1"],
      ["vacancy", "v1"],
    ]);
  });
});
