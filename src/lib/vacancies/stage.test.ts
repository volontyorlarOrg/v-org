import { describe, expect, it } from "vitest";

import type { VacancyListItem } from "@/lib/api/schemas";
import {
  countByStage,
  filterVacancyList,
  nextStepOf,
  stageOf,
} from "@/lib/vacancies/stage";

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

describe("the next step on a vacancy", () => {
  it("sends a draft back to the wizard, and asks the organization to move", () => {
    expect(
      nextStepOf(item({ id: "1", approvalStatus: "draft" }), DURING),
    ).toMatchObject({
      stage: "draft",
      action: "continue",
      href: "/vacancies/1/edit",
      needsYou: true,
    });
  });

  it("opens the applications of a live vacancy, and asks only when some wait", () => {
    expect(nextStepOf(item({ id: "2", ...live, progress }), DURING)).toMatchObject({
      stage: "published",
      action: "manage",
      href: "/vacancies/2?tab=applications",
      needsYou: true,
    });
    expect(
      nextStepOf(
        item({ id: "2", ...live, progress: { ...progress, awaitingReview: 0 } }),
        DURING,
      ).needsYou,
    ).toBe(false);
  });

  it("asks for attendance once the event is over", () => {
    expect(nextStepOf(item({ id: "3", ...live, progress }), AFTER)).toMatchObject({
      stage: "ended",
      action: "attendance",
      href: "/vacancies/3?tab=attendance",
      needsYou: true,
    });
  });

  it("does not ask for attendance when nobody was accepted", () => {
    expect(
      nextStepOf(
        item({ id: "3", ...live, progress: { ...progress, accepted: 0 } }),
        AFTER,
      ),
    ).toMatchObject({ stage: "ended", action: "open", needsYou: false });
  });

  it("calls older results recorded when every accepted volunteer is resolved", () => {
    expect(
      nextStepOf(
        item({
          id: "4",
          ...live,
          progress: { ...progress, attended: 3, attendanceResolved: 4 },
        }),
        AFTER,
      ),
    ).toMatchObject({ stage: "results", action: "results", needsYou: false });
  });

  it("takes returned work to the feedback in the wizard", () => {
    expect(
      nextStepOf(item({ id: "5", approvalStatus: "changes_requested" }), DURING),
    ).toMatchObject({ stage: "changes_requested", action: "feedback", needsYou: true });
  });
});

describe("the stage of a vacancy's results", () => {
  const sheet = (status: "submitted" | "changes_requested" | "verified" | "draft") => ({
    status,
    correction: false,
  });

  it("waits for an administrator once results are submitted", () => {
    const vacancy = item({
      id: "6",
      ...live,
      progress,
      attendanceSheet: sheet("submitted"),
    });
    expect(stageOf(vacancy, AFTER)).toBe("verifying");
    expect(nextStepOf(vacancy, AFTER).needsYou).toBe(false);
  });

  it("gives returned results their own stage, because they need correcting", () => {
    const vacancy = item({
      id: "7",
      ...live,
      progress,
      attendanceSheet: sheet("changes_requested"),
    });
    expect(stageOf(vacancy, AFTER)).toBe("results_returned");
    expect(nextStepOf(vacancy, AFTER)).toMatchObject({
      action: "correct",
      needsYou: true,
    });
  });

  it("calls results final only once they are verified", () => {
    expect(
      stageOf(item({ id: "8", ...live, attendanceSheet: sheet("verified") }), AFTER),
    ).toBe("results");
    expect(
      stageOf(item({ id: "9", ...live, attendanceSheet: sheet("draft") }), AFTER),
    ).toBe("ended");
  });

  it("sends a correction in progress back to attendance", () => {
    expect(
      stageOf(
        item({
          id: "10",
          ...live,
          attendanceSheet: { status: "verified", correction: true },
        }),
        AFTER,
      ),
    ).toBe("ended");
  });
});

describe("filtering the list", () => {
  const vacancies = [
    item({
      id: "old",
      title: "Old fair",
      ...live,
      createdAt: "2026-08-01T00:00:00.000Z",
    }),
    item({
      id: "new",
      title: "New fair",
      approvalStatus: "draft",
      saved: true,
      createdAt: "2026-09-10T00:00:00.000Z",
    }),
    item({ id: "other", title: "Book drive", approvalStatus: "draft" }),
  ];

  it("filters by stage, saved flag and words, newest first", () => {
    expect(
      filterVacancyList(vacancies, { q: "fair" }, DURING).map((row) => row.id),
    ).toEqual(["new", "old"]);
    expect(
      filterVacancyList(vacancies, { stage: "draft" }, DURING).map((row) => row.id),
    ).toEqual(["new", "other"]);
    expect(
      filterVacancyList(vacancies, { saved: true }, DURING).map((row) => row.id),
    ).toEqual(["new"]);
  });

  it("treats a blank search as no search rather than as no results", () => {
    expect(filterVacancyList(vacancies, { q: "   " }, DURING)).toHaveLength(3);
  });

  it("counts each tab over the search, so a tab shows what its count says", () => {
    expect(countByStage(vacancies, "", DURING)).toMatchObject({
      all: 3,
      draft: 2,
      published: 1,
      saved: 1,
    });
    expect(countByStage(vacancies, "book", DURING)).toMatchObject({
      all: 1,
      draft: 1,
      published: 0,
      saved: 0,
    });
  });
});
