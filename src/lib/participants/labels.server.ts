import "server-only";

import { getFormatter, getTranslations } from "next-intl/server";

import type { PastEventDialogLabels } from "@/components/participants/past-event-dialogs";
import type { RequestListLabels } from "@/components/participants/request-list";
import {
  PAST_EVENT_REQUEST_KINDS,
  PAST_EVENT_REQUEST_STATUSES,
} from "@/lib/participants/schemas";

const DIALOG_ERRORS = {
  hoursAmount: "hoursAmount",
  xpAmount: "xpAmount",
  pastEventDateInvalid: "dateInvalid",
  pastEventUncreditedXp: "uncreditedXp",
  pastEventNotFound: "eventNotFound",
  participantNotFound: "participantNotFound",
  pastEventRequestPending: "alreadyWaiting",
  pastEventRequestNoChanges: "noChanges",
  pastEventRequestNotPending: "notWaiting",
  pastEventRequestNotFound: "requestNotFound",
  pastEventRequestConflict: "submissionConflict",
} as const;

const SHARED_ERRORS = [
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

export async function requestListLabels(): Promise<RequestListLabels> {
  const [t, common, format] = await Promise.all([
    getTranslations("participants"),
    getTranslations("common"),
    getFormatter(),
  ]);

  return {
    kind: Object.fromEntries(
      PAST_EVENT_REQUEST_KINDS.map((kind) => [kind, t(`requests.kind.${kind}`)]),
    ) as RequestListLabels["kind"],
    status: Object.fromEntries(
      PAST_EVENT_REQUEST_STATUSES.map((status) => [
        status,
        t(`requests.status.${status}`),
      ]),
    ) as RequestListLabels["status"],
    adjusted: t("requests.adjusted"),
    yourNote: (note) => t("requests.yourNote", { note }),
    reviewNote: (note) => t("requests.reviewNote", { note }),
    sent: (when) => t("requests.sent", { when }),
    hours: (value) => t("facts.hours", { value }),
    xp: (value) => t("facts.xp", { value }),
    day: (date) => format.dateTime(new Date(`${date.slice(0, 10)}T00:00:00Z`), "date"),
    moment: (date) => format.dateTime(new Date(date), "day"),
    number: (value) => format.number(value),
    unnamed: common("notSet"),
  };
}

export async function pastEventDialogLabels(): Promise<PastEventDialogLabels> {
  const [t, common, errors] = await Promise.all([
    getTranslations("participants.dialog"),
    getTranslations("common"),
    getTranslations("errors"),
  ]);

  return {
    change: t("change"),
    changeDescription: t("changeDescription"),
    changeSuccess: t("changeSuccess"),
    remove: t("remove"),
    removeDescription: t("removeDescription"),
    removeSuccess: t("removeSuccess"),
    withdraw: t("withdraw"),
    withdrawDescription: t("withdrawDescription"),
    withdrawSuccess: t("withdrawSuccess"),
    send: t("send"),
    title: t("fields.title"),
    date: t("fields.date"),
    hours: t("fields.hours"),
    xp: t("fields.xp"),
    xpHelp: t("fields.xpHelp"),
    reason: t("fields.reason"),
    reasonHelp: t("fields.reasonHelp"),
    close: common("close"),
    cancel: common("cancel"),
    pending: common("saving"),
    fallbackError: errors("server"),
    errors: {
      ...Object.fromEntries(SHARED_ERRORS.map((code) => [code, errors(code)])),
      ...Object.fromEntries(
        Object.entries(DIALOG_ERRORS).map(([code, key]) => [code, t(`errors.${key}`)]),
      ),
    },
  };
}
