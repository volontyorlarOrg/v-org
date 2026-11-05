import { CalendarDays, Plus, Trophy } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";

import { StatusBadge, stageStatus } from "@/components/portal/status-badge";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowMenu, type RowMenuItem } from "@/components/vacancies/list/row-menu";
import { SaveToggle } from "@/components/vacancies/list/save-toggle";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import type { VacancyListItem } from "@/lib/api/schemas";
import { navHref, vacancyEditHref, vacancyHref } from "@/lib/routing/routes";
import {
  DEFAULT_PAGE_SIZE,
  hrefWith,
  paginate,
  readOption,
  readPage,
  readParam,
} from "@/lib/routing/search-params";
import { canEditNow, hasOpenedToVolunteers } from "@/lib/vacancies/approval";
import { loadVacancies } from "@/lib/vacancies/data.server";
import { storedVacancyImageUrl } from "@/lib/vacancies/image";
import {
  LIST_STAGES,
  countByStage,
  filterVacancyList,
  nextStepOf,
  progressOf,
} from "@/lib/vacancies/stage";

export const dynamic = "force-dynamic";

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
  const stage = readOption(query, "state", LIST_STAGES);
  const saved = readParam(query, "saved") === "1";
  const now = new Date();

  const failure = failureOf(loaded);
  const all = isReady(loaded) ? loaded.data : [];
  const filtered = filterVacancyList(
    all,
    { q, ...(stage ? { stage } : {}), saved },
    now,
  );
  const pageState = paginate(filtered, readPage(query), DEFAULT_PAGE_SIZE);
  const counts = countByStage(all, q, now);
  const listPath = navHref("vacancies");
  const keep = { q, state: stage, saved: saved ? "1" : undefined };

  const tabs = [
    {
      key: "all",
      label: t("state.all"),
      href: hrefWith(listPath, { q }),
      count: counts.all,
      active: !stage && !saved,
    },
    ...LIST_STAGES.filter((value) => counts[value] > 0 || stage === value).map(
      (value) => ({
        key: value,
        label: t(`list.stage.${value}`),
        href: hrefWith(listPath, { q, state: value }),
        count: counts[value],
        active: stage === value,
      }),
    ),
    ...(counts.saved > 0 || saved
      ? [
          {
            key: "saved",
            label: t("list.saved"),
            href: hrefWith(listPath, { q, saved: "1" }),
            count: counts.saved,
            active: saved,
          },
        ]
      : []),
  ];

  const dated = (value: string) => (
    <>
      <span className="block">{format.dateTime(new Date(value), "day")}</span>
      <span className="block text-xs text-ink-muted">
        {format.relativeTime(new Date(value), now)}
      </span>
    </>
  );

  const menuOf = (vacancy: VacancyListItem): RowMenuItem[] => {
    const detail = vacancyHref(vacancy.id);
    return [
      { key: "open", href: detail, label: t("list.menuOpen") },
      ...(canEditNow(vacancy, now)
        ? [
            {
              key: "edit" as const,
              href: vacancyEditHref(vacancy.id),
              label: t("list.menuEdit"),
            },
          ]
        : []),
      ...(hasOpenedToVolunteers(vacancy, progressOf(vacancy).applications)
        ? [
            {
              key: "applications" as const,
              href: `${detail}?tab=applications`,
              label: t("list.menuApplications"),
            },
            {
              key: "attendance" as const,
              href: `${detail}?tab=attendance`,
              label: t("list.menuAttendance"),
            },
          ]
        : []),
    ];
  };

  const filtering = Boolean(q || stage || saved);

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
          title={
            saved ? t("list.saved") : stage ? t(`list.stage.${stage}`) : t("listTitle")
          }
          count={filtered.length}
          countLabel={t("countLabel")}
          toolbar={
            <div className="flex w-full flex-col gap-3">
              <RegisterTabs label={t("filters.state")} items={tabs} />
              <RegisterSearch
                action={`/${locale}${listPath}`}
                label={t("list.search")}
                submitLabel={common("search")}
                value={q}
                keep={{ state: stage, saved: saved ? "1" : undefined }}
              />
            </div>
          }
        >
          {pageState.items.length === 0 ? (
            <RegisterNote
              title={filtering ? t("list.noMatchesTitle") : t("list.emptyTitle")}
              description={
                filtering ? t("list.noMatchesDescription") : t("list.emptyDescription")
              }
              action={
                filtering ? (
                  <Link
                    href={listPath}
                    className={buttonClass({ size: "sm", variant: "outline" })}
                  >
                    {t("list.clear")}
                  </Link>
                ) : (
                  <Link
                    href={navHref("newVacancy")}
                    className={buttonClass({ size: "sm" })}
                  >
                    {t("new")}
                  </Link>
                )
              }
            />
          ) : (
            <>
              <Table>
                <TableCaption className="sr-only">{t("table.caption")}</TableCaption>
                <TableHeader className="max-md:hidden">
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">{t("table.title")}</TableHead>
                    <TableHead scope="col">{t("table.state")}</TableHead>
                    <TableHead scope="col">{t("table.applications")}</TableHead>
                    <TableHead scope="col" className="max-xl:hidden">
                      {t("table.deadline")}
                    </TableHead>
                    <TableHead scope="col" className="max-lg:hidden">
                      {t("table.starts")}
                    </TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">{common("actions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageState.items.map((vacancy) => {
                    const next = nextStepOf(vacancy, now);
                    const chip = stageStatus(next.stage);
                    const progress = progressOf(vacancy);
                    const imageUrl = vacancy.imageUrl
                      ? storedVacancyImageUrl(vacancy.imageUrl)
                      : null;
                    const FallbackIcon =
                      vacancy.kind === "competition" ? Trophy : CalendarDays;
                    const stageChip = (
                      <StatusBadge
                        label={t(`list.stage.${next.stage}`)}
                        tone={chip.tone}
                        icon={chip.icon}
                      />
                    );
                    const nextStep = (
                      <Link
                        href={next.href}
                        className={buttonClass({
                          size: "row",
                          variant: next.needsYou ? "primary" : "outline",
                        })}
                      >
                        {t(`list.action.${next.action}`)}
                        <span className="sr-only"> — {vacancy.title}</span>
                      </Link>
                    );
                    const rowTools = (
                      <>
                        <SaveToggle
                          id={vacancy.id}
                          saved={vacancy.saved}
                          labels={{
                            save: t("list.save", { title: vacancy.title }),
                            unsave: t("list.unsave", { title: vacancy.title }),
                            failed: t("list.saveFailed"),
                          }}
                        />
                        <RowMenu
                          label={t("list.menu", { title: vacancy.title })}
                          items={menuOf(vacancy)}
                        />
                      </>
                    );
                    return (
                      <TableRow key={vacancy.id}>
                        <TableCell className="max-w-[24rem] whitespace-normal">
                          <span className="flex min-w-0 items-start gap-3">
                            <span className="relative grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-sunk text-ink-faint">
                              {imageUrl ? (
                                <Image
                                  unoptimized
                                  src={imageUrl}
                                  alt=""
                                  fill
                                  sizes="3.5rem"
                                  className="object-cover"
                                />
                              ) : (
                                <FallbackIcon aria-hidden="true" className="size-4" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <Link
                                href={vacancyHref(vacancy.id)}
                                className="block font-semibold break-words text-ink hover:text-primary-ink hover:underline"
                              >
                                {vacancy.title}
                              </Link>
                              <span className="mt-0.5 block text-xs break-words text-ink-muted">
                                {[
                                  t(`kinds.${vacancy.kind}`),
                                  vocabulary(`regions.${vacancy.region}`),
                                ].join(" · ")}
                              </span>
                              <span className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                                {stageChip}
                                {progress.awaitingReview > 0 ? (
                                  <span className="tabular inline-flex h-5 items-center rounded-sm bg-warning-muted px-1.5 text-xs font-medium text-warning-ink">
                                    {t("table.waiting", {
                                      count: progress.awaitingReview,
                                    })}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                                {nextStep}
                                {rowTools}
                              </span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="max-md:hidden">{stageChip}</TableCell>
                        <TableCell className="tabular whitespace-nowrap max-md:hidden">
                          {progress.applications > 0 ? (
                            <>
                              <span className="block">
                                {format.number(progress.applications)}
                              </span>
                              {progress.awaitingReview > 0 ? (
                                <span className="mt-0.5 inline-flex h-5 items-center rounded-sm bg-warning-muted px-1.5 text-xs font-medium text-warning-ink">
                                  {t("table.waiting", {
                                    count: progress.awaitingReview,
                                  })}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular whitespace-nowrap max-xl:hidden">
                          {dated(vacancy.applicationDeadline)}
                        </TableCell>
                        <TableCell className="tabular whitespace-nowrap max-lg:hidden">
                          {dated(vacancy.startsAt)}
                        </TableCell>
                        <TableCell className="max-md:hidden">
                          <span className="flex items-center justify-end gap-1.5">
                            {nextStep}
                            {rowTools}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                framed
                state={pageState}
                hrefFor={(next) => hrefWith(listPath, { ...keep, page: next })}
              />
            </>
          )}
        </Register>
      ) : null}
    </>
  );
}
