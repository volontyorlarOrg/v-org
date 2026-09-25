import "server-only";

import { read } from "@/lib/api/gateway.server";
import { auditListSchema, type AuditEvent } from "@/lib/api/schemas";
import type { Loaded } from "@/lib/api/load";

export function loadActivity(): Promise<Loaded<AuditEvent[]>> {
  return read("activity", { schema: auditListSchema });
}
