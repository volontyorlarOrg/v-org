import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LoadFailure } from "@/components/states/load-failure";
import { PageHeader } from "@/components/states/page-header";
import { StatePanel } from "@/components/states/state-panel";
import { VacancyWizard } from "@/components/vacancies/wizard/vacancy-wizard";
import { WizardMessages } from "@/components/vacancies/wizard/wizard-messages";
import { failureOf, isReady } from "@/lib/api/load";
import { REGIONS } from "@/lib/domain/vocabulary";
import { readOption, type SearchParams } from "@/lib/routing/search-params";
import { navHref, vacancyHref } from "@/lib/routing/routes";
import { canEditVacancy, vacancyStateOf } from "@/lib/vacancies/approval";
import { loadOrganizations, loadVacancy } from "@/lib/vacancies/data.server";
import { WIZARD_STEPS, draftFromVacancy } from "@/lib/vacancies/draft";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vacancies/[id]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vacancies.wizard" });
  return { title: t("editTitle") };
}

export default async function EditVacancyPage({
  params,
  searchParams,
}: {
  params: PageProps<"/[locale]/vacancies/[id]/edit">["params"];
  searchParams: Promise<SearchParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const query = await searchParams;

  const [t, vacancies, loaded, organizations] = await Promise.all([
    getTranslations("vacancies.wizard"),
    getTranslations("vacancies"),
    loadVacancy(id),
    loadOrganizations(),
  ]);
  const back = { href: navHref("vacancies"), label: t("backToList") };
  const failure = failureOf(loaded) ?? failureOf(organizations);

  if (failure) {
    return (
      <>
        <PageHeader back={back} title={t("editTitle")} />
        <LoadFailure failure={failure} />
      </>
    );
  }

  if (!isReady(loaded)) notFound();

  const vacancy = loaded.data;
  const state = vacancyStateOf(vacancy);
  const organization =
    (isReady(organizations)
      ? organizations.data.find((item) => item.id === vacancy.organizationId)
      : undefined) ?? vacancy.organization;

  if (!canEditVacancy(vacancy) || !organization) {
    return (
      <>
        <PageHeader
          back={{
            href: vacancyHref(vacancy.id),
            label: vacancies("form.backToVacancy"),
          }}
          title={t("editTitle")}
          description={vacancy.title}
        />
        <StatePanel role="status" title={vacancies("form.locked")} />
      </>
    );
  }

  return (
    <>
      <PageHeader back={back} title={t("editTitle")} />
      <WizardMessages>
        <VacancyWizard
          locale={locale}
          vacancyId={vacancy.id}
          initialDraft={draftFromVacancy(vacancy, t("questionPlaceholder"))}
          initialStep={readOption(query, "step", WIZARD_STEPS) ?? "details"}
          organization={{
            name: organization.name,
            verified: organization.verified,
            logoUrl: organization.logoUrl,
          }}
          storedImageUrl={vacancy.imageUrl ?? null}
          regions={REGIONS}
          kindLocked={Boolean(vacancy.publishedAt)}
          published={state === "approved"}
          feedback={state === "changes_requested" ? vacancy.approvalNote : undefined}
          photoFailed={readOption(query, "photo", ["failed"]) === "failed"}
        />
      </WizardMessages>
    </>
  );
}
