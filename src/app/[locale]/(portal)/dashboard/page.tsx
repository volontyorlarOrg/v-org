import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { DashboardDesk } from "@/components/dashboard/desk";
import { DashboardOverview } from "@/components/dashboard/overview";
import { PageHeader } from "@/components/states/page-header";
import { QueueSkeleton } from "@/components/states/skeletons";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { navHref } from "@/lib/routing/routes";
import { loadStatistics } from "@/lib/statistics/data.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboardHome" });
  return { title: t("title") };
}

export default async function DashboardPage({
  params,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, vacancies, statistics] = await Promise.all([
    getTranslations("dashboardHome"),
    getTranslations("vacancies"),
    loadStatistics(),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href={navHref("newVacancy")} className={buttonClass({ size: "sm" })}>
            {vacancies("new")}
          </Link>
        }
      />
      <DashboardOverview
        statistics={statistics}
        figures={[
          "publishedVacancies",
          "applications",
          "accepted",
          "attended",
          "confirmedHours",
        ]}
      />
      <Suspense fallback={<QueueSkeleton label={t("loadingOperations")} />}>
        <DashboardDesk />
      </Suspense>
    </>
  );
}
