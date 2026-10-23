import { randomUUID } from "node:crypto";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PastEventRosterForm } from "@/components/participants/past-event-roster-form";
import { PageHeader } from "@/components/states/page-header";
import { yesterdayInTashkent } from "@/lib/participants/input";
import { rosterFormLabels } from "@/lib/past-event-rosters/labels.server";
import { navHref } from "@/lib/routing/routes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/past-events/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "historicalEvents" });
  return { title: t("create") };
}

export default async function NewPastEventPage({
  params,
}: PageProps<"/[locale]/past-events/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, labels] = await Promise.all([
    getTranslations("historicalEvents"),
    rosterFormLabels(),
  ]);
  return (
    <>
      <PageHeader
        title={t("create")}
        description={t("description")}
        back={{ href: navHref("pastEvents"), label: t("title") }}
      />
      <PastEventRosterForm
        locale={locale}
        submissionId={randomUUID()}
        latestDate={yesterdayInTashkent()}
        labels={labels}
      />
    </>
  );
}
