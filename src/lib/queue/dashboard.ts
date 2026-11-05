import type { Application, Organization, Vacancy } from "@/lib/api/schemas";
import { isSameTashkentDay } from "@/lib/datetime";
import {
  approvalCandidateOf,
  attendanceOpensAt,
  isAttendanceOpen,
  missingForApproval,
  vacancyStateOf,
  type ApprovalRequirement,
} from "@/lib/vacancies/approval";

function time(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

const oldestFirst = <T>(items: T[], since: (item: T) => string | undefined): T[] =>
  items.sort((a, b) => time(since(a)) - time(since(b)));

export type VacancyEntry = {
  vacancy: Vacancy;
  organization: Organization | undefined;
  missing: ApprovalRequirement[];
  receivedAt: string | undefined;
};

function organizationOf(
  vacancy: Vacancy,
  organizations: readonly Organization[],
): Organization | undefined {
  return (
    organizations.find((organization) => organization.id === vacancy.organizationId) ??
    vacancy.organization
  );
}

function vacancyEntry(
  vacancy: Vacancy,
  organizations: readonly Organization[],
  now: Date,
  receivedAt: string | undefined,
): VacancyEntry {
  const organization = organizationOf(vacancy, organizations);
  return {
    vacancy,
    organization,
    receivedAt,
    missing: missingForApproval(approvalCandidateOf(vacancy, organization), now),
  };
}

export type ApplicationEntry = {
  application: Application;
  vacancy: Vacancy | undefined;
};

export function applicationsToDecide(
  applications: readonly Application[],
  vacancies: readonly Vacancy[],
): ApplicationEntry[] {
  const byId = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]));
  return applications
    .filter(
      (application) =>
        application.status === "submitted" || application.status === "under_review",
    )
    .map((application) => ({
      application,
      vacancy: byId.get(application.opportunityId),
    }))
    .filter((entry) => !entry.vacancy?.archivedAt)
    .sort(
      (a, b) =>
        time(a.application.submittedAt ?? a.application.createdAt) -
        time(b.application.submittedAt ?? b.application.createdAt),
    );
}

export type VacancyApplications = {
  vacancyId: string;
  title: string;
  vacancy: Vacancy | undefined;
  waiting: number;
  underReview: number;
  staged: number;
  oldestAt: string | undefined;
};

export function applicationsByVacancy(
  entries: readonly ApplicationEntry[],
): VacancyApplications[] {
  const groups = new Map<string, VacancyApplications>();

  for (const { application, vacancy } of entries) {
    const sentAt = application.submittedAt ?? application.createdAt;
    const group = groups.get(application.opportunityId) ?? {
      vacancyId: application.opportunityId,
      title:
        vacancy?.title ?? application.opportunity?.title ?? application.opportunityId,
      vacancy,
      waiting: 0,
      underReview: 0,
      staged: 0,
      oldestAt: undefined,
    };
    group.waiting += 1;
    if (application.status === "under_review") group.underReview += 1;
    if (application.stagedDecision) group.staged += 1;
    if (time(sentAt) < time(group.oldestAt)) group.oldestAt = sentAt;
    groups.set(application.opportunityId, group);
  }

  return [...groups.values()].sort((a, b) => time(a.oldestAt) - time(b.oldestAt));
}

export type RollCall = {
  vacancyId: string;
  title: string;
  endedAt: Date | null;
  /** Nobody has entered an outcome for these volunteers yet. */
  awaiting: number;
  /** Entered on the sheet, not yet sent to an administrator. */
  drafted: number;
  /** Already verified. */
  resolved: number;
};

export function rollCallsDue(
  applications: readonly Application[],
  vacancies: readonly Vacancy[],
  now: Date,
): RollCall[] {
  const byId = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]));
  const calls = new Map<string, RollCall>();

  for (const application of applications) {
    if (application.status !== "accepted") continue;
    const vacancy = byId.get(application.opportunityId);
    const timing = vacancy ?? {
      startsAt: application.opportunity?.startsAt ?? "",
      endsAt: application.opportunity?.endsAt,
    };
    if (!timing.startsAt || !isAttendanceOpen(timing, now)) continue;
    const sheet = vacancy?.attendanceSheet;
    if (sheet?.status === "submitted") continue;
    if (sheet?.status === "verified" && !sheet.correction) continue;

    const call = calls.get(application.opportunityId) ?? {
      vacancyId: application.opportunityId,
      title:
        vacancy?.title ?? application.opportunity?.title ?? application.opportunityId,
      endedAt: attendanceOpensAt(timing),
      awaiting: 0,
      drafted: 0,
      resolved: 0,
    };
    const attendance = application.attendance;
    const verified = attendance?.outcome;
    const draft = attendance?.draftOutcome;
    if (verified && verified !== "awaiting_confirmation") call.resolved += 1;
    else if (draft && draft !== "awaiting_confirmation") call.drafted += 1;
    else call.awaiting += 1;
    calls.set(application.opportunityId, call);
  }

  return [...calls.values()]
    .filter((call) => call.awaiting > 0 || call.drafted > 0)
    .sort((a, b) => (a.endedAt?.getTime() ?? 0) - (b.endedAt?.getTime() ?? 0));
}

