import { describe, expect, it } from "vitest";

import { countsOf, pastEventState } from "@/lib/past-event-rosters/state";

describe("the state of a submitted past event", () => {
  it("waits while any participant waits for the administrator", () => {
    expect(
      pastEventState({ participants: 3, pending: 1, approved: 1, rejected: 1 }),
    ).toBe("waiting");
  });

  it("says approved only when everyone was approved", () => {
    expect(
      pastEventState({ participants: 2, pending: 0, approved: 2, rejected: 0 }),
    ).toBe("approved");
    expect(
      pastEventState({ participants: 3, pending: 0, approved: 2, rejected: 1 }),
    ).toBe("partlyApproved");
  });

  it("tells a rejected event from one the organization withdrew", () => {
    expect(
      pastEventState({ participants: 2, pending: 0, approved: 0, rejected: 1 }),
    ).toBe("rejected");
    expect(
      pastEventState({ participants: 2, pending: 0, approved: 0, rejected: 0 }),
    ).toBe("withdrawn");
  });

  it("counts an event page's participants by their decision", () => {
    expect(
      countsOf([
        { status: "pending" },
        { status: "approved" },
        { status: "approved" },
        { status: "cancelled" },
      ]),
    ).toEqual({ participants: 4, pending: 1, approved: 2, rejected: 0 });
  });
});
