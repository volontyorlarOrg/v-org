import { describe, expect, it } from "vitest";

import {
  pastEventChangeSchema,
  pastEventProposalSchema,
  pastEventRemovalSchema,
  yesterdayInTashkent,
} from "@/lib/participants/input";

const proposal = {
  title: "  Book drive ",
  eventDate: "2026-09-20",
  hours: "3.5",
  xpAwarded: "40",
  note: "",
};

describe("past event proposals", () => {
  it("reads a proposal the way the API expects it", () => {
    expect(pastEventProposalSchema.parse(proposal)).toEqual({
      title: "Book drive",
      eventDate: "2026-09-20",
      hours: 3.5,
      xpAwarded: 40,
      note: "",
    });
  });

  it("names the field that is wrong", () => {
    const codes = (input: Record<string, string>) =>
      pastEventProposalSchema
        .safeParse({ ...proposal, ...input })
        .error?.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);

    expect(codes({ title: "  " })).toEqual(["title:required"]);
    expect(codes({ hours: "1.234" })).toEqual(["hours:hoursAmount"]);
    expect(codes({ hours: "1000" })).toEqual(["hours:hoursAmount"]);
    expect(codes({ xpAwarded: "-5" })).toEqual(["xpAwarded:xpAmount"]);
    expect(codes({ xpAwarded: "100001" })).toEqual(["xpAwarded:xpAmount"]);
    expect(codes({ eventDate: "20.09.2026" })).toEqual([
      "eventDate:pastEventDateInvalid",
    ]);
  });

  it("requires a reason to change or remove a recorded event", () => {
    expect(pastEventChangeSchema.safeParse(proposal).success).toBe(false);
    expect(
      pastEventChangeSchema.safeParse({ ...proposal, note: "Stayed longer" }).success,
    ).toBe(true);
    expect(pastEventRemovalSchema.safeParse({ note: " " }).success).toBe(false);
  });

  it("offers yesterday in Tashkent as the latest day an event can have happened", () => {
    expect(yesterdayInTashkent(new Date("2026-10-12T20:30:00.000Z"))).toBe(
      "2026-10-12",
    );
    expect(yesterdayInTashkent(new Date("2026-10-12T10:00:00.000Z"))).toBe(
      "2026-10-11",
    );
  });
});
