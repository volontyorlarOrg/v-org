import "server-only";

import { getTranslations } from "next-intl/server";

import type { AddParticipantsLabels } from "@/components/participants/add-participants-form";
import type { ParticipantPickerLabels } from "@/components/participants/participant-picker";
import type { RosterFormLabels } from "@/components/participants/past-event-roster-form";

const TEMPLATES = new Set(["notFound", "alreadyAdded", "totals", "zeroHours"]);

const PICKER_KEYS = [
  "username",
  "usernameHint",
  "find",
  "finding",
  "notFound",
  "alreadyAdded",
  "everyone",
  "everyoneHelp",
  "apply",
  "hours",
  "xp",
  "remove",
  "empty",
  "emptyHelp",
  "limit",
] as const;

const FORM_KEYS = [
  "steps",
  "details",
  "participants",
  "review",
  "title",
  "date",
  "note",
  "usernameHelp",
  "next",
  "back",
  "send",
  "sending",
  "cancel",
  "reviewHelp",
  "totals",
  "zeroHours",
] as const;

const ADD_KEYS = [
  "add",
  "addHelp",
  "send",
  "sending",
  "cancel",
  "added",
  "totals",
  "zeroHours",
] as const;

const ROSTER_ERRORS = [
  "pastEventVolunteerNotFound",
  "pastEventRosterConflict",
  "pastEventRosterDuplicate",
  "pastEventRosterParticipants",
  "pastEventRosterNotFound",
  "pastEventDateInvalid",
  "hoursAmount",
  "xpAmount",
] as const;

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

type Catalog = Awaited<ReturnType<typeof getTranslations<"historicalEvents">>>;

function text(t: Catalog, key: string): string {
  return TEMPLATES.has(key)
    ? String(t.raw(`form.${key}` as "form.title"))
    : t(`form.${key}` as "form.title");
}

async function pickerLabels(): Promise<ParticipantPickerLabels> {
  const [t, errors] = await Promise.all([
    getTranslations("historicalEvents"),
    getTranslations("errors"),
  ]);
  return {
    ...(Object.fromEntries(PICKER_KEYS.map((key) => [key, text(t, key)])) as Record<
      (typeof PICKER_KEYS)[number],
      string
    >),
    errors: {
      ...Object.fromEntries(SHARED_ERRORS.map((key) => [key, errors(key)])),
      ...Object.fromEntries(ROSTER_ERRORS.map((key) => [key, t(`errors.${key}`)])),
    },
    fallbackError: errors("server"),
  };
}

export async function rosterFormLabels(): Promise<RosterFormLabels> {
  const [t, picker] = await Promise.all([
    getTranslations("historicalEvents"),
    pickerLabels(),
  ]);
  return {
    ...picker,
    ...(Object.fromEntries(FORM_KEYS.map((key) => [key, text(t, key)])) as Record<
      (typeof FORM_KEYS)[number],
      string
    >),
  };
}

export async function addParticipantsLabels(): Promise<AddParticipantsLabels> {
  const [t, picker] = await Promise.all([
    getTranslations("historicalEvents"),
    pickerLabels(),
  ]);
  return {
    ...picker,
    ...(Object.fromEntries(ADD_KEYS.map((key) => [key, t(`form.${key}`)])) as Record<
      (typeof ADD_KEYS)[number],
      string
    >),
  };
}
