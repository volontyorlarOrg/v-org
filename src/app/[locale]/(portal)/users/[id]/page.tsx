import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Panel } from "@/components/portal/panel";
import {
  StatusBadge,
  applicationStatus,
  attendanceStatus,
} from "@/components/portal/status-badge";
import { Facts, FigureRow } from "@/components/register/facts";
import { Register, RegisterNote } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import { applicationHref, navHref, vacancyHref } from "@/lib/routing/routes";
import { loadUser } from "@/lib/users/data.server";
import { participationOf } from "@/lib/users/participation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/users/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "users" });
  return { title: t("record") };
}

export default async function UserPage({ params }: PageProps<"/[locale]/users/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, applications, attendanceCopy, common, format] = await Promise.all([
    getTranslations("users"),
    getTranslations("applications"),
    getTranslations("attendance"),
    getTranslations("common"),
    getFormatter(),
  ]);
  const back = { href: navHref("users"), label: t("title") };

  const loaded = await loadUser(id);
  const failure = failureOf(loaded);

  if (failure) {
    return (
      <>
        <PageHeader back={back} title={t("record")} />
        <LoadFailure failure={failure} />
      </>
    );
  }

  if (!isReady(loaded)) notFound();

  const user = loaded.data;
  const name = user.displayName ?? common("notSet");
  const participation = participationOf(user.applications);

  return (
    <>
      <PageHeader
        back={back}
        title={name}
        meta={
          <>
            {user.username ? <span>@{user.username}</span> : null}
            <span>{user.email ?? t("noEmail")}</span>
            <span>
              {t("joinedOn", {
                when: format.dateTime(new Date(user.createdAt), "date"),
              })}
            </span>
          </>
        }
      />

      <FigureRow
        items={[
          { label: t("figures.sent"), value: format.number(participation.sent) },
          {
            label: t("figures.accepted"),
            value: format.number(participation.accepted),
          },
          {
            label: t("figures.attended"),
            value: format.number(participation.attended),
            tone: "person",
          },
          {
            label: t("figures.hours"),
            value: format.number(participation.hours),
            tone: "person",
          },
          {
            label: t("figures.awaiting"),
            value: format.number(participation.awaiting),
          },
        ]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Register
            title={t("detail.applications")}
            count={user.applications.length}
            countLabel={applications("countLabel")}
          >
            {user.applications.length === 0 ? (
              <RegisterNote title={t("detail.noApplications")} />
            ) : (
              <Table>
                <TableCaption className="sr-only">
                  {t("detail.applications")}
                </TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">{applications("table.vacancy")}</TableHead>
                    <TableHead scope="col">{applications("table.status")}</TableHead>
                    <TableHead scope="col">{attendanceCopy("table.hours")}</TableHead>
                    <TableHead scope="col">{applications("table.submitted")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.applications.map((application) => {
                    const chip = applicationStatus(application.status);
                    const outcome = application.attendance?.outcome;
                    const outcomeChip = outcome ? attendanceStatus(outcome) : null;
                    return (
                      <TableRow key={application.id}>
                        <TableCell className="max-w-[20rem]">
                          <Link
                            href={applicationHref(application.id)}
                            className="font-semibold text-ink hover:text-primary-ink hover:underline"
                          >
                            {application.opportunity?.title ??
                              application.opportunityId}
                          </Link>
                          {application.opportunity ? (
                            <Link
                              href={vacancyHref(application.opportunity.id)}
                              className="mt-0.5 block text-xs text-ink-muted hover:text-primary-ink hover:underline"
                            >
                              {t("detail.openVacancy")}
                            </Link>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap gap-1.5">
                            <StatusBadge
                              label={applications(`status.${application.status}`)}
                              tone={chip.tone}
                              icon={chip.icon}
                            />
                            {outcome && outcomeChip ? (
                              <StatusBadge
                                label={attendanceCopy(`outcome.${outcome}`)}
                                tone={outcomeChip.tone}
                                icon={outcomeChip.icon}
                              />
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="tabular">
                          {application.attendance?.confirmedHours === undefined
                            ? "—"
                            : format.number(application.attendance.confirmedHours)}
                        </TableCell>
                        <TableCell className="tabular whitespace-nowrap text-ink-muted">
                          {application.submittedAt
                            ? format.dateTime(new Date(application.submittedAt), "day")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Register>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title={t("detail.account")}>
            <Facts
              items={[{ term: t("table.email"), value: user.email ?? t("noEmail") }]}
            />
          </Panel>
        </aside>
      </div>
    </>
  );
}
