import "server-only";

import { dataOr } from "@/lib/api/load";
import { loadApplications } from "@/lib/applications/data.server";
import { volunteerNameOf } from "@/lib/applications/filters";
import { buildDirectory, type AuditDirectory } from "@/lib/audit/directory";
import { getSession } from "@/lib/auth/session.server";
import { loadPastEventRosters } from "@/lib/past-event-rosters/data.server";
import { MAX_PAGE_SIZE } from "@/lib/routing/search-params";
import { loadOrganizations, loadVacancies } from "@/lib/vacancies/data.server";

export async function loadAuditDirectory(): Promise<AuditDirectory> {
  const [session, organizations, vacancies, applications, rosters] = await Promise.all([
    getSession(),
    loadOrganizations(),
    loadVacancies(),
    loadApplications(),
    loadPastEventRosters({ page: 1, pageSize: MAX_PAGE_SIZE }),
  ]);

  return buildDirectory({
    me: session?.userId ?? null,
    organizations: dataOr(organizations, []),
    vacancies: dataOr(vacancies, []),
    pastEvents: dataOr(rosters, null)?.items ?? [],
    applications: dataOr(applications, []).map((application) => ({
      id: application.id,
      volunteerId: application.volunteerId,
      volunteerName: volunteerNameOf(application),
      vacancyTitle: application.opportunity?.title ?? "",
    })),
  });
}
