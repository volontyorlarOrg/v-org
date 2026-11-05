export const AUDIT_ACTIONS = [
  "opportunity.created",
  "opportunity.updated",
  "opportunity.image.updated",
  "opportunity.image.removed",
  "opportunity.submitted_for_approval",
  "opportunity.approved",
  "opportunity.published",
  "opportunity.changes_requested",
  "opportunity.rejected",
  "opportunity.archived",
  "opportunity.instructions_sent",
  "application.submitted",
  "application.under_review",
  "application.accepted",
  "application.rejected",
  "application.closed",
  "application.reopened",
  "application.withdrawn",
  "attendance.resolved",
  "attendance.submitted",
  "attendance.verified",
  "attendance.changes_requested",
  "past_event_roster.submitted",
  "past_event_roster.participants_added",
  "past_event_request.submitted",
  "past_event_request.approved",
  "past_event_request.rejected",
  "past_event_request.cancelled",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_FAMILIES = [
  "opportunity",
  "application",
  "attendance",
  "pastEvent",
  "award",
  "coordinator",
  "organization",
  "user",
  "other",
] as const;

export type AuditFamily = (typeof AUDIT_FAMILIES)[number];

const FAMILY_PREFIXES: ReadonlyArray<readonly [string, AuditFamily]> = [
  ["opportunity.", "opportunity"],
  ["application.", "application"],
  ["attendance", "attendance"],
  ["past_event", "pastEvent"],
  ["user.past_event.", "pastEvent"],
  ["bulk_award.", "award"],
  ["user.progress.", "award"],
  ["coordinator.", "coordinator"],
  ["organization", "organization"],
  ["user.", "user"],
];

export const AUDIT_FAMILY_ICONS: Record<AuditFamily, string> = {
  opportunity: "clipboard-list",
  application: "inbox",
  attendance: "calendar-check",
  pastEvent: "calendar-clock",
  award: "award",
  coordinator: "user-cog",
  organization: "building-2",
  user: "key-round",
  other: "scroll-text",
};

export function auditFamilyOf(action: string): AuditFamily {
  return FAMILY_PREFIXES.find(([prefix]) => action.startsWith(prefix))?.[1] ?? "other";
}

export function isKnownAuditAction(action: string): action is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(action);
}

export function auditActionOptions(seen: readonly string[]): string[] {
  return [...new Set([...AUDIT_ACTIONS, ...seen])];
}

export function auditActionGroups(
  seen: readonly string[],
): Array<{ family: AuditFamily; actions: string[] }> {
  const options = auditActionOptions(seen);
  return AUDIT_FAMILIES.map((family) => ({
    family,
    actions: options.filter((action) => auditFamilyOf(action) === family),
  })).filter((group) => group.actions.length > 0);
}

export function auditActionKey(action: string): string {
  return action.replace(/\./g, "_");
}
