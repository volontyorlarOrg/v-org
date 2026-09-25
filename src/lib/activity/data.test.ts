import { describe, expect, it } from "vitest";

import { actionNames, filterActivity } from "@/lib/activity/filters";
import type { AuditEvent } from "@/lib/api/schemas";

function event(id: string, action: string, createdAt: string): AuditEvent {
  return {
    id,
    action,
    entityType: "Opportunity",
    entityId: `entity-${id}`,
    createdAt,
  } as AuditEvent;
}

const events = [
  event("a", "opportunity.published", "2026-09-01T00:00:00.000Z"),
  event("b", "application.reviewed", "2026-09-03T00:00:00.000Z"),
  event("c", "opportunity.published", "2026-09-02T00:00:00.000Z"),
];

describe("filterActivity", () => {
  it("puts the newest event first", () => {
    expect(filterActivity(events, {}).map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by an exact action, not a partial one", () => {
    expect(
      filterActivity(events, { action: "opportunity.published" }).map(
        (item) => item.id,
      ),
    ).toEqual(["c", "a"]);
    expect(filterActivity(events, { action: "opportunity" })).toEqual([]);
  });

  it("searches the action and the entity", () => {
    expect(filterActivity(events, { q: "REVIEWED" }).map((item) => item.id)).toEqual([
      "b",
    ]);
    expect(filterActivity(events, { q: "entity-a" }).map((item) => item.id)).toEqual([
      "a",
    ]);
  });

  it("does not mutate the list it was given", () => {
    const original = [...events];
    filterActivity(events, {});
    expect(events).toEqual(original);
  });
});

describe("actionNames", () => {
  it("lists each action once, sorted, so a filter can offer them", () => {
    expect(actionNames(events)).toEqual([
      "application.reviewed",
      "opportunity.published",
    ]);
  });
});
