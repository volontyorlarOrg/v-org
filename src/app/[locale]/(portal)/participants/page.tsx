import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { WithdrawRequestDialog } from "@/components/participants/past-event-dialogs";
import { RequestList } from "@/components/participants/request-list";
import { Avatar } from "@/components/portal/avatar";
import { Register, RegisterNote, RegisterSearch } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { Pagination } from "@/components/states/pagination";
import { Button } from "@/components/ui/button";
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
import { cancelPastEventRequestAction } from "@/lib/participants/actions";
import {
  loadParticipants,
  loadPastEventRequests,
} from "@/lib/participants/data.server";
import {
  pastEventDialogLabels,
  requestListLabels,
} from "@/lib/participants/labels.server";
import { waitingFirst } from "@/lib/participants/requests";
import { navHref, participantHref } from "@/lib/routing/routes";
import {
  DEFAULT_PAGE_SIZE,
  hrefWith,
  readPage,
  readParam,
} from "@/lib/routing/search-params";

export const dynamic = "force-dynamic";

const RECENT_REQUESTS = 10;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/participants">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "participants" });
  return { title: t("title") };
}

export default async function ParticipantsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/participants">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const q = readParam(query, "q");
  const page = readPage(query);

  const [t, common, format, loaded, requests, listLabels, dialogLabels] =
    await Promise.all([
      getTranslations("participants"),
      getTranslations("common"),
      getFormatter(),
      loadParticipants({ q, page, pageSize: DEFAULT_PAGE_SIZE }),
      loadPastEventRequests({ pageSize: RECENT_REQUESTS }),
      requestListLabels(),
      pastEventDialogLabels(),
    ]);

  const failure = failureOf(loaded);
  const listPath = navHref("participants");
  const recent = isReady(requests) ? waitingFirst(requests.data.items) : [];
  const waiting = isReady(requests) ? requests.data.pending : 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={navHref("pastEvents")}>{t("pastEvents.browse")}</Link>
          </Button>
        }
      />

      {failure ? <LoadFailure failure={failure} /> : null}

      {recent.length > 0 ? (
        <Register
          id="requests"
          title={t("requests.title")}
          {...(waiting > 0
            ? {
                count: waiting,
                countLabel: t("requests.waitingLabel"),
                countTone: "waiting" as const,
              }
            : {})}
          description={t("requests.description")}
        >
          <RequestList
            requests={recent}
            labels={listLabels}
            showVolunteer
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

      {isReady(loaded) ? (
        <Register
          id="participants"
          title={q ? t("found") : t("listTitle")}
          count={loaded.data.total}
          countLabel={t("countLabel")}
          toolbar={
            <RegisterSearch
              action={`/${locale}${listPath}`}
              label={t("filters.search")}
              submitLabel={common("search")}
              value={q}
            />
          }
        >
          {loaded.data.items.length === 0 ? (
            <RegisterNote
              title={q ? t("noMatches.title") : t("empty.title")}
              description={q ? t("noMatches.description") : t("empty.description")}
            />
          ) : (
            <>
              <Table>
                <TableCaption className="sr-only">{t("table.caption")}</TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">{t("table.name")}</TableHead>
                    <TableHead scope="col">{t("table.events")}</TableHead>
                    <TableHead scope="col">{t("table.hours")}</TableHead>
                    <TableHead scope="col">{t("table.pastEvents")}</TableHead>
                    <TableHead scope="col">{t("table.waiting")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaded.data.items.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <span className="flex min-w-[14rem] items-center gap-3">
                          <Avatar
                            name={participant.displayName ?? undefined}
                            src={participant.avatarUrl ?? undefined}
                            size="sm"
                            person
                          />
                          <span className="min-w-0">
                            <Link
                              href={participantHref(participant.id)}
                              className="block font-semibold text-ink hover:text-primary-ink hover:underline"
                            >
                              {participant.displayName ?? common("notSet")}
                            </Link>
                            {participant.username ? (
                              <span className="block truncate text-xs text-ink-muted">
                                @{participant.username}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="tabular">
                        {format.number(participant.participation.attendedEvents)}
                      </TableCell>
                      <TableCell className="tabular">
                        {format.number(participant.participation.attendedHours)}
                      </TableCell>
                      <TableCell className="tabular">
                        {format.number(participant.participation.pastEvents)}
                      </TableCell>
                      <TableCell className="tabular">
                        {participant.pendingRequests > 0
                          ? format.number(participant.pendingRequests)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                framed
                state={loaded.data}
                hrefFor={(next) => hrefWith(listPath, { q, page: next })}
              />
            </>
          )}
        </Register>
      ) : null}
    </>
  );
}
