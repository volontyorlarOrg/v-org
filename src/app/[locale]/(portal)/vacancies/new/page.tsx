import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { StatePanel } from "@/components/states/state-panel";
import { VacancyWizard } from "@/components/vacancies/wizard/vacancy-wizard";
import { WizardMessages } from "@/components/vacancies/wizard/wizard-messages";
import { failureOf, isReady } from "@/lib/api/load";
import { REGIONS } from "@/lib/domain/vocabulary";
import { navHref } from "@/lib/routing/routes";
import { loadOrganizations } from "@/lib/vacancies/data.server";
import { emptyDraft } from "@/lib/vacancies/draft";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vacancies/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vacancies.wizard" });
  return { title: t("createTitle") };
}

export default async function NewVacancyPage({
  params,
}: PageProps<"/[locale]/vacancies/new">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, vacancies, organizations] = await Promise.all([
    getTranslations("vacancies.wizard"),
    getTranslations("vacancies"),
    loadOrganizations(),
  ]);
  const failure = failureOf(organizations);
  const organization = isReady(organizations) ? organizations.data[0] : undefined;

  return (
    <>
      <PageHeader
        back={{ href: navHref("vacancies"), label: t("backToList") }}
        title={t("createTitle")}
      />

      {failure ? <LoadFailure failure={failure} /> : null}

      {isReady(organizations) && !organization ? (
        <StatePanel role="status" title={vacancies("form.noOrganizations")} />
      ) : null}

      {organization ? (
        <WizardMessages>
          <VacancyWizard
            locale={locale}
            initialDraft={emptyDraft()}
            organization={{
              name: organization.name,
              verified: organization.verified,
              logoUrl: organization.logoUrl,
            }}
            regions={REGIONS}
          />
        </WizardMessages>
      ) : null}
    </>
  );
}
