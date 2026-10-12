import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  PastEventProposalDialog,
  PastEventRemovalDialog,
  WithdrawRequestDialog,
} from "@/components/participants/past-event-dialogs";
import { RequestList } from "@/components/participants/request-list";
import { StatusBadge } from "@/components/portal/status-badge";
import { FigureRow } from "@/components/register/facts";
import { Register, RegisterNote } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { failureOf, isReady } from "@/lib/api/load";
import {
  cancelPastEventRequestAction,
  proposePastEventAction,
  proposePastEventChangeAction,
  proposePastEventRemovalAction,
} from "@/lib/participants/actions";
import { loadParticipant } from "@/lib/participants/data.server";
import { yesterdayInTashkent } from "@/lib/participants/input";
import {
  pastEventDialogLabels,
  requestListLabels,
} from "@/lib/participants/labels.server";
import { waitingFirst } from "@/lib/participants/requests";
import { navHref } from "@/lib/routing/routes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/participants/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "participants" });
  return { title: t("record") };
}

export default async function ParticipantPage({
  params,
}: PageProps<"/[locale]/participants/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, common, format, loaded, listLabels, dialogLabels] = await Promise.all([
    getTranslations("participants"),
    getTranslations("common"),
    getFormatter(),
    loadParticipant(id),
    requestListLabels(),
    pastEventDialogLabels(),
  ]);
  const back = { href: navHref("participants"), label: t("title") };
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

  const participant = loaded.data;
  const latestDate = yesterdayInTashkent();
  const day = (date: string) =>
    format.dateTime(new Date(`${date.slice(0, 10)}T00:00:00Z`), "date");
  const facts = (hours: number | null, xp: number, credited = true) =>
    [
      hours === null ? null : t("facts.hours", { value: format.number(hours) }),
      credited ? t("facts.xp", { value: format.number(xp) }) : null,
    ]
      .filter((fact): fact is string => fact !== null)
      .join(" · ");

  return (
    <>
      <PageHeader
        back={back}
        title={participant.displayName ?? common("notSet")}
        meta={participant.username ? <span>@{participant.username}</span> : null}
      />

      <FigureRow
        className="sm:grid-cols-4 xl:grid-cols-4"
        items={[
          {
            label: t("figures.attended"),
            value: format.number(participant.participation.attendedEvents),
            tone: "person",
          },
          {
            label: t("figures.hours"),
            value: format.number(participant.participation.attendedHours),
            tone: "person",
          },
          {
            label: t("figures.pastEvents"),
            value: format.number(participant.participation.pastEvents),
          },
          {
            label: t("figures.waiting"),
            value: format.number(participant.pendingRequests),
          },
        ]}
      />

      <Register
        id="past-events"
        title={t("pastEvents.title")}
        count={participant.pastEvents.length}
        countLabel={t("pastEvents.countLabel")}
        description={t("pastEvents.description")}
        actions={
          <PastEventProposalDialog
            participantId={participant.id}
            latestDate={latestDate}
            action={proposePastEventAction}
            labels={dialogLabels}
          />
        }
      >
        {participant.pastEvents.length === 0 ? (
          <RegisterNote title={t("pastEvents.empty")} />
        ) : (
          <ul className="divide-y divide-border">
            {participant.pastEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold [overflow-wrap:anywhere] text-ink">
                    {event.title}
                  </p>
                  <p className="tabular text-sm text-ink-muted">
                    {day(event.eventDate)} ·{" "}
                    {facts(event.hours, event.xpAwarded, event.countsTowardProgress)}
                    {event.countsTowardProgress
                      ? null
                      : ` · ${t("pastEvents.notCounted")}`}
                  </p>
                </div>
                {event.pendingRequestId ? (
                  <StatusBadge label={t("pastEvents.waiting")} tone="waiting" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <PastEventProposalDialog
                      participantId={participant.id}
                      event={event}
                      latestDate={latestDate}
                      action={proposePastEventChangeAction}
                      labels={dialogLabels}
                    />
                    <PastEventRemovalDialog
                      eventId={event.id}
                      action={proposePastEventRemovalAction}
                      labels={dialogLabels}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Register>

      <Register
        id="attended"
        title={t("attended.title")}
        count={participant.attended.length}
        countLabel={t("attended.countLabel")}
        description={t("attended.description")}
      >
        {participant.attended.length === 0 ? (
          <RegisterNote title={t("attended.empty")} />
        ) : (
          <ul className="divide-y divide-border">
            {participant.attended.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-3.5"
              >
                <p className="min-w-0 flex-1 basis-56 font-semibold [overflow-wrap:anywhere] text-ink">
                  {record.title}
                </p>
                <p className="tabular text-sm text-ink-muted">
                  {day(record.eventDate)} · {facts(record.hours, record.xpAwarded)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Register>

      {participant.requests.length > 0 ? (
        <Register
          id="requests"
          title={t("requests.title")}
          count={participant.requests.length}
          countLabel={t("requests.countLabel")}
          description={t("requests.description")}
        >
          <RequestList
            requests={waitingFirst(participant.requests)}
            labels={listLabels}
            action={(request) =>
              request.status === "pending" ? (
                <WithdrawRequestDialog
                  requestId={request.id}
                  action={cancelPastEventRequestAction}
                  labels={dialogLabels}
                />
              ) : null
            }
          />
        </Register>
      ) : null}
    </>
  );
}
