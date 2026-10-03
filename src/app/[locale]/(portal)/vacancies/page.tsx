import { Plus } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import type { CardMenuItem } from "@/components/vacancies/list/card-menu";
import { CardPagination } from "@/components/vacancies/list/card-pagination";
import { ListFilters } from "@/components/vacancies/list/list-filters";
import { VacancyCard } from "@/components/vacancies/list/vacancy-card";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import type { VacancyListItem } from "@/lib/api/schemas";
import { navHref, vacancyEditHref, vacancyHref } from "@/lib/routing/routes";
import {
  hrefWith,
  paginate,
  readOption,
  readPage,
  readParam,
} from "@/lib/routing/search-params";
import { canEditVacancy } from "@/lib/vacancies/approval";
import { CARD_STAGES, cardOf, filterCards } from "@/lib/vacancies/cards";
import { loadVacancies } from "@/lib/vacancies/data.server";
import { storedVacancyImageUrl } from "@/lib/vacancies/image";

export const dynamic = "force-dynamic";

/** Eight cards and the create tile fill three rows of three. */
const PAGE_SIZE = 8;

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

  const [t, common, vocabulary, format, loaded] = await Promise.all([
    getTranslations("vacancies"),
    getTranslations("common"),
    getTranslations("vocabulary"),
    getFormatter(),
    loadVacancies(),
  ]);

  const query = await searchParams;
  const q = readParam(query, "q");
  const status = readOption(query, "status", CARD_STAGES);
  const saved = readParam(query, "saved") === "1";
  const now = new Date();

  const failure = failureOf(loaded);
  const all = isReady(loaded) ? loaded.data : [];
  const filtered = filterCards(
    all,
    { q, ...(status ? { stage: status } : {}), saved },
    now,
  );
  const last = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(readPage(query), last);
  const pageState = paginate(filtered, page, PAGE_SIZE);
  const listPath = navHref("vacancies");
  const filtering = Boolean(q || status || saved);
  const hrefFor = (next: number) =>
    hrefWith(listPath, {
      q,
      status,
      saved: saved ? "1" : undefined,
      page: next > 1 ? next : undefined,
    });

  const dateOptions = { day: "numeric", month: "short", year: "numeric" } as const;
  const datesOf = (vacancy: VacancyListItem) => {
    const start = new Date(vacancy.startsAt);
    const end = vacancy.endsAt ? new Date(vacancy.endsAt) : null;
    const sameDay =
      !end || format.dateTime(start, dateOptions) === format.dateTime(end, dateOptions);
    return sameDay
      ? format.dateTime(start, dateOptions)
      : format.dateTimeRange(start, end, dateOptions);
  };
  const locationOf = (vacancy: VacancyListItem) => {
    const region = vocabulary(`regions.${vacancy.region}`);
    if (vacancy.format === "remote") return t("list.online");
    return [vacancy.locationName ?? vacancy.city, region].filter(Boolean).join(", ");
  };

  const createTile = (
    <Link
      href={navHref("newVacancy")}
      className="group flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-control bg-surface/60 px-6 py-8 text-center transition-colors hover:border-primary-ink hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full bg-action text-knockout shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-primary)_16%,transparent)] transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
      >
        <Plus className="size-7" strokeWidth={2.25} />
      </span>
      <span className="text-lg font-semibold text-ink">{t("list.create")}</span>
      <span className="max-w-[18rem] text-sm text-ink-muted">
        {t("list.createHint")}
      </span>
    </Link>
  );

  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {failure ? <LoadFailure failure={failure} /> : null}

      {isReady(loaded) ? (
        <section aria-label={t("title")} className="flex flex-col gap-5">
          <ListFilters
            action={`/${locale}${listPath}`}
            q={q}
            status={status ?? ""}
            saved={saved}
            statuses={CARD_STAGES.map((value) => ({
              value,
              label: t(`list.stage.${value}`),
            }))}
            labels={{
              search: t("list.search"),
              status: t("list.status"),
              allStatuses: t("list.allStatuses"),
              savedOnly: t("list.savedOnly"),
              apply: t("list.apply"),
            }}
          />

          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <li className="flex">{createTile}</li>
            {pageState.items.length === 0 ? (
              <li className="flex flex-col justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-8 md:col-span-1 xl:col-span-2">
                <h2 className="text-section text-ink">
                  {filtering ? t("list.noMatchesTitle") : t("list.emptyTitle")}
                </h2>
                <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
                  {filtering
                    ? t("list.noMatchesDescription")
                    : t("list.emptyDescription")}
                </p>
                {filtering ? (
                  <Link
                    href={listPath}
                    className="mt-1 w-fit text-sm font-semibold text-primary-ink underline-offset-4 hover:underline"
                  >
                    {t("list.clear")}
                  </Link>
                ) : null}
              </li>
            ) : (
              pageState.items.map((vacancy) => {
                const card = cardOf(vacancy, now);
                const detail = vacancyHref(vacancy.id);
                const menu: CardMenuItem[] = [
                  { key: "open", href: detail, label: t("list.menuOpen") },
                  ...(canEditVacancy(vacancy)
                    ? [
                        {
                          key: "edit" as const,
                          href: vacancyEditHref(vacancy.id),
                          label: t("list.menuEdit"),
                        },
                      ]
                    : []),
                  {
                    key: "applications",
                    href: `${detail}#applications`,
                    label: t("list.menuApplications"),
                  },
                  {
                    key: "attendance",
                    href: `${detail}#roll-call`,
                    label: t("list.menuAttendance"),
                  },
                ];
                const count = card.count;
                return (
                  <li key={vacancy.id} className="flex min-w-0 [&>article]:flex-1">
                    <VacancyCard
                      id={vacancy.id}
                      title={vacancy.title}
                      organization={
                        vacancy.organization?.name ?? common("organizationName")
                      }
                      imageUrl={
                        vacancy.imageUrl
                          ? storedVacancyImageUrl(vacancy.imageUrl)
                          : null
                      }
                      dates={datesOf(vacancy)}
                      location={locationOf(vacancy)}
                      kind={vacancy.kind}
                      kindLabel={t(`kinds.${vacancy.kind}`)}
                      card={card}
                      stageLabel={t(`list.stage.${card.stage}`)}
                      actionLabel={t(`list.action.${card.action}`)}
                      countLabel={
                        count === null
                          ? null
                          : "count" in count
                            ? t(`list.count.${count.key}`, { count: count.count })
                            : t(`list.count.${count.key}`)
                      }
                      saved={vacancy.saved}
                      saveLabels={{
                        save: t("list.save", { title: vacancy.title }),
                        unsave: t("list.unsave", { title: vacancy.title }),
                        failed: t("list.saveFailed"),
                      }}
                      menuLabel={t("list.menu", { title: vacancy.title })}
                      menu={menu}
                    />
                  </li>
                );
              })
            )}
          </ul>

          {filtered.length > 0 ? (
            <CardPagination
              page={page}
              last={last}
              summary={t("list.showing", { from, to, total: filtered.length })}
              hrefFor={hrefFor}
              labels={{
                pages: t("list.pages"),
                previous: common("previous"),
                next: common("next"),
                page: (value) => t("list.page", { page: value }),
              }}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
