import { ArrowRight } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ClearedToday } from "@/components/dashboard/cleared-today";
import {
  Journey,
  type JourneyStation,
  type JourneyWaiting,
} from "@/components/dashboard/journey";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TodayHeader } from "@/components/dashboard/today-header";
import { AgeLead } from "@/components/queue/queue";
import { WorkCard, WorkItem } from "@/components/queue/work-card";
import {
  InlineDecision,
  type DecisionOption,
} from "@/components/register/inline-decision";
import { Count, Register, RegisterNote } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { StatePanel } from "@/components/states/state-panel";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { loadRecentActivity } from "@/lib/activity/data.server";
import { dataOr, failureOf, firstFailure, isReady, type Loaded } from "@/lib/api/load";
import type { Statistics } from "@/lib/api/schemas";
import { loadApplications } from "@/lib/applications/data.server";
import { loadAuditDirectory } from "@/lib/audit/directory.server";
import { getSession } from "@/lib/auth/session.server";
import { longestWait, waited, type Waited } from "@/lib/datetime";
import { loadPastEventRosters } from "@/lib/past-event-rosters/data.server";
import {
  applicationsByVacancy,
  applicationsToDecide,
  clearedToday,
  deskOf,
  resultsReturned,
  rollCallsDue,
  withAdministrator,
  type VacancyEntry,
  type WithAdministrator,
} from "@/lib/queue/dashboard";
import { decisionLabels } from "@/lib/queue/decisions.server";
import { MAX_PAGE_SIZE } from "@/lib/routing/search-params";
import {
  navHref,
  pastEventRosterHref,
  vacancyEditHref,
  vacancyHref,
} from "@/lib/routing/routes";
import { submitVacancyForApprovalAction } from "@/lib/vacancies/actions";
import { loadOrganizations, loadVacancies } from "@/lib/vacancies/data.server";

const ACTIVITY_ROWS = 6;
const ADMINISTRATOR_ROWS = 6;

const linkClass =
  "inline-flex min-h-7 items-center gap-1 text-sm font-medium text-primary-ink hover:underline";

const titleLink = "hover:text-primary-ink hover:underline";

function administratorHref(item: WithAdministrator): string {
  switch (item.kind) {
    case "vacancy":
      return vacancyHref(item.id);
    case "results":
      return `${vacancyHref(item.id)}?tab=attendance`;
    case "pastEvent":
      return pastEventRosterHref(item.id);
  }
}

