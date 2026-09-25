import type { AuditEvent } from "@/lib/api/schemas";

export function filterActivity(
  events: AuditEvent[],
  { q, action }: { q?: string; action?: string },
): AuditEvent[] {
  const term = q?.trim().toLowerCase() ?? "";

  return [...events]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter((event) => {
      if (action && event.action !== action) return false;
      if (!term) return true;
      return `${event.action} ${event.entityType} ${event.entityId}`
        .toLowerCase()
        .includes(term);
    });
}

export function actionNames(events: AuditEvent[]): string[] {
  return [...new Set(events.map((event) => event.action))].sort();
}
