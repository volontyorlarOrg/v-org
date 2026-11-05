import { describe, expect, it } from "vitest";

import {
  approvalStatusOf,
  attendanceOpensAt,
  canEditNow,
  canEditVacancy,
  canSubmitForApproval,
  hasMeetingCredentials,
  hasOpenedToVolunteers,
  isAttendanceOpen,
  missingForApproval,
  vacancyStateOf,
  type ApprovalCandidate,
} from "@/lib/vacancies/approval";

const ready: ApprovalCandidate = {
  kind: "volunteering",
  title: "Winter book drive",
  description: "A longer description of the work.",
  format: "onsite",
  region: "tashkent-city",
  locationName: "Chilonzor library",
  capacity: 20,
  startsAt: "2026-10-01T09:00:00.000Z",
  applicationDeadline: "2026-09-20T18:00:00.000Z",
  organization: { verified: true },
};

describe("approvalStatusOf", () => {
  it("reads the status the API sends when it sends one", () => {
    expect(approvalStatusOf({ approvalStatus: "pending_review" })).toBe(
      "pending_review",
    );
  });

  it("treats a vacancy published before the workflow existed as approved", () => {
    expect(approvalStatusOf({ publishedAt: "2026-01-01T00:00:00.000Z" })).toBe(
      "approved",
    );
  });

  it("treats an unpublished vacancy from before the workflow as a draft", () => {
    expect(approvalStatusOf({})).toBe("draft");
  });
});

