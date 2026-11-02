import { ArrowRight } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ClearedToday } from "@/components/dashboard/cleared-today";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  QUEUE_ACTIONS,
  QueueMain,
  QueueRow,
  QueueSection,
  QueueSide,
} from "@/components/queue/queue";
import {
  InlineDecision,
  type DecisionOption,
} from "@/components/register/inline-decision";
import { Register, RegisterNote } from "@/components/register/register";
import { Seal } from "@/components/register/seal";
import { LoadFailure } from "@/components/states/load-failure";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { loadRecentActivity } from "@/lib/activity/data.server";
import { dataOr, firstFailure, isReady } from "@/lib/api/load";
import { loadApplications } from "@/lib/applications/data.server";
import { loadAuditDirectory } from "@/lib/audit/directory.server";
import { getSession } from "@/lib/auth/session.server";
import { sealDate } from "@/lib/datetime";
import { loadPastEventRosters } from "@/lib/past-event-rosters/data.server";
import {
  applicationsByVacancy,
  applicationsToDecide,
  clearedToday,
  resultsReturned,
  rollCallsDue,
  staffDesk,
  withAdministrator,
  type VacancyEntry,
} from "@/lib/queue/dashboard";
import { decisionLabels } from "@/lib/queue/decisions.server";
import { MAX_PAGE_SIZE } from "@/lib/routing/search-params";
import { navHref, vacancyEditHref, vacancyHref } from "@/lib/routing/routes";
import { submitVacancyForApprovalAction } from "@/lib/vacancies/actions";
import { loadOrganizations, loadVacancies } from "@/lib/vacancies/data.server";

const ACTIVITY_ROWS = 8;

const linkClass =
  "inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline";

