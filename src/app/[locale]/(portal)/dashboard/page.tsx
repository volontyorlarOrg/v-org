import { ArrowRight } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Avatar } from "@/components/portal/avatar";
import {
  QUEUE_ACTIONS,
  QUEUE_EXPAND,
  QueueMain,
  QueueRow,
  QueueSection,
  QueueSide,
} from "@/components/queue/queue";
import { Totals } from "@/components/register/facts";
import {
  InlineDecision,
  type DecisionOption,
} from "@/components/register/inline-decision";
import { Register, RegisterNote } from "@/components/register/register";
import { Seal, type SealTone } from "@/components/register/seal";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import { reviewApplicationAction } from "@/lib/applications/actions";
import { loadApplications } from "@/lib/applications/data.server";
import { volunteerNameOf } from "@/lib/applications/filters";
import { getSession } from "@/lib/auth/session.server";
import { sealDate } from "@/lib/datetime";
import { applicationDecisions, decisionLabels } from "@/lib/queue/decisions.server";
import {
  applicationsToDecide,
  clearedToday,
  isFresh,
  rollCallsDue,
  staffDesk,
  type Cleared,
  type VacancyEntry,
} from "@/lib/queue/today";
import {
  applicationHref,
  navHref,
  vacancyEditHref,
  vacancyHref,
} from "@/lib/routing/routes";
import { loadStatistics } from "@/lib/statistics/data.server";
import { submitVacancyForApprovalAction } from "@/lib/vacancies/actions";
import { loadOrganizations, loadVacancies } from "@/lib/vacancies/data.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "today" });
  return { title: t("title") };
}

