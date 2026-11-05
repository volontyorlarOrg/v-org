import {
  type OpportunityApprovalStatus,
  type VacancyFormat,
  type VacancyKind,
  type VacancyState,
} from "@/lib/domain/vocabulary";

export type ApprovalSubject = {
  approvalStatus?: OpportunityApprovalStatus | undefined;
  publishedAt?: string | undefined;
  archivedAt?: string | undefined;
};

export function approvalStatusOf(vacancy: ApprovalSubject): OpportunityApprovalStatus {
  if (vacancy.approvalStatus) return vacancy.approvalStatus;
  return vacancy.publishedAt ? "approved" : "draft";
}

export function vacancyStateOf(vacancy: ApprovalSubject): VacancyState {
  return vacancy.archivedAt ? "archived" : approvalStatusOf(vacancy);
}

export function canEditVacancy(vacancy: ApprovalSubject): boolean {
  const state = vacancyStateOf(vacancy);
  return state === "draft" || state === "changes_requested" || state === "approved";
}

/**
 * Saving a published vacancy returns it to draft, and a draft needs a future
 * deadline before its start to go back for approval. Once the event has started
 * that can never hold, so the edit would strand the vacancy and its attendance.
 */
export function canEditNow(
  vacancy: ApprovalSubject & { startsAt: string },
  now: Date,
): boolean {
  if (!canEditVacancy(vacancy)) return false;
  if (vacancyStateOf(vacancy) !== "approved") return true;
  return Date.parse(vacancy.startsAt) > now.getTime();
}

export function canSubmitForApproval(vacancy: ApprovalSubject): boolean {
  const state = vacancyStateOf(vacancy);
  return state === "draft" || state === "changes_requested";
}

/** Applications and attendance mean nothing until a vacancy has been public. */
export function hasOpenedToVolunteers(
  vacancy: Pick<ApprovalSubject, "publishedAt">,
  applications: number,
): boolean {
  return Boolean(vacancy.publishedAt) || applications > 0;
}

export const APPROVAL_REQUIREMENTS = [
  "organization",
  "title",
  "description",
  "format",
  "region",
  "location",
  "capacity",
  "startsAt",
  "applicationDeadline",
] as const;

export type ApprovalRequirement = (typeof APPROVAL_REQUIREMENTS)[number];

export type ApprovalCandidate = {
  kind: VacancyKind;
  title: string;
  description: string;
  format: VacancyFormat;
  region: string;
  locationName?: string | undefined;
  city?: string | undefined;
  capacity?: number | undefined;
  startsAt: string;
  applicationDeadline: string;
  organization?: { verified: boolean } | undefined;
};

export function approvalCandidateOf(
  vacancy: Omit<ApprovalCandidate, "organization">,
  organization: { verified: boolean } | undefined,
): ApprovalCandidate {
  return {
    kind: vacancy.kind,
    title: vacancy.title,
    description: vacancy.description,
    format: vacancy.format,
    region: vacancy.region,
    locationName: vacancy.locationName,
    city: vacancy.city,
    capacity: vacancy.capacity,
    startsAt: vacancy.startsAt,
    applicationDeadline: vacancy.applicationDeadline,
    organization,
  };
}

function isFilled(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isMoment(value: string | undefined): boolean {
  return isFilled(value) && !Number.isNaN(Date.parse(value as string));
}

export function missingForApproval(
  vacancy: ApprovalCandidate,
  now?: Date,
): ApprovalRequirement[] {
  const missing: ApprovalRequirement[] = [];

  if (!vacancy.organization?.verified) missing.push("organization");
  if (!isFilled(vacancy.title)) missing.push("title");
  if (!isFilled(vacancy.description)) missing.push("description");
  if (!vacancy.format) missing.push("format");
  if (!isFilled(vacancy.region)) missing.push("region");
  if (!isFilled(vacancy.locationName) && !isFilled(vacancy.city)) {
    missing.push("location");
  }
  if (vacancy.kind === "volunteering" && vacancy.capacity === undefined) {
    missing.push("capacity");
  }
  if (!isMoment(vacancy.startsAt)) missing.push("startsAt");

  if (!isMoment(vacancy.applicationDeadline)) {
    missing.push("applicationDeadline");
  } else if (
    isMoment(vacancy.startsAt) &&
    Date.parse(vacancy.applicationDeadline) >= Date.parse(vacancy.startsAt)
  ) {
    missing.push("applicationDeadline");
  } else if (now && Date.parse(vacancy.applicationDeadline) <= now.getTime()) {
    missing.push("applicationDeadline");
  }

  return missing;
}

const CREDENTIAL_PATTERNS = [
  /\bpwd\s*=/i,
  /\bpasscode\b/i,
  /\bpassword\b/i,
  /\bpass\s?code\b/i,
  /\bpin\s*[:=]/i,
  /пароль/i,
  /код\s+доступа/i,
  /\bparol\b/i,
  /\bkirish\s+kodi\b/i,
];

export function hasMeetingCredentials(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}

export function attendanceOpensAt(vacancy: {
  startsAt: string;
  endsAt?: string | undefined;
}): Date | null {
  const source = isMoment(vacancy.endsAt) ? vacancy.endsAt : vacancy.startsAt;
  if (!isMoment(source)) return null;
  return new Date(source as string);
}

export function isAttendanceOpen(
  vacancy: { startsAt: string; endsAt?: string | undefined },
  now: Date,
): boolean {
  const opensAt = attendanceOpensAt(vacancy);
  return opensAt !== null && now.getTime() >= opensAt.getTime();
}
