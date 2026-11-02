import "server-only";

import { read } from "@/lib/api/gateway.server";
import { auditListSchema, type AuditEvent } from "@/lib/api/schemas";
import { mapLoaded, type Loaded } from "@/lib/api/load";
import { newestFirst } from "@/lib/audit/timeline";

export function loadActivity(): Promise<Loaded<AuditEvent[]>> {
  return read("activity", { schema: auditListSchema });
}

export async function loadRecentActivity(
  limit: number,
): Promise<Loaded<{ items: AuditEvent[] }>> {
  return mapLoaded(await loadActivity(), (events) => ({
    items: newestFirst(events).slice(0, limit),
  }));
}