export async function DashboardDesk() {
  const [t, submit, seal, vocabulary, nav, format, session] = await Promise.all([
    getTranslations("desk"),
    getTranslations("vacancies.submit"),
    getTranslations("seal"),
    getTranslations("vocabulary"),
    getTranslations("nav"),
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

  if (failure || !isReady(vacancies) || !isReady(applications)) {
    return failure ? <LoadFailure failure={failure} /> : null;
  }

  const desk = staffDesk(vacancies.data, dataOr(organizations, []), now);
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
  const elsewhereCount = elsewhere.vacancies + elsewhere.results + elsewhere.pastEvents;

  const waiting =
    desk.returned.length +
    returnedResults.length +
    desk.drafts.length +
    decide.length +
    rollCalls.length;

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
      <span className="font-medium text-primary-ink">{t("desk.ready")}</span>
    ) : (
      <span className="font-medium text-danger-ink">
        {t("desk.needs", {
          items: entry.missing.map((item) => t(`requirements.${item}`)).join(", "),
        })}
      </span>
    );

  const vacancyRow = (
    entry: VacancyEntry,
    index: number,
    section: "returned" | "drafts",
  ) => {
    const sideId = `${section}-${entry.vacancy.id}-state`;
    return (
      <QueueRow key={entry.vacancy.id} number={index + 1} numberLabel={t("number")}>
        <QueueMain
          title={
            <Link
              href={vacancyHref(entry.vacancy.id)}
              className="hover:text-primary-ink hover:underline"
            >
              {entry.vacancy.title}
            </Link>
          }
          meta={[
            entry.organization?.name,
            vocabulary(`regions.${entry.vacancy.region}`),
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <QueueSide id={sideId}>
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
        </QueueSide>
        <div className={`flex flex-wrap items-center gap-2 ${QUEUE_ACTIONS}`}>
          <Link
            href={vacancyEditHref(entry.vacancy.id)}
            className={buttonClass({ size: "row", variant: "outline" })}
          >
            {t("desk.edit")}
            <span className="sr-only"> — {entry.vacancy.title}</span>
          </Link>
          <InlineDecision
            action={submitVacancyForApprovalAction}
            hidden={{ id: entry.vacancy.id }}
            subject={entry.vacancy.title}
            labels={labels}
            options={sendOption(entry, sideId)}
          />
        </div>
      </QueueRow>
    );
  };

  const elsewhereRows = [
    {
      key: "vacancies",
      count: elsewhere.vacancies,
      href: `${navHref("vacancies")}?state=pending_review`,
    },
    { key: "results", count: elsewhere.results, href: navHref("attendance") },
    { key: "pastEvents", count: elsewhere.pastEvents, href: navHref("pastEvents") },
  ].filter((row) => row.count > 0);

  return (
    <>
      <Register
        id="operations"
        title={t("listTitle")}
        description={t("dateline", {
          date: format.dateTime(now, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          count: waiting,
        })}
        actions={
          <Link
            href={navHref("attendance")}
            className={buttonClass({ size: "sm", variant: "outline" })}
          >
            {nav("attendance")}
          </Link>
        }
        count={waiting}
        countLabel={t("waitingLabel")}
        countTone="waiting"
      >
        {waiting === 0 ? (
          <RegisterNote
            title={t("clear.title")}
            description={t("clear.description")}
            action={
              <Seal
                word={seal("clear")}
                date={sealDate(now)}
                issuer={seal("issuer")}
                label={seal("label", { word: seal("clear"), date: sealDate(now) })}
                tone="neutral"
                size={72}
              />
            }
          />
        ) : null}

        {desk.returned.length > 0 ? (
          <QueueSection
            id="returned"
            title={t("returned.title")}
            count={desk.returned.length}
            countLabel={t("returned.countLabel")}
          >
            {desk.returned.map((entry, index) => vacancyRow(entry, index, "returned"))}
          </QueueSection>
        ) : null}

        {returnedResults.length > 0 ? (
          <QueueSection
            id="returned-results"
            title={t("returnedResults.title")}
            count={returnedResults.length}
            countLabel={t("returnedResults.countLabel")}
          >
            {returnedResults.map((item, index) => (
              <QueueRow
                key={item.vacancy.id}
                number={index + 1}
                numberLabel={t("number")}
              >
                <QueueMain
                  title={
                    <Link
                      href={`${vacancyHref(item.vacancy.id)}?tab=attendance`}
                      className="hover:text-primary-ink hover:underline"
                    >
                      {item.vacancy.title}
                    </Link>
                  }
                  meta={vocabulary(`regions.${item.vacancy.region}`)}
                />
                <QueueSide>
                  <span>
                    {t("returnedResults.when", { when: when(item.returnedAt) })}
                  </span>
                </QueueSide>
                <div className={`flex ${QUEUE_ACTIONS}`}>
                  <Link
                    href={`${vacancyHref(item.vacancy.id)}?tab=attendance`}
                    className={buttonClass({ size: "row" })}
                  >
                    {t("returnedResults.open")}
                    <span className="sr-only"> — {item.vacancy.title}</span>
                  </Link>
                </div>
              </QueueRow>
            ))}
          </QueueSection>
        ) : null}

        {desk.drafts.length > 0 ? (
          <QueueSection
            id="drafts"
            title={t("drafts.title")}
            count={desk.drafts.length}
            countLabel={t("drafts.countLabel")}
          >
            {desk.drafts.map((entry, index) => vacancyRow(entry, index, "drafts"))}
          </QueueSection>
        ) : null}

        {decide.length > 0 ? (
          <QueueSection
            id="decide"
            title={t("decide.title")}
            count={decide.reduce((sum, group) => sum + group.waiting, 0)}
            countLabel={t("decide.countLabel")}
            action={
              <Link
                href={`${navHref("applications")}?view=waiting`}
                className={linkClass}
              >
                {t("decide.all")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          >
            {decide.map((group, index) => (
              <QueueRow
                key={group.vacancyId}
                number={index + 1}
                numberLabel={t("number")}
              >
                <QueueMain
                  title={
                    <Link
                      href={vacancyHref(group.vacancyId)}
                      className="hover:text-primary-ink hover:underline"
                    >
                      {group.title}
                    </Link>
                  }
                  meta={
                    group.vacancy
                      ? vocabulary(`regions.${group.vacancy.region}`)
                      : undefined
                  }
                />
                <QueueSide>
                  <span className="font-medium text-ink">
                    {t("decide.waiting", { count: group.waiting })}
                  </span>
                  <span>{t("decide.oldest", { when: when(group.oldestAt) })}</span>
                  {group.staged > 0 ? (
                    <span className="text-accent-ink">
                      {t("decide.staged", { count: group.staged })}
                    </span>
                  ) : null}
                </QueueSide>
                <div className={`flex ${QUEUE_ACTIONS}`}>
                  <Link
                    href={`${vacancyHref(group.vacancyId)}?tab=applications`}
                    className={buttonClass({ size: "row", variant: "outline" })}
                  >
                    {t("decide.review")}
                    <span className="sr-only"> — {group.title}</span>
                  </Link>
                </div>
              </QueueRow>
            ))}
          </QueueSection>
        ) : null}

        {rollCalls.length > 0 ? (
          <QueueSection
            id="roll-calls"
            title={t("rollCalls.title")}
            count={rollCalls.length}
            countLabel={t("rollCalls.countLabel")}
          >
            {rollCalls.map((call, index) => (
              <QueueRow
                key={call.vacancyId}
                number={index + 1}
                numberLabel={t("number")}
              >
                <QueueMain
                  title={
                    <Link
                      href={vacancyHref(call.vacancyId)}
                      className="hover:text-primary-ink hover:underline"
                    >
                      {call.title}
                    </Link>
                  }
                  meta={
                    call.endedAt
                      ? t("rollCalls.ended", { when: when(call.endedAt) })
                      : undefined
                  }
                />
                <QueueSide>
                  <span className="font-medium text-ink">
                    {t("rollCalls.waiting", { count: call.awaiting })}
                  </span>
                  {call.resolved > 0 ? (
                    <span>{t("rollCalls.resolved", { count: call.resolved })}</span>
                  ) : null}
                </QueueSide>
                <div className={`flex ${QUEUE_ACTIONS}`}>
                  <Link
                    href={`${vacancyHref(call.vacancyId)}?tab=attendance`}
                    className={buttonClass({ size: "row" })}
                  >
                    {t("rollCalls.open")}
                    <span className="sr-only"> — {call.title}</span>
                  </Link>
                </div>
              </QueueRow>
            ))}
          </QueueSection>
        ) : null}
      </Register>

      {elsewhereCount > 0 ? (
        <Register
          id="with-administrator"
          title={t("withAdmin.title")}
          count={elsewhereCount}
          countLabel={t("withAdmin.countLabel")}
          description={t("withAdmin.description")}
        >
          <ul className="divide-y divide-border">
            {elsewhereRows.map((row) => {
              const line = t(`withAdmin.${row.key}`, { count: row.count });
              return (
                <li
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm"
                >
                  <span className="text-ink">{line}</span>
                  <Link href={row.href} className={linkClass}>
                    {t("withAdmin.open")}
                    <span className="sr-only"> — {line}</span>
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Register>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <RecentActivity
          recent={recent}
          directory={directory}
          now={now}
          href={navHref("activity")}
          showActor={false}
        />
        <ClearedToday cleared={cleared} now={now} />
      </div>
    </>
  );
}