export default async function TodayPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, submit, seal, vocabulary, format, session] = await Promise.all([
    getTranslations("today"),
    getTranslations("vacancies.submit"),
    getTranslations("seal"),
    getTranslations("vocabulary"),
    getFormatter(),
    getSession(),
  ]);

  const [vacancies, applications, organizations, statistics] = await Promise.all([
    loadVacancies(),
    loadApplications(),
    loadOrganizations(),
    loadStatistics(),
  ]);

  const now = new Date();
  const failure = failureOf(vacancies) ?? failureOf(applications);

  if (failure || !isReady(vacancies) || !isReady(applications)) {
    return (
      <>
        <PageHeader title={t("title")} />
        {failure ? <LoadFailure failure={failure} /> : null}
      </>
    );
  }

  const organizationRows = isReady(organizations) ? organizations.data : [];
  const desk = staffDesk(vacancies.data, organizationRows, now);
  const decide = applicationsToDecide(applications.data, vacancies.data);
  const rollCalls = rollCallsDue(applications.data, vacancies.data, now);
  const waiting =
    desk.returned.length + desk.drafts.length + decide.length + rollCalls.length;
  const cleared = session
    ? clearedToday({
        vacancies: vacancies.data,
        applications: applications.data,
        me: session.userId,
        now,
      })
    : [];

  const [labels, applicationOptions] = await Promise.all([
    decisionLabels(),
    applicationDecisions(),
  ]);

  const when = (value: string | undefined) =>
    value ? format.relativeTime(new Date(value), now) : "";
  const totals = isReady(statistics) ? statistics.data.totals : null;
  const issuer = seal("issuer");
  const figure = (chunks: ReactNode) => (
    <span className="display-face tabular text-lg text-ink">{chunks}</span>
  );
  const earned = (chunks: ReactNode) => (
    <span className="display-face tabular text-lg text-accent-ink">{chunks}</span>
  );

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

  const clearedSeal = (item: Cleared): { word: string; tone: SealTone } => {
    if (item.kind === "rollCall") return { word: seal("recorded"), tone: "person" };
    if (item.kind === "vacancy") {
      return item.decision === "approved"
        ? { word: seal("approved"), tone: "institution" }
        : item.decision === "rejected"
          ? { word: seal("rejected"), tone: "neutral" }
          : { word: seal("returned"), tone: "neutral" };
    }
    return item.decision === "accepted"
      ? { word: seal("accepted"), tone: "person" }
      : item.decision === "closed"
        ? { word: seal("closed"), tone: "neutral" }
        : { word: seal("rejected"), tone: "neutral" };
  };

  const vacancyRow = (entry: VacancyEntry, index: number, section: string) => {
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

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("dateline", {
          date: format.dateTime(now, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          count: waiting,
        })}
      />

      <Register
        id="waiting"
        title={t("listTitle")}
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
                issuer={issuer}
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
            count={decide.length}
            countLabel={t("decide.countLabel")}
            action={
              <Link
                href={`${navHref("applications")}?view=waiting`}
                className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline"
              >
                {t("decide.all")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          >
            {decide.slice(0, 12).map((entry, index) => {
              const name = volunteerNameOf(entry.application) || t("decide.unnamed");
              return (
                <QueueRow
                  key={entry.application.id}
                  number={index + 1}
                  numberLabel={t("number")}
                >
                  <QueueMain
                    lead={
                      <Avatar
                        name={name}
                        src={entry.application.volunteer?.avatarUrl}
                        person
                      />
                    }
                    title={
                      <Link
                        href={applicationHref(entry.application.id)}
                        className="hover:text-primary-ink hover:underline"
                      >
                        {name}
                      </Link>
                    }
                    meta={entry.vacancy?.title ?? entry.application.opportunity?.title}
                  />
                  <QueueSide>
                    <span>
                      {t("decide.sent", {
                        when: when(
                          entry.application.submittedAt ?? entry.application.createdAt,
                        ),
                      })}
                    </span>
                    <span className="flex flex-wrap gap-x-3">
                      {entry.application.essay ? (
                        <span className="text-ink">{t("decide.essay")}</span>
                      ) : null}
                      {entry.application.status === "under_review" ? (
                        <span className="text-primary-ink">{t("decide.looking")}</span>
                      ) : null}
                    </span>
                  </QueueSide>
                  <InlineDecision
                    action={reviewApplicationAction}
                    hidden={{ id: entry.application.id }}
                    subject={name}
                    labels={labels}
                    options={applicationOptions({
                      name,
                      status: entry.application.status,
                    })}
                    className={QUEUE_ACTIONS}
                    expandClassName={QUEUE_EXPAND}
                  />
                </QueueRow>
              );
            })}
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
                      ? t("rollCalls.ended", {
                          when: format.relativeTime(call.endedAt, now),
                        })
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
                    href={`${vacancyHref(call.vacancyId)}#roll-call`}
                    className={buttonClass({ size: "row" })}
                  >
                    {t("rollCalls.open")}
                  </Link>
                </div>
              </QueueRow>
            ))}
          </QueueSection>
        ) : null}

        {desk.inReview > 0 ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-3.5 text-sm text-ink-muted">
            <span>{t("inReview.line", { count: desk.inReview })}</span>
            <Link
              href={`${navHref("vacancies")}?state=pending_review`}
              className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary-ink hover:underline"
            >
              {t("inReview.open")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </p>
        ) : null}
      </Register>

      {cleared.length > 0 ? (
        <Register
          id="cleared"
          title={t("cleared.title")}
          count={cleared.length}
          countLabel={t("cleared.countLabel")}
        >
          <ol className="divide-y divide-border">
            {cleared.map((item) => {
              const mark = clearedSeal(item);
              const date = sealDate(item.at);
              const fresh = isFresh(item.at, now);
              const key =
                item.kind === "vacancy"
                  ? `vacancy-${item.vacancy.id}`
                  : item.kind === "application"
                    ? `application-${item.application.id}`
                    : `roll-${item.vacancyId}`;
              return (
                <li key={key} className="flex items-center gap-4 px-5 py-3">
                  <Seal
                    word={mark.word}
                    date={date}
                    issuer={issuer}
                    tone={mark.tone}
                    fresh={fresh}
                    size={44}
                    label={seal("label", { word: mark.word, date })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold break-words text-ink">
                      {item.kind === "vacancy" ? (
                        <Link
                          href={vacancyHref(item.vacancy.id)}
                          className="hover:text-primary-ink hover:underline"
                        >
                          {item.vacancy.title}
                        </Link>
                      ) : item.kind === "application" ? (
                        <Link
                          href={applicationHref(item.application.id)}
                          className="hover:text-primary-ink hover:underline"
                        >
                          {volunteerNameOf(item.application) || t("decide.unnamed")}
                        </Link>
                      ) : (
                        <Link
                          href={vacancyHref(item.vacancyId)}
                          className="hover:text-primary-ink hover:underline"
                        >
                          {item.title}
                        </Link>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {item.kind === "vacancy"
                        ? t(`cleared.vacancy.${item.decision}`)
                        : item.kind === "application"
                          ? t("cleared.application", {
                              decision: t(`cleared.decision.${item.decision}`),
                              vacancy: item.application.opportunity?.title ?? "",
                            })
                          : t("cleared.rollCall", {
                              attended: item.attended,
                              other: item.other,
                            })}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-sm text-ink-muted">
                    {format.dateTime(new Date(item.at), "time")}
                  </span>
                </li>
              );
            })}
          </ol>
        </Register>
      ) : null}

      {totals ? (
        <Totals
          id="operation"
          title={t("operation.title")}
          items={[
            {
              key: "live",
              value: t.rich("operation.line.live", {
                count: totals.publishedVacancies,
                n: figure,
              }),
            },
            {
              key: "applications",
              value: t.rich("operation.line.applications", {
                count: totals.applications,
                n: figure,
              }),
            },
            {
              key: "accepted",
              value: t.rich("operation.line.accepted", {
                count: totals.accepted,
                n: figure,
              }),
            },
            {
              key: "attended",
              value: t.rich("operation.line.attended", {
                count: totals.attended,
                n: figure,
              }),
            },
            {
              key: "hours",
              value: t.rich("operation.line.hours", {
                count: totals.confirmedHours,
                n: earned,
              }),
            },
          ]}
        />
      ) : null}
    </>
  );
}
