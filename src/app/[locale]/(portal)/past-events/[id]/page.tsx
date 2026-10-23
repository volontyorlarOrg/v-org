import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddParticipantsForm } from "@/components/participants/add-participants-form";
import { WithdrawRequestDialog } from "@/components/participants/past-event-dialogs";
import { RequestList } from "@/components/participants/request-list";
import { StatusBadge } from "@/components/portal/status-badge";
import { Register } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { failureOf, isReady } from "@/lib/api/load";
import { cancelPastEventRequestAction } from "@/lib/participants/actions";
import {
  pastEventDialogLabels,
  requestListLabels,
} from "@/lib/participants/labels.server";
import { waitingFirst } from "@/lib/participants/requests";
import { loadPastEventRoster } from "@/lib/past-event-rosters/data.server";
import { addParticipantsLabels } from "@/lib/past-event-rosters/labels.server";
import { ROSTER_LIMIT } from "@/lib/past-event-rosters/roster";
import {
  countsOf,
  PAST_EVENT_STATE_TONES,
  pastEventState,
} from "@/lib/past-event-rosters/state";
import { navHref } from "@/lib/routing/routes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/past-events/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "historicalEvents" });
  return { title: t("record") };
}

export default async function PastEventPage({
  params,
}: PageProps<"/[locale]/past-events/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [t, format, loaded, labels, dialogs, addLabels] = await Promise.all([
    getTranslations("historicalEvents"),
    getFormatter(),
    loadPastEventRoster(id),
    requestListLabels(),
    pastEventDialogLabels(),
    addParticipantsLabels(),
  ]);
  if (loaded.state === "missing") notFound();
  const back = { href: navHref("pastEvents"), label: t("title") };
  const failure = failureOf(loaded);
  if (failure)
    return (
      <>
        <PageHeader back={back} title={t("record")} />
        <LoadFailure failure={failure} />
      </>
    );
  if (!isReady(loaded)) notFound();
  const event = loaded.data;
  const counts = countsOf(event.requests);
  const state = pastEventState(counts);
  return (
    <>
      <PageHeader
        title={event.title}
        back={back}
        description={t("published")}
        meta={
          <>
            <span className="tabular">
              {format.dateTime(new Date(`${event.eventDate}T00:00:00Z`), "date")} ·{" "}
              {t("people", { count: event.requests.length })}
            </span>
            <StatusBadge
              label={t(`state.${state}`, { count: counts.pending })}
              tone={PAST_EVENT_STATE_TONES[state]}
            />
          </>
        }
      />
      {event.note ? (
        <Register id="historical-event-note" title={t("noteTitle")}>
          <p className="px-5 py-4 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">
            {event.note}
          </p>
        </Register>
      ) : null}
      <Register
        id="historical-event-people"
        title={t("form.participants")}
        count={event.requests.length}
        description={t("eventHelp")}
      >
        <RequestList
          requests={waitingFirst(event.requests)}
          labels={labels}
          inEvent
          action={(request) =>
            request.status === "pending" ? (
              <WithdrawRequestDialog
                requestId={request.id}
                action={cancelPastEventRequestAction}
                labels={dialogs}
              />
            ) : null
          }
        />
      </Register>
      {event.requests.length < ROSTER_LIMIT ? (
        <AddParticipantsForm
          rosterId={event.id}
          taken={event.requests.map((request) => request.volunteer.id)}
          labels={addLabels}
        />
      ) : null}
    </>
  );
}
