import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/portal/status-badge";
import { Register, RegisterNote, RegisterSearch } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { Pagination } from "@/components/states/pagination";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import { loadPastEventRosters } from "@/lib/past-event-rosters/data.server";
import { PAST_EVENT_STATE_TONES, pastEventState } from "@/lib/past-event-rosters/state";
import { navHref, pastEventRosterHref } from "@/lib/routing/routes";
import {
  DEFAULT_PAGE_SIZE,
  hrefWith,
  readPage,
  readParam,
} from "@/lib/routing/search-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/past-events">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "historicalEvents" });
  return { title: t("title") };
}

export default async function PastEventsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/past-events">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const q = readParam(query, "q");
  const [t, common, format, loaded] = await Promise.all([
    getTranslations("historicalEvents"),
    getTranslations("common"),
    getFormatter(),
    loadPastEventRosters({ q, page: readPage(query), pageSize: DEFAULT_PAGE_SIZE }),
  ]);
  const failure = failureOf(loaded);
  const path = navHref("pastEvents");
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild size="sm">
            <Link href={navHref("newPastEvent")}>{t("create")}</Link>
          </Button>
        }
      />
      {failure ? <LoadFailure failure={failure} /> : null}
      {isReady(loaded) ? (
        <Register
          id="historical-events"
          title={t("listTitle")}
          count={loaded.data.total}
          toolbar={
            <RegisterSearch
              action={`/${locale}${path}`}
              label={t("search")}
              submitLabel={common("search")}
              value={q}
            />
          }
        >
          {loaded.data.items.length === 0 ? (
            <RegisterNote
              title={q ? t("noMatches") : t("empty")}
              description={t("emptyHelp")}
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {loaded.data.items.map((event) => {
                  const state = pastEventState(event);
                  return (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1 basis-64">
                        <Link
                          href={pastEventRosterHref(event.id)}
                          className="font-semibold [overflow-wrap:anywhere] text-primary-ink underline-offset-4 hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="tabular mt-1 text-sm text-ink-muted">
                          {format.dateTime(
                            new Date(`${event.eventDate}T00:00:00Z`),
                            "date",
                          )}{" "}
                          · {t("people", { count: event.participants })}
                        </p>
                      </div>
                      <StatusBadge
                        label={t(`state.${state}`, { count: event.pending })}
                        tone={PAST_EVENT_STATE_TONES[state]}
                      />
                    </li>
                  );
                })}
              </ul>
              <Pagination
                framed
                state={loaded.data}
                hrefFor={(page) => hrefWith(path, { q, page })}
              />
            </>
          )}
        </Register>
      ) : null}
    </>
  );
}
