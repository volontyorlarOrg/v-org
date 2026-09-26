import { CalendarDays, Plus } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { StatusBadge, vacancyStatus } from "@/components/portal/status-badge";
import {
  Register,
  RegisterNote,
  RegisterSearch,
  RegisterTabs,
} from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { Pagination } from "@/components/states/pagination";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import { loadApplications } from "@/lib/applications/data.server";
import { VACANCY_STATES, type VacancyState } from "@/lib/domain/vocabulary";
import { navHref, vacancyHref } from "@/lib/routing/routes";
import {
  DEFAULT_PAGE_SIZE,
  hrefWith,
  paginate,
  readOption,
  readPage,
  readParam,
} from "@/lib/routing/search-params";
import { vacancyStateOf } from "@/lib/vacancies/approval";
import { loadVacancies } from "@/lib/vacancies/data.server";
import { countByState, filterVacancies } from "@/lib/vacancies/filters";
import { storedVacancyImageUrl } from "@/lib/vacancies/image";

export const dynamic = "force-dynamic";

const TAB_ORDER: readonly VacancyState[] = [
  "pending_review",
  "changes_requested",
  "draft",
  "approved",
  "rejected",
  "archived",
];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vacancies">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vacancies" });
  return { title: t("title") };
}

export default async function VacanciesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/vacancies">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, common, vocabulary, format] = await Promise.all([
    getTranslations("vacancies"),
    getTranslations("common"),
    getTranslations("vocabulary"),
    getFormatter(),
  ]);

  const query = await searchParams;
  const q = readParam(query, "q");
  const state = readOption(query, "state", VACANCY_STATES);
  const page = readPage(query);

  const [loaded, applications] = await Promise.all([
    loadVacancies(),
    loadApplications(),
  ]);

  const failure = failureOf(loaded);
  const all = isReady(loaded) ? loaded.data : [];
  const counts = countByState(all);
  const filtered = filterVacancies(all, { q, ...(state ? { state } : {}) });
  const pageState = paginate(filtered, page, DEFAULT_PAGE_SIZE);
  const listPath = navHref("vacancies");

  const load = new Map<string, { sent: number; waiting: number }>();
  if (isReady(applications)) {
    for (const application of applications.data) {
      const entry = load.get(application.opportunityId) ?? { sent: 0, waiting: 0 };
      entry.sent += 1;
      if (application.status === "submitted" || application.status === "under_review") {
        entry.waiting += 1;
      }
      load.set(application.opportunityId, entry);
    }
  }

  const tabs = [
    {
      key: "all",
      label: t("state.all"),
      href: hrefWith(listPath, { q }),
      count: all.length,
      active: state === undefined,
    },
    ...TAB_ORDER.map((value) => ({
      key: value,
      label: t(`state.${value}`),
      href: hrefWith(listPath, { q, state: value }),
      count: counts[value],
      active: state === value,
    })),
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href={navHref("newVacancy")} className={buttonClass({ size: "sm" })}>
            <Plus aria-hidden="true" />
            {t("new")}
          </Link>
        }
      />

      {failure ? <LoadFailure failure={failure} /> : null}

      {isReady(loaded) ? (
        <Register
          title={state ? t(`state.${state}`) : t("listTitle")}
          count={filtered.length}
          countLabel={t("countLabel")}
          toolbar={
            <div className="flex w-full flex-col gap-3">
              <RegisterTabs label={t("filters.state")} items={tabs} />
              <RegisterSearch
                action={`/${locale}${listPath}`}
                label={t("filters.search")}
                submitLabel={common("search")}
                value={q}
                keep={{ state }}
              />
            </div>
          }
        >
          {pageState.items.length === 0 ? (
            <RegisterNote
              title={all.length === 0 ? t("empty.title") : t("noMatches.title")}
              description={
                all.length === 0 ? t("empty.description") : t("noMatches.description")
              }
              {...(all.length === 0
                ? {
                    action: (
                      <Link
                        href={navHref("newVacancy")}
                        className={buttonClass({ size: "sm" })}
                      >
                        {t("new")}
                      </Link>
                    ),
                  }
                : {})}
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {pageState.items.map((vacancy) => {
                  const current = vacancyStateOf(vacancy);
                  const status = vacancyStatus(current);
                  const counted = load.get(vacancy.id);
                  const imageUrl = vacancy.imageUrl
                    ? storedVacancyImageUrl(vacancy.imageUrl)
                    : null;
                  return (
                    <li
                      key={vacancy.id}
                      className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunk">
                          {imageUrl ? (
                            <Image
                              unoptimized
                              src={imageUrl}
                              alt=""
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div
                              className="grid h-full place-items-center text-primary-ink"
                              aria-hidden="true"
                            >
                              <CalendarDays className="size-5" strokeWidth={1.5} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-ink">
                            <Link
                              href={vacancyHref(vacancy.id)}
                              className="hover:text-primary-ink hover:underline"
                            >
                              {vacancy.title}
                            </Link>
                          </h3>
                          <p className="mt-1 truncate text-xs text-ink-muted">
                            {t(`kinds.${vacancy.kind}`)}
                            {" · "}
                            {format.dateTime(new Date(vacancy.startsAt), "day")}
                            {" · "}
                            {vocabulary(`regions.${vacancy.region}`)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-end">
                        <StatusBadge
                          label={t(`state.${current}`)}
                          tone={status.tone}
                          icon={status.icon}
                        />
                        <span className="tabular text-sm text-ink-muted">
                          {format.number(counted?.sent ?? 0)} {t("table.applications")}
                          {counted?.waiting
                            ? ` · ${t("table.waiting", { count: counted.waiting })}`
                            : ""}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pagination
                framed
                state={pageState}
                hrefFor={(next) => hrefWith(listPath, { q, state, page: next })}
              />
            </>
          )}
        </Register>
      ) : null}
    </>
  );
}
