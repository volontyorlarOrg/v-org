import type { StatusTone } from "@/components/portal/status-badge";
import type {
  PastEventRequest,
  PastEventRequestStatus,
} from "@/lib/participants/schemas";

export const REQUEST_TONES: Record<PastEventRequestStatus, StatusTone> = {
  pending: "waiting",
  approved: "person",
  rejected: "danger",
  cancelled: "neutral",
};

export function requestSubject(request: PastEventRequest): string {
  return request.title ?? request.event?.title ?? "";
}

export function requestDate(request: PastEventRequest): string | null {
  return request.eventDate ?? request.event?.eventDate ?? null;
}

export function waitingFirst(
  requests: readonly PastEventRequest[],
): PastEventRequest[] {
  return [...requests].sort((left, right) => {
    const waiting =
      Number(right.status === "pending") - Number(left.status === "pending");
    return waiting !== 0 ? waiting : right.createdAt.localeCompare(left.createdAt);
  });
}