export type ClearedVacancy = {
  kind: "vacancy";
  vacancy: Vacancy;
  decision: "approved" | "changes_requested" | "rejected";
  at: string;
};

export type ClearedApplication = {
  kind: "application";
  application: Application;
  decision: Application["status"];
  at: string;
};

export type ClearedResults = {
  kind: "results";
  vacancyId: string;
  title: string;
  at: string;
};

export type Cleared = ClearedVacancy | ClearedApplication | ClearedResults;

const FINAL_DECISIONS = new Set<Application["status"]>([
  "accepted",
  "rejected",
  "closed",
]);

/**
 * Everything decided today on this organization's work. Applications are its own
 * decisions; vacancies and results are decided by an administrator, so they count
 * whoever decided them.
 */
export function clearedToday({
  vacancies,
  applications,
  me,
  now,
}: {
  vacancies: readonly Vacancy[];
  applications: readonly Application[];
  me: string;
  now: Date;
}): Cleared[] {
  const cleared: Cleared[] = [];

  for (const vacancy of vacancies) {
    const decision = vacancy.approvalStatus;
    if (
      isSameTashkentDay(vacancy.approvalReviewedAt, now) &&
      (decision === "approved" ||
        decision === "changes_requested" ||
        decision === "rejected")
    ) {
      cleared.push({
        kind: "vacancy",
        vacancy,
        decision,
        at: vacancy.approvalReviewedAt as string,
      });
    }

    const sheet = vacancy.attendanceSheet;
    if (sheet?.status === "verified" && isSameTashkentDay(sheet.verifiedAt, now)) {
      cleared.push({
        kind: "results",
        vacancyId: vacancy.id,
        title: vacancy.title,
        at: sheet.verifiedAt as string,
      });
    }
  }

  for (const application of applications) {
    if (
      application.reviewedById === me &&
      isSameTashkentDay(application.reviewedAt, now) &&
      FINAL_DECISIONS.has(application.status)
    ) {
      cleared.push({
        kind: "application",
        application,
        decision: application.status,
        at: application.reviewedAt as string,
      });
    }
  }

  return cleared.sort((a, b) => time(b.at) - time(a.at));
}

export type Desk = {
  returned: VacancyEntry[];
  drafts: VacancyEntry[];
};

export function deskOf(
  vacancies: readonly Vacancy[],
  organizations: readonly Organization[],
  now: Date,
): Desk {
  const returned = vacancies
    .filter((vacancy) => vacancyStateOf(vacancy) === "changes_requested")
    .map((vacancy) =>
      vacancyEntry(
        vacancy,
        organizations,
        now,
        vacancy.approvalReviewedAt ?? vacancy.updatedAt,
      ),
    );
  const drafts = vacancies
    .filter((vacancy) => vacancyStateOf(vacancy) === "draft")
    .map((vacancy) => vacancyEntry(vacancy, organizations, now, vacancy.updatedAt));

  return {
    returned: oldestFirst(returned, (entry) => entry.receivedAt),
    drafts: oldestFirst(drafts, (entry) => entry.receivedAt),
  };
}

export type ReturnedResults = { vacancy: Vacancy; returnedAt: string | undefined };

export function resultsReturned(vacancies: readonly Vacancy[]): ReturnedResults[] {
  return oldestFirst(
    vacancies
      .filter(
        (vacancy) =>
          !vacancy.archivedAt &&
          vacancy.attendanceSheet?.status === "changes_requested",
      )
      .map((vacancy) => ({ vacancy, returnedAt: vacancy.updatedAt })),
    (item) => item.returnedAt,
  );
}

export type WithAdministrator = {
  kind: "vacancy" | "results" | "pastEvent";
  id: string;
  title: string;
  since: string | undefined;
};

type RosterSummary = {
  id: string;
  title: string;
  pending: number;
  createdAt: string;
};

/** What the organization has sent and is waiting on, longest wait first. */
export function withAdministrator(
  vacancies: readonly Vacancy[],
  pastEvents: readonly RosterSummary[],
): WithAdministrator[] {
  const items: WithAdministrator[] = [];

  for (const vacancy of vacancies) {
    if (vacancyStateOf(vacancy) === "pending_review") {
      items.push({
        kind: "vacancy",
        id: vacancy.id,
        title: vacancy.title,
        since: vacancy.approvalSubmittedAt ?? vacancy.updatedAt,
      });
    }
    if (!vacancy.archivedAt && vacancy.attendanceSheet?.status === "submitted") {
      items.push({
        kind: "results",
        id: vacancy.id,
        title: vacancy.title,
        since: vacancy.attendanceSheet.submittedAt ?? vacancy.updatedAt,
      });
    }
  }

  for (const event of pastEvents) {
    if (event.pending > 0) {
      items.push({
        kind: "pastEvent",
        id: event.id,
        title: event.title,
        since: event.createdAt,
      });
    }
  }

  return oldestFirst(items, (item) => item.since);
}
