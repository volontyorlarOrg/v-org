import type { AuditEvent } from "@/lib/api/schemas";
import {
  applicationHref,
  navHref,
  pastEventRosterHref,
  userHref,
  vacancyHref,
} from "@/lib/routing/routes";

export type AuditSubjectKind =
  | "vacancy"
  | "application"
  | "coordinator"
  | "volunteer"
  | "organization"
  | "attendance"
  | "account"
  | "pastEvent";

export type AuditSubject = { kind: AuditSubjectKind; href: string | null };

export function subjectOf(
  event: Pick<AuditEvent, "action" | "entityType" | "entityId">,
  coordinatorIds: ReadonlySet<string> = new Set(),
): AuditSubject {
  const type = event.entityType.toLowerCase();
  const id = event.entityId;

  if (type === "pasteventroster")
    return { kind: "pastEvent", href: pastEventRosterHref(id) };
  if (type === "pasteventrequest")
    return { kind: "pastEvent", href: navHref("pastEvents") };

  if (type === "opportunity") return { kind: "vacancy", href: vacancyHref(id) };
  if (type === "application") return { kind: "application", href: applicationHref(id) };
  if (type === "organization") return { kind: "organization", href: null };
  if (type === "attendance") return { kind: "attendance", href: null };
  if (type === "user") {
    if (event.action.startsWith("coordinator.") || coordinatorIds.has(id)) {
      return { kind: "coordinator", href: null };
    }
    return { kind: "volunteer", href: userHref(id) };
  }
  return { kind: "account", href: null };
}
