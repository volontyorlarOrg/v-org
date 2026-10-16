import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WithdrawRequestDialog } from "@/components/participants/past-event-dialogs";
import { RequestList } from "@/components/participants/request-list";
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
  const [t, format, loaded, labels, dialogs] = await Promise.all([
    getTranslations("historicalEvents"),
    getFormatter(),
    loadPastEventRoster(id),
    requestListLabels(),
    pastEventDialogLabels(),
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
  return (
    <>
      <PageHeader
        title={event.title}
        back={back}
        description={t("description")}
        meta={
          <span className="tabular">
            {format.dateTime(new Date(`${event.eventDate}T00:00:00Z`), "date")} ·{" "}
            {t("people", { count: event.requests.length })}
          </span>
        }
      />
      {event.note ? (
        <Register id="historical-event-note" title={t("form.note")}>
          <p className="px-5 py-4 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">
            {event.note}
          </p>
        </Register>
      ) : null}
      <Register
        id="historical-event-people"
        title={t("form.participants")}
        count={event.requests.length}
        description={t("form.reviewHelp")}
      >
        <RequestList
          requests={waitingFirst(event.requests)}
          labels={labels}
          showVolunteer
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
    </>
  );
}
