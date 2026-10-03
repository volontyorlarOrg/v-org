import { z } from "zod";

import {
  ACCEPTANCE_MODES,
  REGIONS,
  VACANCY_FORMATS,
  VACANCY_KINDS,
  type AcceptanceMode,
  type Region,
  type VacancyFormat,
  type VacancyKind,
} from "@/lib/domain/vocabulary";
import { hasMeetingCredentials } from "@/lib/vacancies/approval";

export const TITLE_LIMIT = 180;
export const DESCRIPTION_LIMIT = 1000;
export const LOCATION_LIMIT = 200;
export const QUESTION_LIMIT = 300;
export const MAX_SCHEDULE_DAYS = 31;
export const ATTENDED_EVENT_XP = 50;
export const CONFIRMED_HOUR_XP = 10;

const TASHKENT_OFFSET = "+05:00";
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const WIZARD_STEPS = ["details", "schedule", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function isWizardStep(value: unknown): value is WizardStep {
  return (WIZARD_STEPS as readonly unknown[]).includes(value);
}

export type DayTimes = { startTime: string; endTime: string };

export type DaySession = DayTimes & { date: string };

export type VacancyDraft = {
  kind: VacancyKind;
  title: string;
  description: string;
  format: VacancyFormat;
  region: Region | "";
  locationName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  sameTimes: boolean;
  days: Record<string, DayTimes>;
  allDaysRequired: boolean;
  capacity: string;
  deadlineDate: string;
  deadlineTime: string;
  essayPrompt: string;
  acceptanceMode: AcceptanceMode;
};

const dayTimesSchema = z.object({
  startTime: z.string().max(5),
  endTime: z.string().max(5),
});

/** The shape a browser may send. Field rules live in `draftProblems`. */
export const vacancyDraftSchema = z.object({
  kind: z.enum(VACANCY_KINDS),
  title: z.string().max(2000),
  description: z.string().max(20_000),
  format: z.enum(VACANCY_FORMATS),
  region: z.union([z.enum(REGIONS), z.literal("")]),
  locationName: z.string().max(2000),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  startTime: z.string().max(5),
  endTime: z.string().max(5),
  sameTimes: z.boolean(),
  days: z
    .record(z.string().regex(DATE_PATTERN), dayTimesSchema)
    .refine((days) => Object.keys(days).length <= 400),
  allDaysRequired: z.boolean(),
  capacity: z.string().max(12),
  deadlineDate: z.string().max(10),
  deadlineTime: z.string().max(5),
  essayPrompt: z.string().max(2000),
  acceptanceMode: z.enum(ACCEPTANCE_MODES),
});

export function emptyDraft(): VacancyDraft {
  return {
    kind: "volunteering",
    title: "",
    description: "",
    format: "onsite",
    region: "",
    locationName: "",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "13:00",
    sameTimes: true,
    days: {},
    allDaysRequired: true,
    capacity: "",
    deadlineDate: "",
    deadlineTime: "18:00",
    essayPrompt: "",
    acceptanceMode: "manual",
  };
}

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isClockTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Calendar days from `start` to `end`, both included; empty when either is invalid. */
export function datesBetween(start: string, end: string): string[] {
  if (!isCalendarDate(start) || !isCalendarDate(end)) return [];
  const first = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  if (last < first) return [];
  const count = Math.round((last - first) / DAY_MS) + 1;
  if (count > MAX_SCHEDULE_DAYS) return [];
  return Array.from({ length: count }, (_, index) =>
    new Date(first + index * DAY_MS).toISOString().slice(0, 10),
  );
}

export function dayCount(draft: Pick<VacancyDraft, "startDate" | "endDate">): number {
  return datesBetween(draft.startDate, draft.endDate || draft.startDate).length;
}

export function sessionsOf(draft: VacancyDraft): DaySession[] {
  return datesBetween(draft.startDate, draft.endDate || draft.startDate).map((date) => {
    const own = draft.sameTimes ? undefined : draft.days[date];
    return {
      date,
      startTime: own?.startTime || draft.startTime,
      endTime: own?.endTime || draft.endTime,
    };
  });
}

function sessionHours(session: DayTimes): number {
  if (!isClockTime(session.startTime) || !isClockTime(session.endTime)) return 0;
  return Math.max(0, minutesOf(session.endTime) - minutesOf(session.startTime)) / 60;
}

/**
 * What one volunteer is expected to give: every day when every day is
 * required, otherwise the longest single day.
 */
export function estimatedHoursOf(draft: VacancyDraft): number | null {
  if (draft.kind !== "volunteering") return null;
  const hours = sessionsOf(draft).map(sessionHours);
  if (hours.length === 0 || hours.some((value) => value <= 0)) return null;
  const total =
    hours.length > 1 && !draft.allDaysRequired
      ? Math.max(...hours)
      : hours.reduce((sum, value) => sum + value, 0);
  return Math.round(total * 100) / 100;
}

export function tashkentInstant(date: string, time: string): Date | null {
  if (!isCalendarDate(date) || !isClockTime(time)) return null;
  const value = new Date(`${date}T${time}:00${TASHKENT_OFFSET}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function tashkentParts(value: string | undefined): {
  date: string;
  time: string;
} {
  if (!value) return { date: "", time: "" };
  const instant = Date.parse(value);
  if (Number.isNaN(instant)) return { date: "", time: "" };
  const shifted = new Date(instant + TASHKENT_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

export type DraftProblems = Record<string, string[]>;

export type DraftCheck = "draft" | "submit";

export const DETAILS_FIELDS = ["kind", "title", "description", "image"] as const;

export function stepOfField(field: string): WizardStep {
  return (DETAILS_FIELDS as readonly string[]).includes(field) ? "details" : "schedule";
}

/** Rules a step must satisfy before the next one; `all` covers saving and sending. */
export function draftProblems(
  draft: VacancyDraft,
  scope: WizardStep | "all",
  check: DraftCheck = "draft",
  now: Date = new Date(),
): DraftProblems {
  const problems: DraftProblems = {};
  const add = (field: string, code: string) => {
    problems[field] ??= [];
    problems[field].push(code);
  };
  const details = scope === "details" || scope === "all" || scope === "review";
  const schedule = scope === "schedule" || scope === "all" || scope === "review";
  // Saving a draft asks only for what the API stores; moving on asks for everything.
  const complete = check === "submit" || scope !== "all";

  if (details) {
    const title = draft.title.trim();
    if (title.length < 2) add("title", "required");
    else if (title.length > TITLE_LIMIT) add("title", "tooLong");

    const description = draft.description.trim();
    if (description.length < 2) add("description", "required");
    else if (description.length > DESCRIPTION_LIMIT) add("description", "tooLong");
  }

  if (!schedule) return problems;

  if (!draft.region) add("region", "required");

  const location = draft.locationName.trim();
  if (!location) {
    if (complete) {
      add(
        "locationName",
        draft.format === "remote" ? "onlineLocationRequired" : "venueRequired",
      );
    }
  } else if (location.length > LOCATION_LIMIT) {
    add("locationName", "tooLong");
  } else if (hasMeetingCredentials(location)) {
    add("locationName", "onlineLocationCredentials");
  }

  const endDate = draft.endDate || draft.startDate;
  if (!draft.startDate) add("startDate", "required");
  else if (!isCalendarDate(draft.startDate)) add("startDate", "day");
  if (draft.endDate && !isCalendarDate(draft.endDate)) add("endDate", "day");
  else if (
    isCalendarDate(draft.startDate) &&
    isCalendarDate(endDate) &&
    endDate < draft.startDate
  ) {
    add("endDate", "endBeforeStart");
  } else if (
    isCalendarDate(draft.startDate) &&
    isCalendarDate(endDate) &&
    datesBetween(draft.startDate, endDate).length === 0
  ) {
    add("endDate", "scheduleTooLong");
  }

  if (!draft.startTime) add("startTime", "required");
  else if (!isClockTime(draft.startTime)) add("startTime", "time");
  if (!draft.endTime) add("endTime", "required");
  else if (!isClockTime(draft.endTime)) add("endTime", "time");
  else if (
    isClockTime(draft.startTime) &&
    minutesOf(draft.endTime) <= minutesOf(draft.startTime)
  ) {
    add("endTime", "finishBeforeStart");
  }

  if (!draft.sameTimes) {
    for (const session of sessionsOf(draft)) {
      if (!isClockTime(session.startTime) || !isClockTime(session.endTime)) {
        add(`day-${session.date}`, "time");
      } else if (minutesOf(session.endTime) <= minutesOf(session.startTime)) {
        add(`day-${session.date}`, "finishBeforeStart");
      }
    }
  }

  const capacity = draft.capacity.trim();
  if (!capacity) {
    if (complete && draft.kind === "volunteering") add("capacity", "required");
  } else if (
    !/^\d+$/.test(capacity) ||
    Number(capacity) < 1 ||
    Number(capacity) > 100_000
  ) {
    add("capacity", "capacity");
  }

  if (!draft.deadlineDate) add("deadlineDate", "required");
  else if (!isCalendarDate(draft.deadlineDate)) add("deadlineDate", "day");
  if (!draft.deadlineTime) add("deadlineTime", "required");
  else if (!isClockTime(draft.deadlineTime)) add("deadlineTime", "time");

  const deadline = tashkentInstant(draft.deadlineDate, draft.deadlineTime);
  const first = sessionsOf(draft)[0];
  const starts = first ? tashkentInstant(first.date, first.startTime) : null;
  if (deadline && starts && deadline.getTime() >= starts.getTime()) {
    add("deadlineDate", "deadlineAfterStart");
  } else if (deadline && check === "submit" && deadline.getTime() <= now.getTime()) {
    add("deadlineDate", "deadlinePassed");
  }

  if (draft.essayPrompt.trim().length > QUESTION_LIMIT) add("essayPrompt", "tooLong");

  return problems;
}

export function hasProblems(problems: DraftProblems): boolean {
  return Object.keys(problems).length > 0;
}

/** The body both POST and PATCH accept. Nulls clear a field on an edit. */
export function draftPayload(draft: VacancyDraft) {
  const sessions = sessionsOf(draft);
  const first = sessions[0] as DaySession;
  const last = sessions[sessions.length - 1] as DaySession;
  const startsAt = tashkentInstant(first.date, first.startTime) as Date;
  const endsAt = tashkentInstant(last.date, last.endTime) as Date;
  const deadline = tashkentInstant(draft.deadlineDate, draft.deadlineTime) as Date;
  const prompt = draft.essayPrompt.trim();
  const capacity = draft.capacity.trim();

  return {
    kind: draft.kind,
    title: draft.title.trim(),
    description: draft.description.trim(),
    format: draft.format,
    region: draft.region as Region,
    locationName: draft.locationName.trim() || null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    applicationDeadline: deadline.toISOString(),
    schedule: sessions,
    allDaysRequired: sessions.length > 1 ? draft.allDaysRequired : true,
    capacity: capacity ? Number(capacity) : null,
    estimatedTotalHours: estimatedHoursOf(draft),
    acceptanceMode: draft.acceptanceMode,
    essayRequired: prompt.length > 0,
    essayPrompt: prompt || null,
  };
}

export type DraftSource = {
  kind: VacancyKind;
  title: string;
  description: string;
  format: VacancyFormat;
  region: Region;
  locationName?: string | undefined;
  city?: string | undefined;
  startsAt: string;
  endsAt?: string | undefined;
  applicationDeadline: string;
  schedule?: readonly DaySession[] | undefined;
  allDaysRequired?: boolean | undefined;
  capacity?: number | undefined;
  acceptanceMode: AcceptanceMode;
  essayRequired: boolean;
  essayPrompt?: string | undefined;
};

/**
 * Turns a stored vacancy back into the wizard's fields. An older vacancy has
 * no daily schedule, so its start and end times become the daily times.
 */
export function draftFromVacancy(
  vacancy: DraftSource,
  standardQuestion: string,
): VacancyDraft {
  const start = tashkentParts(vacancy.startsAt);
  const end = tashkentParts(vacancy.endsAt ?? vacancy.startsAt);
  const deadline = tashkentParts(vacancy.applicationDeadline);
  const schedule = vacancy.schedule?.length ? vacancy.schedule : null;
  const first = schedule?.[0];
  const last = schedule?.[schedule.length - 1];
  const sameTimes =
    !schedule ||
    schedule.every(
      (session) =>
        session.startTime === first?.startTime && session.endTime === first?.endTime,
    );
  const legacyEnd = vacancy.endsAt && end.time > start.time ? end.time : "";

  return {
    kind: vacancy.kind,
    title: vacancy.title,
    description: vacancy.description,
    format: vacancy.format,
    region: vacancy.region,
    locationName: vacancy.locationName ?? vacancy.city ?? "",
    startDate: first?.date ?? start.date,
    endDate: last?.date ?? end.date,
    startTime: first?.startTime ?? start.time,
    endTime: first?.endTime ?? legacyEnd,
    sameTimes,
    days: Object.fromEntries(
      (schedule ?? []).map((session) => [
        session.date,
        { startTime: session.startTime, endTime: session.endTime },
      ]),
    ),
    allDaysRequired: vacancy.allDaysRequired ?? true,
    capacity: vacancy.capacity === undefined ? "" : String(vacancy.capacity),
    deadlineDate: deadline.date,
    deadlineTime: deadline.time,
    essayPrompt: vacancy.essayPrompt ?? (vacancy.essayRequired ? standardQuestion : ""),
    acceptanceMode: vacancy.acceptanceMode,
  };
}
