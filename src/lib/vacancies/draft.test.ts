import { describe, expect, it } from "vitest";

import {
  datesBetween,
  draftFromVacancy,
  draftPayload,
  draftProblems,
  emptyDraft,
  estimatedHoursOf,
  sessionsOf,
  tashkentParts,
  type VacancyDraft,
} from "@/lib/vacancies/draft";

function heimtextil(overrides: Partial<VacancyDraft> = {}): VacancyDraft {
  return {
    ...emptyDraft(),
    title: "Heimtextil Volunteer Team",
    description: "Help welcome visitors, support registration, and guide guests.",
    region: "tashkent-city",
    locationName: "Uzexpocentre",
    startDate: "2026-10-12",
    endDate: "2026-10-14",
    startTime: "09:00",
    endTime: "13:00",
    capacity: "40",
    deadlineDate: "2026-10-08",
    deadlineTime: "18:00",
    essayPrompt: "Why would you like to join?",
    ...overrides,
  };
}

const BEFORE = new Date("2026-10-03T12:00:00Z");

describe("the schedule", () => {
  it("lists every day of the range, inclusive", () => {
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(datesBetween("2026-10-14", "2026-10-12")).toEqual([]);
  });

  it("estimates twelve hours for three mornings of four hours", () => {
    expect(estimatedHoursOf(heimtextil())).toBe(12);
  });

  it("estimates one day when volunteers need not come every day", () => {
    expect(estimatedHoursOf(heimtextil({ allDaysRequired: false }))).toBe(4);
  });

  it("uses each day's own times once they differ", () => {
    const draft = heimtextil({
      sameTimes: false,
      days: { "2026-10-13": { startTime: "10:00", endTime: "12:30" } },
    });
    expect(sessionsOf(draft)[1]).toEqual({
      date: "2026-10-13",
      startTime: "10:00",
      endTime: "12:30",
    });
    expect(estimatedHoursOf(draft)).toBe(10.5);
  });

  it("gives participation no volunteer hours", () => {
    expect(estimatedHoursOf(heimtextil({ kind: "competition" }))).toBeNull();
  });
});

describe("draftProblems", () => {
  it("accepts the complete mock opportunity", () => {
    expect(draftProblems(heimtextil(), "all", "submit", BEFORE)).toEqual({});
  });

  it("checks only the current step's fields", () => {
    const draft = heimtextil({ title: "", region: "" });
    expect(Object.keys(draftProblems(draft, "details"))).toEqual(["title"]);
    expect(Object.keys(draftProblems(draft, "schedule"))).toEqual(["region"]);
  });

  it("refuses a finish before the start, a deadline after it, and too long a range", () => {
    expect(draftProblems(heimtextil({ endTime: "08:00" }), "schedule").endTime).toEqual(
      ["finishBeforeStart"],
    );
    expect(
      draftProblems(
        heimtextil({ deadlineDate: "2026-10-12", deadlineTime: "09:00" }),
        "schedule",
      ).deadlineDate,
    ).toEqual(["deadlineAfterStart"]);
    expect(
      draftProblems(heimtextil({ endDate: "2026-12-01" }), "schedule").endDate,
    ).toEqual(["scheduleTooLong"]);
  });

  it("refuses a past deadline only when submitting", () => {
    const later = new Date("2026-10-09T00:00:00Z");
    expect(draftProblems(heimtextil(), "all", "draft", later)).toEqual({});
    expect(draftProblems(heimtextil(), "all", "submit", later).deadlineDate).toEqual([
      "deadlinePassed",
    ]);
  });

  it("lets a draft be saved without a venue or places, but not submitted", () => {
    const draft = heimtextil({ locationName: "", capacity: "" });
    expect(draftProblems(draft, "all", "draft", BEFORE)).toEqual({});
    expect(draftProblems(draft, "all", "submit", BEFORE)).toMatchObject({
      locationName: ["venueRequired"],
      capacity: ["required"],
    });
  });

  it("keeps meeting passwords out of the public location", () => {
    expect(
      draftProblems(
        heimtextil({ format: "remote", locationName: "Zoom, password 1234" }),
        "schedule",
      ).locationName,
    ).toEqual(["onlineLocationCredentials"]);
  });

  it("checks every day's own times", () => {
    const draft = heimtextil({
      sameTimes: false,
      days: { "2026-10-13": { startTime: "14:00", endTime: "12:00" } },
    });
    expect(draftProblems(draft, "schedule")["day-2026-10-13"]).toEqual([
      "finishBeforeStart",
    ]);
  });
});

describe("draftPayload", () => {
  it("sends Tashkent times, the days and the question", () => {
    expect(draftPayload(heimtextil())).toMatchObject({
      startsAt: "2026-10-12T04:00:00.000Z",
      endsAt: "2026-10-14T08:00:00.000Z",
      applicationDeadline: "2026-10-08T13:00:00.000Z",
      schedule: [
        { date: "2026-10-12", startTime: "09:00", endTime: "13:00" },
        { date: "2026-10-13", startTime: "09:00", endTime: "13:00" },
        { date: "2026-10-14", startTime: "09:00", endTime: "13:00" },
      ],
      allDaysRequired: true,
      capacity: 40,
      estimatedTotalHours: 12,
      essayRequired: true,
      essayPrompt: "Why would you like to join?",
    });
  });

  it("asks nothing and clears the hours for a participation without a question", () => {
    expect(
      draftPayload(
        heimtextil({ kind: "competition", essayPrompt: "  ", capacity: "" }),
      ),
    ).toMatchObject({
      essayRequired: false,
      essayPrompt: null,
      estimatedTotalHours: null,
      capacity: null,
    });
  });
});

describe("draftFromVacancy", () => {
  const stored = {
    kind: "volunteering" as const,
    title: "Reading club",
    description: "Read with children.",
    format: "onsite" as const,
    region: "tashkent-city" as const,
    locationName: "Library",
    startsAt: "2026-10-15T05:00:00.000Z",
    endsAt: "2026-10-15T09:30:00.000Z",
    applicationDeadline: "2026-10-10T13:00:00.000Z",
    acceptanceMode: "manual" as const,
    essayRequired: true,
  };

  it("reads Tashkent wall-clock time, whatever the server's zone", () => {
    expect(tashkentParts("2026-10-15T19:30:00.000Z")).toEqual({
      date: "2026-10-16",
      time: "00:30",
    });
  });

  it("turns an older vacancy's start and end into daily times", () => {
    expect(draftFromVacancy(stored, "Why would you like to join?")).toMatchObject({
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      startTime: "10:00",
      endTime: "14:30",
      deadlineDate: "2026-10-10",
      deadlineTime: "18:00",
      essayPrompt: "Why would you like to join?",
    });
  });

  it("keeps a stored schedule with its own times", () => {
    const draft = draftFromVacancy(
      {
        ...stored,
        essayRequired: false,
        schedule: [
          { date: "2026-10-15", startTime: "10:00", endTime: "12:00" },
          { date: "2026-10-16", startTime: "14:00", endTime: "17:00" },
        ],
        allDaysRequired: false,
      },
      "unused",
    );
    expect(draft).toMatchObject({
      startDate: "2026-10-15",
      endDate: "2026-10-16",
      sameTimes: false,
      allDaysRequired: false,
      essayPrompt: "",
    });
    expect(sessionsOf(draft)[1]).toEqual({
      date: "2026-10-16",
      startTime: "14:00",
      endTime: "17:00",
    });
  });
});
