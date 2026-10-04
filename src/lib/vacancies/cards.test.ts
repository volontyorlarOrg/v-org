import { describe, expect, it } from "vitest";

import type { VacancyListItem } from "@/lib/api/schemas";
import { cardOf, filterCards } from "@/lib/vacancies/cards";

function item(overrides: Partial<VacancyListItem> & { id: string }): VacancyListItem {
  return {
    slug: overrides.id,
    title: "Exhibition volunteers",
    kind: "volunteering",
    description: "",
    requirements: [],
    region: "tashkent-city",
    format: "onsite",
    status: "open",
    startsAt: "2026-10-12T04:00:00.000Z",
    endsAt: "2026-10-14T08:00:00.000Z",
    applicationDeadline: "2026-10-08T13:00:00.000Z",
    acceptanceMode: "manual",
    essayRequired: false,
    allDaysRequired: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    organizationId: "org",
    questions: [],
    saved: false,
    ...overrides,
  } as VacancyListItem;
}

const live = {
  approvalStatus: "approved" as const,
  publishedAt: "2026-09-20T00:00:00.000Z",
};
const DURING = new Date("2026-10-05T00:00:00Z");
const AFTER = new Date("2026-10-20T00:00:00Z");
const progress = {
  applications: 20,
  awaitingReview: 16,
  accepted: 4,
  attended: 0,
  attendanceResolved: 0,
};

describe("cardOf", () => {
  it("sends a draft back to the wizard", () => {
    expect(cardOf(item({ id: "a" }), DURING)).toMatchObject({
      stage: "draft",
      action: "continue",
      href: "/vacancies/a/edit",
    });
  });

  it("shows how many applications wait on a published vacancy", () => {
    expect(cardOf(item({ id: "b", ...live, progress }), DURING)).toMatchObject({
      stage: "published",
      action: "manage",
      count: { key: "toReview", count: 16 },
    });
  });

  it("asks for attendance once the event is over", () => {
    expect(cardOf(item({ id: "c", ...live, progress }), AFTER)).toMatchObject({
      stage: "ended",
      action: "attendance",
      href: "/vacancies/c?tab=attendance",
      count: { key: "attendanceDue", count: 4 },
    });
  });

  it("calls the results recorded when every accepted volunteer is resolved", () => {
    expect(
      cardOf(
        item({
          id: "d",
          ...live,
          progress: { ...progress, attended: 3, attendanceResolved: 4 },
        }),
        AFTER,
      ),
    ).toMatchObject({ stage: "results", count: { key: "attended", count: 3 } });
  });

  it("takes returned work to the feedback in the wizard", () => {
    expect(
      cardOf(item({ id: "e", approvalStatus: "changes_requested" }), DURING),
    ).toMatchObject({ stage: "changes_requested", action: "feedback" });
  });
});

describe("filterCards", () => {
  it("filters by stage, saved flag and words, newest first", () => {
    const vacancies = [
      item({ id: "old", title: "Book drive", createdAt: "2026-08-01T00:00:00.000Z" }),
      item({ id: "new", title: "Book fair", saved: true, ...live }),
      item({ id: "other", title: "Park clean-up" }),
    ];
    expect(filterCards(vacancies, { q: "book" }, DURING).map((v) => v.id)).toEqual([
      "new",
      "old",
    ]);
    expect(filterCards(vacancies, { saved: true }, DURING).map((v) => v.id)).toEqual([
      "new",
    ]);
    expect(filterCards(vacancies, { stage: "draft" }, DURING).map((v) => v.id)).toEqual(
      ["other", "old"],
    );
  });
});

describe("cardOf and verified results", () => {
  const ended = { id: "r", ...live, progress: { ...progress, attendanceResolved: 4 } };

  it("waits for an administrator once results are submitted", () => {
    expect(
      cardOf(
        item({ ...ended, attendanceSheet: { status: "submitted", correction: false } }),
        AFTER,
      ),
    ).toMatchObject({
      stage: "verifying",
      href: "/vacancies/r?tab=attendance",
      count: { key: "awaitingVerification" },
    });
  });

  it("asks for attention when results come back", () => {
    expect(
      cardOf(
        item({
          ...ended,
          attendanceSheet: { status: "changes_requested", correction: false },
        }),
        AFTER,
      ),
    ).toMatchObject({ stage: "ended", count: { key: "resultsReturned" } });
  });

  it("calls results final only once they are verified", () => {
    expect(
      cardOf(
        item({ ...ended, attendanceSheet: { status: "draft", correction: false } }),
        AFTER,
      ).stage,
    ).toBe("ended");
    expect(
      cardOf(
        item({ ...ended, attendanceSheet: { status: "verified", correction: false } }),
        AFTER,
      ).stage,
    ).toBe("results");
  });
});
