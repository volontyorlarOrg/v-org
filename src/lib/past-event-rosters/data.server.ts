import "server-only";

import { read } from "@/lib/api/gateway.server";
import { pastEventRosterPageSchema, pastEventRosterSchema } from "./schemas";

export function loadPastEventRosters(query: {
  q?: string;
  page: number;
  pageSize: number;
}) {
  return read("pastEventRosters", { schema: pastEventRosterPageSchema, query });
}

export function loadPastEventRoster(id: string) {
  return read("pastEventRoster", { schema: pastEventRosterSchema, params: { id } });
}
