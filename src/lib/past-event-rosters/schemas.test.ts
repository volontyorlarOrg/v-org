import { describe, expect, it } from "vitest";
import { rosterInputSchema } from "./schemas";

const first = "00000000-0000-4000-8000-000000000001";
const input = {
  submissionId: "00000000-0000-4000-8000-000000000002",
  title: "  Book drive ",
  eventDate: "2025-09-20",
  note: "",
  participants: [{ volunteerId: first, hours: "3.25", xpAwarded: "40" }],
};

describe("historical event roster input", () => {
  it("sends one event with independently entered numeric hours and XP", () => {
    expect(rosterInputSchema.parse(input)).toMatchObject({
      title: "Book drive",
      participants: [{ volunteerId: first, hours: 3.25, xpAwarded: 40 }],
    });
  });
  it("refuses duplicate, empty and oversized participant lists", () => {
    for (const participants of [
      [],
      [input.participants[0], input.participants[0]],
      Array.from({ length: 101 }, () => input.participants[0]),
    ]) {
      expect(rosterInputSchema.safeParse({ ...input, participants }).success).toBe(
        false,
      );
    }
  });
  it("keeps every amount within the backend limits", () => {
    for (const amounts of [
      { hours: "999.01" },
      { hours: "-1" },
      { hours: "1.234" },
      { xpAwarded: "100001" },
      { xpAwarded: "0.5" },
    ]) {
      expect(
        rosterInputSchema.safeParse({
          ...input,
          participants: [{ ...input.participants[0], ...amounts }],
        }).success,
      ).toBe(false);
    }
  });
});