describe("vacancyStateOf", () => {
  it("reports an archived vacancy as archived whatever its approval was", () => {
    expect(
      vacancyStateOf({
        approvalStatus: "approved",
        archivedAt: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe("archived");
  });
});

describe("what an organization may do", () => {
  it("submits a draft and a vacancy that came back for changes", () => {
    expect(canSubmitForApproval({ approvalStatus: "draft" })).toBe(true);
    expect(canSubmitForApproval({ approvalStatus: "changes_requested" })).toBe(true);
    expect(canSubmitForApproval({ approvalStatus: "pending_review" })).toBe(false);
    expect(canSubmitForApproval({ approvalStatus: "rejected" })).toBe(false);
    expect(canSubmitForApproval({ approvalStatus: "approved" })).toBe(false);
  });

  it("locks a vacancy while an administrator is looking at it", () => {
    expect(canEditVacancy({ approvalStatus: "pending_review" })).toBe(false);
  });

  it("lets an organization revise a published vacancy for another approval", () => {
    expect(canEditVacancy({ approvalStatus: "approved" })).toBe(true);
  });

  it("keeps a rejected vacancy read-only for good", () => {
    expect(canEditVacancy({ approvalStatus: "rejected" })).toBe(false);
    expect(canSubmitForApproval({ approvalStatus: "rejected" })).toBe(false);
  });

  it("reopens editing after changes are requested", () => {
    expect(canEditVacancy({ approvalStatus: "changes_requested" })).toBe(true);
  });

  it("stops editing once archived", () => {
    expect(
      canEditVacancy({
        approvalStatus: "approved",
        archivedAt: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("editing once a vacancy is live", () => {
  const NOW = new Date("2026-10-10T09:00:00.000Z");

  it("allows it before the event starts, because the vacancy can still return", () => {
    expect(
      canEditNow(
        { approvalStatus: "approved", startsAt: "2026-10-20T09:00:00.000Z" },
        NOW,
      ),
    ).toBe(true);
  });

  it("refuses it once the event has started, because it could never be approved again", () => {
    expect(
      canEditNow(
        { approvalStatus: "approved", startsAt: "2026-10-09T09:00:00.000Z" },
        NOW,
      ),
    ).toBe(false);
  });

  it("keeps a draft editable whatever its dates say, so they can be corrected", () => {
    expect(
      canEditNow(
        { approvalStatus: "draft", startsAt: "2026-10-09T09:00:00.000Z" },
        NOW,
      ),
    ).toBe(true);
  });

  it("follows the ordinary rules otherwise", () => {
    expect(
      canEditNow(
        { approvalStatus: "pending_review", startsAt: "2026-10-20T09:00:00.000Z" },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("whether applications and attendance apply yet", () => {
  it("waits for a never-published vacancy, where the tabs would be dead ends", () => {
    expect(hasOpenedToVolunteers({}, 0)).toBe(false);
  });

  it("opens once the vacancy has been published, even if it has returned to draft", () => {
    expect(hasOpenedToVolunteers({ publishedAt: "2026-09-01T00:00:00.000Z" }, 0)).toBe(
      true,
    );
  });

  it("opens if applications exist, so none is ever hidden", () => {
    expect(hasOpenedToVolunteers({}, 1)).toBe(true);
  });
});

describe("missingForApproval", () => {
  it("passes a vacancy that carries everything approval needs", () => {
    expect(missingForApproval(ready)).toEqual([]);
  });

  it("refuses a vacancy whose organization is not verified", () => {
    expect(
      missingForApproval({ ...ready, organization: { verified: false } }),
    ).toContain("organization");
  });

  it("asks for a venue and places, as the wizard does before it sends", () => {
    expect(
      missingForApproval({ ...ready, locationName: undefined, capacity: undefined }),
    ).toEqual(["location", "capacity"]);
  });

  it("accepts a city in place of a venue on an older vacancy", () => {
    expect(
      missingForApproval({ ...ready, locationName: undefined, city: "Tashkent" }),
    ).toEqual([]);
  });

  it("asks a competition for a venue but not for a number of places", () => {
    expect(
      missingForApproval({ ...ready, kind: "competition", capacity: undefined }),
    ).toEqual([]);
  });

  it("refuses a deadline that has already passed, as the API does", () => {
    expect(missingForApproval(ready, new Date("2026-09-21T00:00:00.000Z"))).toContain(
      "applicationDeadline",
    );
    expect(missingForApproval(ready, new Date("2026-09-19T00:00:00.000Z"))).toEqual([]);
  });

  it("requires the deadline to fall before the vacancy starts", () => {
    for (const applicationDeadline of [
      "2026-10-01T09:00:00.000Z",
      "2026-10-02T18:00:00.000Z",
    ]) {
      expect(missingForApproval({ ...ready, applicationDeadline })).toContain(
        "applicationDeadline",
      );
    }
  });
});

describe("hasMeetingCredentials", () => {
  it("catches a passcode a coordinator pasted into a public field", () => {
    expect(hasMeetingCredentials("Zoom, passcode 4821")).toBe(true);
    expect(hasMeetingCredentials("https://meet.example.org/x?pwd=abc")).toBe(true);
    expect(hasMeetingCredentials("Parol: 1234")).toBe(true);
    expect(hasMeetingCredentials("Пароль 55")).toBe(true);
  });

  it("leaves an ordinary online description alone", () => {
    expect(hasMeetingCredentials("Online briefing, link sent on the day")).toBe(false);
  });
});

describe("when attendance opens", () => {
  const scheduled = { ...ready, endsAt: "2026-10-01T15:00:00.000Z" };

  it("opens when the event ends", () => {
    expect(attendanceOpensAt(scheduled)?.toISOString()).toBe(
      "2026-10-01T15:00:00.000Z",
    );
  });

  it("falls back to the start for a legacy record with no end", () => {
    expect(attendanceOpensAt({ startsAt: ready.startsAt })?.toISOString()).toBe(
      "2026-10-01T09:00:00.000Z",
    );
  });

  it("stays shut until that moment has passed", () => {
    expect(isAttendanceOpen(scheduled, new Date("2026-10-01T14:59:00.000Z"))).toBe(
      false,
    );
    expect(isAttendanceOpen(scheduled, new Date("2026-10-01T15:00:00.000Z"))).toBe(
      true,
    );
  });
});
