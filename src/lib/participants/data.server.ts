import "server-only";

import { read } from "@/lib/api/gateway.server";
import type { Loaded } from "@/lib/api/load";
import {
  participantDetailSchema,
  participantPageSchema,
  pastEventRequestPageSchema,
  type ParticipantDetail,
  type ParticipantPage,
  type PastEventRequestPage,
  type PastEventRequestStatus,
} from "@/lib/participants/schemas";

export function loadParticipants(query: {
  q?: string;
  page: number;
  pageSize: number;
}): Promise<Loaded<ParticipantPage>> {
  return read("participants", {
    schema: participantPageSchema,
    query: {
      ...(query.q ? { q: query.q } : {}),
      page: query.page,
      pageSize: query.pageSize,
    },
  });
}

export function loadParticipant(id: string): Promise<Loaded<ParticipantDetail>> {
  return read("participant", { schema: participantDetailSchema, params: { id } });
}

export function loadPastEventRequests(
  query: { status?: PastEventRequestStatus; pageSize?: number } = {},
): Promise<Loaded<PastEventRequestPage>> {
  return read("pastEventRequests", {
    schema: pastEventRequestPageSchema,
    query: {
      ...(query.status ? { status: query.status } : {}),
      page: 1,
      pageSize: query.pageSize ?? 25,
    },
  });
}