export async function DashboardDesk({
  statistics,
  title,
  actions,
}: {
  statistics: Loaded<Statistics>;
  title: string;
  actions?: ReactNode;
}) {
  const [t, journey, submit, vocabulary, format, session] = await Promise.all([
    getTranslations("desk"),
    getTranslations("journey"),
    getTranslations("vacancies.submit"),
    getTranslations("vocabulary"),
    getFormatter(),
    getSession(),
  ]);

  const [vacancies, applications, organizations, rosters, directory, recent] =
    await Promise.all([
      loadVacancies(),
      loadApplications(),
      loadOrganizations(),
      loadPastEventRosters({ page: 1, pageSize: MAX_PAGE_SIZE }),
      loadAuditDirectory(),
      loadRecentActivity(ACTIVITY_ROWS),
    ]);

  const now = new Date();
  const failure = firstFailure(vacancies, applications);
  const today = format.dateTime(now, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totals = isReady(statistics) ? statistics.data.totals : null;
  const statisticsFailure = failureOf(statistics);
  const figure = (value: number | undefined) =>
    totals && value !== undefined
      ? format.number(value, { maximumFractionDigits: 1 })
      : "—";
  const station = (
    key: "published" | "applications" | "accepted" | "attended" | "hours",
  ): Omit<JourneyStation, "waiting"> => {
    const base = {
      published: {
        value: figure(totals?.publishedVacancies),
        scope: journey("scope.now"),
        href: `${navHref("vacancies")}?state=published`,
        tone: "institution" as const,
      },
      applications: {
        value: figure(totals?.applications),
        scope: journey("scope.allTime"),
        href: navHref("vacancies"),
        tone: "institution" as const,
      },
      accepted: {
        value: figure(totals?.accepted),
        scope: journey("scope.now"),
        href: navHref("vacancies"),
        tone: "earned" as const,
      },
      attended: {
        value: figure(totals?.attended),
        scope: journey("scope.allTime"),
        href: navHref("attendance"),
        tone: "earned" as const,
      },
      hours: {
        value: totals
          ? journey("hours", { value: figure(totals.confirmedHours) })
          : "—",
        scope: journey("scope.allTime"),
        href: navHref("participants"),
        tone: "earned" as const,
      },
    }[key];
    return { key, label: journey(`stations.${key}`), ...base };
  };
  const journeyCopy = {
    id: "journey",
    title: journey("title"),
    summary: journey("summary"),
    owners: {
      you: journey("owner.you"),
      administrator: journey("owner.administrator"),
    },
    clear: journey("clear"),
  };

  if (failure || !isReady(vacancies) || !isReady(applications)) {
    return (
      <>
        <TodayHeader date={today} headline={title} actions={actions} />
        {statisticsFailure ? <LoadFailure failure={statisticsFailure} /> : null}
        <Journey
          {...journeyCopy}
          waitingKnown={false}
          stations={(
            ["published", "applications", "accepted", "attended", "hours"] as const
          ).map((key) => ({ ...station(key), waiting: [] }))}
        />
        {failure ? <LoadFailure failure={failure} /> : null}
      </>
    );
  }

  const organizationRows = dataOr(organizations, []);
  const unverified = organizationRows.some((item) => !item.verified);
  const desk = deskOf(vacancies.data, organizationRows, now);
  const returnedResults = resultsReturned(vacancies.data);
  const returnedIds = new Set(returnedResults.map((item) => item.vacancy.id));
  const decide = applicationsByVacancy(
    applicationsToDecide(applications.data, vacancies.data),
  );
  const rollCalls = rollCallsDue(applications.data, vacancies.data, now).filter(
    (call) => !returnedIds.has(call.vacancyId),
  );
  const elsewhere = withAdministrator(
    vacancies.data,
    dataOr(rosters, null)?.items ?? [],
  );
  const elsewhereOf = (kind: WithAdministrator["kind"]) =>
    elsewhere.filter((item) => item.kind === kind).length;

  const sum = (groups: readonly { waiting: number }[]) =>
    groups.reduce((total, group) => total + group.waiting, 0);
  const waitingApplications = sum(decide);

  const waiting =
    desk.returned.length +
    returnedResults.length +
    waitingApplications +
    rollCalls.length +
    desk.drafts.length;

  const cleared = session
    ? clearedToday({
        vacancies: vacancies.data,
        applications: applications.data,
        me: session.userId,
        now,
      })
    : [];

  const labels = await decisionLabels();

  const when = (value: string | Date | undefined | null) =>
    value ? format.relativeTime(new Date(value), now) : "";
  const ageText = (age: Waited) =>
    format.number(age.value, { style: "unit", unit: age.unit, unitDisplay: "narrow" });
  const ageLong = (age: Waited) =>
    format.number(age.value, { style: "unit", unit: age.unit, unitDisplay: "long" });
  const oldestIn = (dates: readonly (string | Date | null | undefined)[]) => {
    const longest = longestWait(dates, now);
    return longest ? t("oldestNote", { age: ageText(longest) }) : undefined;
  };

  const oldest = longestWait(
    [
      ...desk.returned.map((entry) => entry.receivedAt),
      ...returnedResults.map((item) => item.returnedAt),
      ...decide.map((group) => group.oldestAt),
      ...rollCalls.map((call) => call.endedAt),
      ...desk.drafts.map((entry) => entry.receivedAt),
    ],
    now,
  );
  const scale = Math.max(1, oldest?.days ?? 1);

  const lead = (since: string | Date | null | undefined, ceiling = scale) => {
    const age = waited(since, now);
    if (!age) {
      return (
        <span className="text-sm text-ink-faint">
          <span aria-hidden="true">—</span>
          <span className="sr-only">{t("ageUnknown")}</span>
        </span>
      );
    }
    const text = ageText(age);
    return (
      <AgeLead
        value={text}
        label={t("age", { age: text })}
        share={age.days / ceiling}
      />
    );
  };

  const dashboard = navHref("dashboard");

  const waitingAt = (items: (JourneyWaiting & { count: number })[]): JourneyWaiting[] =>
    items
      .filter((item) => item.count > 0)
      .map((item) => ({
        key: item.key,
        label: item.label,
        href: item.href,
        owner: item.owner,
      }));

  const stations = [
    {
      ...station("published"),
      waiting: waitingAt([
        {
          key: "returned",
          count: desk.returned.length,
          label: journey("waiting.returned", { count: desk.returned.length }),
          href: `${dashboard}#returned`,
          owner: "you",
        },
        {
          key: "drafts",
          count: desk.drafts.length,
          label: journey("waiting.drafts", { count: desk.drafts.length }),
          href: `${dashboard}#drafts`,
          owner: "you",
        },
        {
          key: "approval",
          count: elsewhereOf("vacancy"),
          label: journey("waiting.approval", { count: elsewhereOf("vacancy") }),
          href: `${navHref("vacancies")}?state=pending_review`,
          owner: "administrator",
        },
      ]),
    },
    {
      ...station("applications"),
      waiting: waitingAt([
        {
          key: "decide",
          count: waitingApplications,
          label: journey("waiting.decide", { count: waitingApplications }),
          href: `${dashboard}#decide`,
          owner: "you",
        },
      ]),
    },
    {
      ...station("accepted"),
      waiting: [],
    },
    {
      ...station("attended"),
      waiting: waitingAt([
        {
          key: "corrections",
          count: returnedResults.length,
          label: journey("waiting.corrections", { count: returnedResults.length }),
          href: `${dashboard}#returned-results`,
          owner: "you",
        },
        {
          key: "roll-calls",
          count: rollCalls.length,
          label: journey("waiting.rollCalls", { count: rollCalls.length }),
          href: `${dashboard}#roll-calls`,
          owner: "you",
        },
        {
          key: "results",
          count: elsewhereOf("results"),
          label: journey("waiting.results", { count: elsewhereOf("results") }),
          href: `${navHref("attendance")}#verifying`,
          owner: "administrator",
        },
      ]),
    },
    {
      ...station("hours"),
      waiting: waitingAt([
        {
          key: "past-events",
          count: elsewhereOf("pastEvent"),
          label: journey("waiting.pastEvents", { count: elsewhereOf("pastEvent") }),
          href: navHref("pastEvents"),
          owner: "administrator",
        },
      ]),
    },
  ] satisfies Parameters<typeof Journey>[0]["stations"];

  const sendOption = (entry: VacancyEntry, describedBy: string): DecisionOption[] => [
    {
      key: "submit",
      label: submit("trigger"),
      variant: "primary",
      fields: {},
      success: submit("success"),
      confirm: { prompt: submit("prompt"), submit: submit("confirm") },
      disabled: entry.missing.length > 0,
      describedBy,
    },
  ];

  const readiness = (entry: VacancyEntry) =>
    entry.missing.length === 0 ? (
      <span className="font-medium text-success-ink">{t("desk.ready")}</span>
    ) : (
      <span className="font-medium text-warning-ink">
        {t("desk.needs", {
          items: entry.missing.map((item) => t(`requirements.${item}`)).join(", "),
        })}
      </span>
    );

  const vacancyRow = (entry: VacancyEntry, section: "returned" | "drafts") => {
    const sideId = `${section}-${entry.vacancy.id}-state`;
    return (
      <WorkItem
        key={entry.vacancy.id}
        lead={lead(entry.receivedAt)}
        title={
          <Link href={vacancyHref(entry.vacancy.id)} className={titleLink}>
            {entry.vacancy.title}
          </Link>
        }
        meta={vocabulary(`regions.${entry.vacancy.region}`)}
        facts={
          <span id={sideId} className="contents">
            <span>
              {section === "returned"
                ? t("returned.when", { when: when(entry.receivedAt) })
                : t("drafts.when", { when: when(entry.receivedAt) })}
            </span>
            {section === "returned" && entry.vacancy.approvalNote ? (
              <span className="text-ink">
                {t("returned.note", { note: entry.vacancy.approvalNote })}
              </span>
            ) : null}
            {readiness(entry)}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={vacancyEditHref(entry.vacancy.id)}
              className={buttonClass({ size: "row", variant: "outline" })}
            >
              {t("desk.edit")}
              <span className="sr-only"> — {entry.vacancy.title}</span>
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <InlineDecision
                action={submitVacancyForApprovalAction}
                hidden={{ id: entry.vacancy.id }}
                subject={entry.vacancy.title}
                labels={labels}
                options={sendOption(entry, sideId)}
              />
            </div>
          </div>
        }
      />
    );
  };

  const administratorScale = Math.max(
    1,
    ...elsewhere.map((item) => waited(item.since, now)?.days ?? 0),
  );

  const allLink = (href: string, label: string) => (
    <Link href={href} className={linkClass}>
      {label}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );

  return (
    <>
      <TodayHeader
        date={today}
        headline={t("headline", { count: waiting })}
        detail={
          waiting === 0
            ? t("headlineClear")
            : oldest
              ? t("headlineOldest", { age: ageLong(oldest) })
              : undefined
        }
        actions={actions}
      />
      {statisticsFailure ? <LoadFailure failure={statisticsFailure} /> : null}
      {unverified ? (
        <StatePanel
          role="status"
          tone="notice"
          title={t("unverified.title")}
          description={t("unverified.description")}
        />
      ) : null}
      <Journey {...journeyCopy} stations={stations} />

      <section
        id="operations"
        aria-labelledby="operations-title"
        className="grid gap-4"
      >
        <header className="flex flex-wrap items-center gap-2">
          <h2 id="operations-title" className="text-section text-ink">
            {t("listTitle")}
          </h2>
          <Count value={waiting} label={t("waitingLabel")} tone="waiting" />
        </header>

        {waiting === 0 ? (
          <div className="sheet">
            <RegisterNote
              title={t("clear.title")}
              description={t("clear.description")}
              action={
                <Link
                  href={navHref("newVacancy")}
                  className={buttonClass({ size: "sm", variant: "outline" })}
                >
                  {t("clear.action")}
                </Link>
              }
            />
          </div>
        ) : (
          <div className="-mb-4 gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {desk.returned.length > 0 ? (
              <WorkCard
                id="returned"
                title={t("returned.title")}
                count={desk.returned.length}
                countLabel={t("returned.countLabel")}
                note={oldestIn(desk.returned.map((entry) => entry.receivedAt))}
              >
                {desk.returned.map((entry) => vacancyRow(entry, "returned"))}
              </WorkCard>
            ) : null}

            {returnedResults.length > 0 ? (
              <WorkCard
                id="returned-results"
                title={t("returnedResults.title")}
                count={returnedResults.length}
                countLabel={t("returnedResults.countLabel")}
                note={oldestIn(returnedResults.map((item) => item.returnedAt))}
              >
                {returnedResults.map((item) => (
                  <WorkItem
                    key={item.vacancy.id}
                    lead={lead(item.returnedAt)}
                    title={
                      <Link
                        href={`${vacancyHref(item.vacancy.id)}?tab=attendance`}
                        className={titleLink}
                      >
                        {item.vacancy.title}
                      </Link>
                    }
                    meta={vocabulary(`regions.${item.vacancy.region}`)}
                    facts={
                      <span>
                        {t("returnedResults.when", { when: when(item.returnedAt) })}
                      </span>
                    }
                    actions={
                      <div className="flex">
                        <Link
                          href={`${vacancyHref(item.vacancy.id)}?tab=attendance`}
                          className={buttonClass({ size: "row" })}
                        >
                          {t("returnedResults.open")}
                          <span className="sr-only"> — {item.vacancy.title}</span>
                        </Link>
                      </div>
                    }
                  />
                ))}
              </WorkCard>
            ) : null}

            {decide.length > 0 ? (
              <WorkCard
                id="decide"
                title={t("decide.title")}
                count={waitingApplications}
                countLabel={t("decide.countLabel")}
                note={oldestIn(decide.map((group) => group.oldestAt))}
                footer={allLink(navHref("vacancies"), t("decide.all"))}
              >
                {decide.map((group) => (
                  <WorkItem
                    key={group.vacancyId}
                    lead={lead(group.oldestAt)}
                    title={
                      <Link href={vacancyHref(group.vacancyId)} className={titleLink}>
                        {group.title}
                      </Link>
                    }
                    meta={
                      group.vacancy
                        ? vocabulary(`regions.${group.vacancy.region}`)
                        : undefined
                    }
                    facts={
                      <>
                        <span className="font-medium text-ink">
                          {t("decide.waiting", { count: group.waiting })}
                        </span>
                        <span>
                          {t("decide.oldest", { when: when(group.oldestAt) })}
                        </span>
                        {group.staged > 0 ? (
                          <span className="text-primary-ink">
                            {t("decide.staged", { count: group.staged })}
                          </span>
                        ) : null}
                      </>
                    }
                    actions={
                      <div className="flex">
                        <Link
                          href={`${vacancyHref(group.vacancyId)}?tab=applications`}
                          className={buttonClass({ size: "row" })}
                        >
                          {t("decide.review")}
                          <span className="sr-only"> — {group.title}</span>
                        </Link>
                      </div>
                    }
                  />
                ))}
              </WorkCard>
            ) : null}

            {rollCalls.length > 0 ? (
              <WorkCard
                id="roll-calls"
                title={t("rollCalls.title")}
                count={rollCalls.length}
                countLabel={t("rollCalls.countLabel")}
                note={oldestIn(rollCalls.map((call) => call.endedAt))}
              >
                {rollCalls.map((call) => (
                  <WorkItem
                    key={call.vacancyId}
                    lead={lead(call.endedAt)}
                    title={
                      <Link href={vacancyHref(call.vacancyId)} className={titleLink}>
                        {call.title}
                      </Link>
                    }
                    meta={
                      call.endedAt
                        ? t("rollCalls.ended", { when: when(call.endedAt) })
                        : undefined
                    }
                    facts={
                      <>
                        {call.awaiting > 0 ? (
                          <span className="font-medium text-ink">
                            {t("rollCalls.waiting", { count: call.awaiting })}
                          </span>
                        ) : (
                          <span className="font-medium text-success-ink">
                            {t("rollCalls.ready")}
                          </span>
                        )}
                        {call.drafted + call.resolved > 0 ? (
                          <span>
                            {t("rollCalls.resolved", {
                              count: call.drafted + call.resolved,
                            })}
                          </span>
                        ) : null}
                      </>
                    }
                    actions={
                      <div className="flex">
                        <Link
                          href={`${vacancyHref(call.vacancyId)}?tab=attendance`}
                          className={buttonClass({ size: "row" })}
                        >
                          {call.awaiting > 0
                            ? t("rollCalls.open")
                            : t("rollCalls.finish")}
                          <span className="sr-only"> — {call.title}</span>
                        </Link>
                      </div>
                    }
                  />
                ))}
              </WorkCard>
            ) : null}

            {desk.drafts.length > 0 ? (
              <WorkCard
                id="drafts"
                title={t("drafts.title")}
                count={desk.drafts.length}
                countLabel={t("drafts.countLabel")}
                note={oldestIn(desk.drafts.map((entry) => entry.receivedAt))}
              >
                {desk.drafts.map((entry) => vacancyRow(entry, "drafts"))}
              </WorkCard>
            ) : null}
          </div>
        )}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Register
          id="with-administrator"
          title={t("withAdmin.title")}
          count={elsewhere.length}
          countLabel={t("withAdmin.countLabel")}
          description={t("withAdmin.description")}
        >
          {elsewhere.length === 0 ? (
            <RegisterNote title={t("withAdmin.empty")} />
          ) : (
            <ol className="divide-y divide-border">
              {elsewhere.slice(0, ADMINISTRATOR_ROWS).map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 px-5 py-3.5"
                >
                  {lead(item.since, administratorScale)}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold break-words text-ink">
                      <Link href={administratorHref(item)} className={titleLink}>
                        {item.title}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                      {t(`withAdmin.kind.${item.kind}`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {elsewhere.length > ADMINISTRATOR_ROWS ? (
            <p className="border-t border-border px-5 py-2.5 text-[0.8125rem] text-ink-muted">
              {t("withAdmin.more", { count: elsewhere.length - ADMINISTRATOR_ROWS })}
            </p>
          ) : null}
        </Register>

        <ClearedToday cleared={cleared} />
      </div>

      <RecentActivity
        recent={recent}
        directory={directory}
        now={now}
        href={navHref("activity")}
        showActor={false}
      />
    </>
  );
}
