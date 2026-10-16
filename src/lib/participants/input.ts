import { z } from "zod";

export const PAST_EVENT_NOTE_MAX = 500;

const decimalHours = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/, "hoursAmount")
  .transform(Number)
  .pipe(z.number().min(0, "hoursAmount").max(999, "hoursAmount"));

const awardedXp = z
  .string()
  .trim()
  .regex(/^\d{1,6}$/, "xpAmount")
  .transform(Number)
  .pipe(z.number().int().min(0, "xpAmount").max(100_000, "xpAmount"));

const fields = {
  title: z.string().trim().min(1, "required").max(160, "tooLong"),
  eventDate: z.iso.date("pastEventDateInvalid"),
  hours: decimalHours,
  xpAwarded: awardedXp,
};

export const pastEventProposalSchema = z.object({
  ...fields,
  note: z.string().trim().max(PAST_EVENT_NOTE_MAX, "tooLong"),
});

export const pastEventChangeSchema = z.object({
  ...fields,
  note: z.string().trim().min(1, "required").max(PAST_EVENT_NOTE_MAX, "tooLong"),
});

export const pastEventRemovalSchema = z.object({
  note: z.string().trim().min(1, "required").max(PAST_EVENT_NOTE_MAX, "tooLong"),
});

export function yesterdayInTashkent(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(now.getTime() - 86_400_000))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
