import type { StatusTone } from "@/components/portal/status-badge";

export type PastEventState =
  "waiting" | "approved" | "partlyApproved" | "rejected" | "withdrawn";

export const PAST_EVENT_STATE_TONES: Record<PastEventState, StatusTone> = {
  waiting: "waiting",
  approved: "person",
  partlyApproved: "person",
  rejected: "danger",
  withdrawn: "neutral",
};

export function pastEventState(counts: {
  participants: number;
  pending: number;
  approved: number;
  rejected: number;
}): PastEventState {
  if (counts.pending > 0) return "waiting";
  if (counts.approved > 0)
    return counts.approved === counts.participants ? "approved" : "partlyApproved";
  return counts.rejected > 0 ? "rejected" : "withdrawn";
}

export function countsOf(requests: readonly { status: string }[]) {
  const count = (status: string) =>
    requests.filter((request) => request.status === status).length;
  return {
    participants: requests.length,
    pending: count("pending"),
    approved: count("approved"),
    rejected: count("rejected"),
  };
}
