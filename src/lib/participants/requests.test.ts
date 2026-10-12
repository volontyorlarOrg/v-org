import { describe, expect, it } from "vitest";

import { requestDate, requestSubject, waitingFirst } from "@/lib/participants/requests";
import { pastEventRequestSchema } from "@/lib/participants/schemas";

function request(overrides: Record<string, unknown>) {
  return pastEventRequestSchema.parse({
    id: "r1",
    kind: "create",
    status: "pending",
    title: "Book drive",
    eventDate: "2026-09-20",
    hours: 3,
    xpAwarded: 40,
    createdAt: "2026-10-10T08:00:00.000Z",
    organization: { id: "o1", name: "Readers" },
    volunteer: { id: "v1", displayName: "Aziza", username: "aziza" },
    ...overrides,
  });
}

describe("past event requests", () => {
  it("names a removal after the event it would remove", () => {
    const removal = request({
      kind: "remove",
      title: null,
      eventDate: null,
      hours: null,
      xpAwarded: null,
      event: {
        id: "e1",
        title: "City cleanup",
        eventDate: "2026-08-01",
        hours: 2,
        xpAwarded: 20,
      },
    });

    expect(requestSubject(removal)).toBe("City cleanup");
    expect(requestDate(removal)).toBe("2026-08-01");
    expect(removal.event?.live).toBe(true);
  });

  it("puts what still waits on an administrator first, newest first within each", () => {
    const sorted = waitingFirst([
      request({ id: "old-approved", status: "approved" }),
      request({ id: "older-waiting", createdAt: "2026-10-01T08:00:00.000Z" }),
      request({
        id: "rejected",
        status: "rejected",
        createdAt: "2026-10-11T08:00:00.000Z",
      }),
      request({ id: "newer-waiting", createdAt: "2026-10-11T08:00:00.000Z" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "newer-waiting",
      "older-waiting",
      "rejected",
      "old-approved",
    ]);
  });
});
