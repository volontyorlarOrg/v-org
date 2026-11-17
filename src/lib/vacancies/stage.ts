import type { VacancyListItem } from "@/lib/api/schemas";
import { vacancyEditHref, vacancyHref } from "@/lib/routing/routes";
import { hasEventEnded, vacancyStateOf } from "@/lib/vacancies/approval";

/** Where a vacancy stands from the organization's point of view. */
export const LIST_STAGES = [
  "changes_requested",
  "results_returned",
  "ended",
  "draft",
  "pending_review",
  "verifying",
  "published",
  "results",
  "rejected",
  "archived",
] as const;

export type ListStage = (typeof LIST_STAGES)[number];

export type NextAction =
  | "continue"
  | "feedback"
  | "submission"
  | "manage"
  | "attendance"
  | "correct"
  | "results"
  | "decision"
  | "open";

export type NextStep = {
  stage: ListStage;
  action: NextAction;
  href: string;
  /** The organization holds this move, so the row's button is the primary one. */
  needsYou: boolean;
};

const EMPTY = {
  applications: 0,
  awaitingReview: 0,
  accepted: 0,
  attended: 0,
  attendanceResolved: 0,
};

export function progressOf(vacancy: VacancyListItem) {
  return vacancy.progress ?? EMPTY;
}

export function stageOf(vacancy: VacancyListItem, now: Date): ListStage {
  const state = vacancyStateOf(vacancy);
  if (state !== "approved") return state;
  if (!hasEventEnded(vacancy, now)) return "published";
  const sheet = vacancy.attendanceSheet;
  if (sheet?.status === "changes_requested") return "results_returned";
  if (sheet?.status === "submitted") return "verifying";
  if (sheet)
    return sheet.status === "verified" && !sheet.correction ? "results" : "ended";
  // Vacancies recorded before results were verified carry no sheet.
  const progress = progressOf(vacancy);
  return progress.accepted > 0 && progress.attendanceResolved >= progress.accepted
    ? "results"
    : "ended";
}

export function nextStepOf(vacancy: VacancyListItem, now: Date): NextStep {
  const stage = stageOf(vacancy, now);
  const progress = progressOf(vacancy);
  const detail = vacancyHref(vacancy.id);
  const tab = (name: "applications" | "attendance") => `${detail}?tab=${name}`;
  const step = (action: NextAction, href: string, needsYou = false): NextStep => ({
    stage,
    action,
    href,
    needsYou,
  });

  switch (stage) {
    case "draft":
      return step("continue", vacancyEditHref(vacancy.id), true);
    case "changes_requested":
      return step("feedback", vacancyEditHref(vacancy.id), true);
    case "pending_review":
      return step("submission", detail);
    case "published":
      return step("manage", tab("applications"), progress.awaitingReview > 0);
    case "ended":
      return progress.accepted > 0 || (vacancy.manualAttendance?.total ?? 0) > 0
        ? step("attendance", tab("attendance"), true)
        : step("open", detail);
    case "results_returned":
      return step("correct", tab("attendance"), true);
    case "verifying":
    case "results":
      return step("results", tab("attendance"));
    case "rejected":
      return step("decision", detail);
    case "archived":
      return step("open", detail);
  }
}

export const BOARD_LANES = ["yours", "administrator", "live", "finished"] as const;

export type BoardLane = (typeof BOARD_LANES)[number];

/** The board groups vacancies by whose move it is, using the same next step as the list. */
export function laneOf(vacancy: VacancyListItem, now: Date): BoardLane {
  const next = nextStepOf(vacancy, now);
  if (next.needsYou) return "yours";
  if (next.stage === "pending_review" || next.stage === "verifying")
    return "administrator";
  if (next.stage === "published") return "live";
  return "finished";
}

const LANE_ORDER: readonly ListStage[] = [
  "changes_requested",
  "results_returned",
  "ended",
  "published",
  "draft",
  "pending_review",
  "verifying",
  "results",
  "rejected",
  "archived",
];

export function laneVacancies(
  vacancies: readonly VacancyListItem[],
  now: Date,
): Record<BoardLane, VacancyListItem[]> {
  const lanes: Record<BoardLane, VacancyListItem[]> = {
    yours: [],
    administrator: [],
    live: [],
    finished: [],
  };
  const urgency = (vacancy: VacancyListItem) =>
    LANE_ORDER.indexOf(stageOf(vacancy, now));
  const ordered = [...vacancies].sort((a, b) => urgency(a) - urgency(b));
  for (const vacancy of ordered) lanes[laneOf(vacancy, now)].push(vacancy);
  return lanes;
}

export type VacancyListFilters = { q?: string; stage?: ListStage; saved?: boolean };

function matches(vacancy: VacancyListItem, term: string): boolean {
  return [vacancy.title, vacancy.locationName, vacancy.city, vacancy.description]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()
    .includes(term);
}

export function filterVacancyList(
  vacancies: readonly VacancyListItem[],
  { q, stage, saved }: VacancyListFilters,
  now: Date,
): VacancyListItem[] {
  const term = q?.trim().toLocaleLowerCase() ?? "";
  return [...vacancies]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter((vacancy) => {
      if (saved && !vacancy.saved) return false;
      if (stage && stageOf(vacancy, now) !== stage) return false;
      return !term || matches(vacancy, term);
    });
}

/** Tab counts follow the search, so a count always matches what the tab will show. */
export function countByStage(
  vacancies: readonly VacancyListItem[],
  q: string,
  now: Date,
): Record<ListStage, number> & { all: number; saved: number } {
  const term = q.trim().toLocaleLowerCase();
  const found = term ? vacancies.filter((item) => matches(item, term)) : vacancies;
  const counts = Object.fromEntries(LIST_STAGES.map((stage) => [stage, 0])) as Record<
    ListStage,
    number
  >;
  for (const vacancy of found) counts[stageOf(vacancy, now)] += 1;
  return {
    ...counts,
    all: found.length,
    saved: found.filter((vacancy) => vacancy.saved).length,
  };
}
