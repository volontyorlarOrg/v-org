import type { VacancyListItem } from "@/lib/api/schemas";
import { vacancyEditHref, vacancyHref } from "@/lib/routing/routes";
import { isAttendanceOpen, vacancyStateOf } from "@/lib/vacancies/approval";

/** Where a vacancy stands from the organization's point of view. */
export const CARD_STAGES = [
  "draft",
  "pending_review",
  "changes_requested",
  "published",
  "ended",
  "results",
  "rejected",
  "archived",
] as const;

export type CardStage = (typeof CARD_STAGES)[number];

export type CardAction =
  | "continue"
  | "feedback"
  | "submission"
  | "manage"
  | "attendance"
  | "results"
  | "decision"
  | "open";

export type CardCount =
  | { key: "toReview" | "applications" | "attendanceDue" | "attended"; count: number }
  | { key: "noApplications" };

export type VacancyCard = {
  stage: CardStage;
  action: CardAction;
  href: string;
  count: CardCount | null;
};

const EMPTY = {
  applications: 0,
  awaitingReview: 0,
  accepted: 0,
  attended: 0,
  attendanceResolved: 0,
};

export function cardStageOf(vacancy: VacancyListItem, now: Date): CardStage {
  const state = vacancyStateOf(vacancy);
  if (state !== "approved") return state;
  if (!isAttendanceOpen(vacancy, now)) return "published";
  const progress = vacancy.progress ?? EMPTY;
  return progress.accepted > 0 && progress.attendanceResolved >= progress.accepted
    ? "results"
    : "ended";
}

export function cardOf(vacancy: VacancyListItem, now: Date): VacancyCard {
  const stage = cardStageOf(vacancy, now);
  const progress = vacancy.progress ?? EMPTY;
  const detail = vacancyHref(vacancy.id);
  const sent: CardCount | null =
    progress.applications > 0
      ? { key: "applications", count: progress.applications }
      : null;

  switch (stage) {
    case "draft":
      return {
        stage,
        action: "continue",
        href: vacancyEditHref(vacancy.id),
        count: null,
      };
    case "changes_requested":
      return {
        stage,
        action: "feedback",
        href: vacancyEditHref(vacancy.id),
        count: sent,
      };
    case "pending_review":
      return { stage, action: "submission", href: detail, count: sent };
    case "published":
      return {
        stage,
        action: "manage",
        href: detail,
        count:
          progress.awaitingReview > 0
            ? { key: "toReview", count: progress.awaitingReview }
            : (sent ?? { key: "noApplications" }),
      };
    case "ended":
      return progress.accepted > 0
        ? {
            stage,
            action: "attendance",
            href: `${detail}#roll-call`,
            count: {
              key: "attendanceDue",
              count: progress.accepted - progress.attendanceResolved,
            },
          }
        : {
            stage,
            action: "open",
            href: detail,
            count: sent ?? { key: "noApplications" },
          };
    case "results":
      return {
        stage,
        action: "results",
        href: `${detail}#roll-call`,
        count: { key: "attended", count: progress.attended },
      };
    case "rejected":
      return { stage, action: "decision", href: detail, count: null };
    case "archived":
      return { stage, action: "open", href: detail, count: sent };
  }
}

export type CardFilters = { q?: string; stage?: CardStage; saved?: boolean };

export function filterCards(
  vacancies: readonly VacancyListItem[],
  { q, stage, saved }: CardFilters,
  now: Date,
): VacancyListItem[] {
  const term = q?.trim().toLocaleLowerCase() ?? "";
  return [...vacancies]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter((vacancy) => {
      if (saved && !vacancy.saved) return false;
      if (stage && cardStageOf(vacancy, now) !== stage) return false;
      if (!term) return true;
      return [vacancy.title, vacancy.locationName, vacancy.city, vacancy.description]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(term);
    });
}
