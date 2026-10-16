import { randomUUID } from "node:crypto";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import {
  PastEventRosterForm,
  type RosterFormLabels,
} from "@/components/participants/past-event-roster-form";
import { PageHeader } from "@/components/states/page-header";
import { yesterdayInTashkent } from "@/lib/participants/input";
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
  const [t, errors] = await Promise.all([
    getTranslations("historicalEvents"),
    getTranslations("errors"),
  ]);
  const keys = [
    "details",
    "participants",
    "review",
    "title",
    "date",
    "note",
    "username",
    "usernameHelp",
    "find",
    "finding",
    "hours",
    "xp",
    "remove",
    "empty",
    "emptyHelp",
    "next",
    "back",
    "send",
    "sending",
    "cancel",
    "approvalHelp",
    "limit",
    "reviewHelp",
  ] as const;
  const errorKeys = [
    "pastEventVolunteerNotFound",
    "pastEventRosterConflict",
    "pastEventRosterDuplicate",
    "pastEventRosterParticipants",
    "pastEventDateInvalid",
    "hoursAmount",
    "xpAmount",
  ] as const;
  const shared = [
    "required",
    "tooLong",
    "validationFailed",
    "forbidden",
    "sessionExpired",
    "network",
    "timeout",
    "rateLimited",
    "unavailable",
    "server",
  ] as const;
  const labels = {
    ...Object.fromEntries(keys.map((key) => [key, t(`form.${key}`)])),
    errors: {
      ...Object.fromEntries(shared.map((key) => [key, errors(key)])),
      ...Object.fromEntries(errorKeys.map((key) => [key, t(`errors.${key}`)])),
    },
    fallbackError: errors("server"),
  } as RosterFormLabels;
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
