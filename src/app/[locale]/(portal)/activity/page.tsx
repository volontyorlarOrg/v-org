import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { AuditTimeline } from "@/components/audit/audit-timeline";
import { Register, RegisterNote } from "@/components/register/register";
import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { Pagination } from "@/components/states/pagination";
import { Button, buttonClass } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
import { failureOf, isReady } from "@/lib/api/load";
import { loadActivity } from "@/lib/activity/data.server";
import { filterActivity } from "@/lib/activity/filters";
import { loadAuditDirectory } from "@/lib/audit/directory.server";
import { auditActionGroups, auditActionKey } from "@/lib/domain/audit-actions";
import { navHref } from "@/lib/routing/routes";
import {
  DEFAULT_PAGE_SIZE,
  hrefWith,
  paginate,
  readPage,
  readParam,
} from "@/lib/routing/search-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/activity">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "activity" });
  return { title: t("title") };
}

export default async function ActivityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/activity">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, audit, common] = await Promise.all([
    getTranslations("activity"),
    getTranslations("audit"),
    getTranslations("common"),
  ]);

  const query = await searchParams;
  const action = readParam(query, "action");
  const page = readPage(query);

  const [loaded, directory] = await Promise.all([loadActivity(), loadAuditDirectory()]);
  const failure = failureOf(loaded);
  const all = isReady(loaded) ? loaded.data : [];
  const filtered = filterActivity(all, { action });
  const pageState = paginate(filtered, page, DEFAULT_PAGE_SIZE);
  const listPath = navHref("activity");

  const label = (name: string) => {
    const key = `actions.${auditActionKey(name)}`;
    return audit.has(key) ? audit(key) : name;
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {failure ? <LoadFailure failure={failure} /> : null}

      {isReady(loaded) ? (
        <Register
          title={t("listTitle")}
          count={filtered.length}
          countLabel={audit("countLabel")}
          toolbar={
            <form
              method="get"
              action={`/${locale}${listPath}`}
              className="flex w-full flex-wrap items-end gap-3"
            >
              <label className="flex min-w-[14rem] flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted">
                  {t("filters.action")}
                </span>
                <NativeSelect
                  name="action"
                  defaultValue={action}
                  className="min-h-10 rounded-full text-sm"
                >
                  <NativeSelectOption value="">{common("all")}</NativeSelectOption>
                  {auditActionGroups(all.map((event) => event.action)).map((group) => (
                    <optgroup
                      key={group.family}
                      label={audit(`families.${group.family}`)}
                    >
                      {group.actions.map((name) => (
                        <NativeSelectOption key={name} value={name}>
                          {label(name)}
                        </NativeSelectOption>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>
              </label>
              <Button type="submit" size="sm">
                {common("apply")}
              </Button>
              {action ? (
                <Link
                  href={listPath}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  {common("reset")}
                </Link>
              ) : null}
            </form>
          }
        >
          {pageState.items.length === 0 ? (
            <RegisterNote
              title={all.length === 0 ? t("empty.title") : t("noMatches.title")}
              description={
                all.length === 0 ? t("empty.description") : t("noMatches.description")
              }
            />
          ) : (
            <>
              <AuditTimeline
                id="activity"
                events={pageState.items}
                directory={directory}
                showActor={false}
              />
              <Pagination
                framed
                state={pageState}
                hrefFor={(next) => hrefWith(listPath, { action, page: next })}
              />
            </>
          )}
        </Register>
      ) : null}
    </>
  );
}
