import { describe, expect, it } from "vitest";

import {
  amountProblem,
  rosterTotals,
  usernamesIn,
} from "@/lib/past-event-rosters/roster";

describe("usernames pasted into the participant field", () => {
  it("reads several names separated by spaces, commas or new lines, with or without @", () => {
    expect(usernamesIn("aziza, @Bobur_K\n dilnoza;  eldor ")).toEqual({
      valid: ["aziza", "bobur_k", "dilnoza", "eldor"],
      invalid: [],
    });
  });

  it("drops repeats and keeps names that can never exist apart, so they can be reported", () => {
    expect(usernamesIn("aziza aziza @AZIZA ab bad-name")).toEqual({
      valid: ["aziza"],
      invalid: ["ab", "bad-name"],
    });
  });

  it("reads nothing from an empty field", () => {
    expect(usernamesIn("  , ; \n")).toEqual({ valid: [], invalid: [] });
  });
});

describe("totals on the review step", () => {
  it("adds hours and XP and counts who has no hours, so the organization sees what it sends", () => {
    expect(
      rosterTotals([
        { hours: "2.25", xpAwarded: "30" },
        { hours: "1.1", xpAwarded: "15" },
        { hours: "0", xpAwarded: "10" },
      ]),
    ).toEqual({ count: 3, hours: 3.35, xp: 55, zeroHours: 1 });
  });
});

describe("amounts set for everyone", () => {
  it("accepts the same hours and XP the backend accepts", () => {
    expect(amountProblem("hours", "3.5")).toBeNull();
    expect(amountProblem("hours", "999")).toBeNull();
    expect(amountProblem("xpAwarded", "100000")).toBeNull();
  });

  it("names the problem for anything the backend would refuse", () => {
    expect(amountProblem("hours", "1.234")).toBe("hoursAmount");
    expect(amountProblem("hours", "-1")).toBe("hoursAmount");
    expect(amountProblem("hours", "")).toBe("hoursAmount");
    expect(amountProblem("xpAwarded", "100001")).toBe("xpAmount");
    expect(amountProblem("xpAwarded", "1.5")).toBe("xpAmount");
  });
});
