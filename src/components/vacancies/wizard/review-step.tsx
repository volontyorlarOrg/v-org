"use client";

import {
  Building2,
  CalendarDays,
  Clock3,
  ImageOff,
  MapPin,
  PencilLine,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { WizardOrganization } from "@/components/vacancies/wizard/details-step";
import {
  ATTENDED_EVENT_XP,
  CONFIRMED_HOUR_XP,
  estimatedHoursOf,
  sessionsOf,
  tashkentInstant,
  type VacancyDraft,
  type WizardStep,
} from "@/lib/vacancies/draft";

function Fact({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-ink">{title}</p>
        {children ? (
          <div className="mt-0.5 leading-snug text-ink-muted">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export function useScheduleText(draft: VacancyDraft) {
  const t = useTranslations("vacancies.wizard");
  const format = useFormatter();
  const sessions = sessionsOf(draft);
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const long = { day: "numeric", month: "long", year: "numeric" } as const;

  const dates =
    first && last
      ? first.date === last.date
        ? format.dateTime(tashkentInstant(first.date, "12:00") as Date, long)
        : format.dateTimeRange(
            tashkentInstant(first.date, "12:00") as Date,
            tashkentInstant(last.date, "12:00") as Date,
            long,
          )
      : "";
  const sameTimes = sessions.every(
    (session) =>
      session.startTime === first?.startTime && session.endTime === first?.endTime,
  );
  const daily = first
    ? sameTimes
      ? sessions.length > 1
        ? t("eachDay", { time: `${first.startTime}–${first.endTime}` })
        : `${first.startTime}–${first.endTime}`
      : t("varies")
    : "";
  const attendance =
    sessions.length > 1
      ? draft.allDaysRequired
        ? t("allDays", { count: sessions.length })
        : t("anyDays")
      : null;
  const deadlineAt = tashkentInstant(draft.deadlineDate, draft.deadlineTime);
  const deadline = deadlineAt
    ? format.dateTime(deadlineAt, {
        ...long,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : "";

  return { sessions, sameTimes, dates, daily, attendance, deadline };
}

export function ReviewStep({
  draft,
  organization,
  cover,
  regionName,
  onEdit,
  formatHours,
}: {
  draft: VacancyDraft;
  organization: WizardOrganization;
  cover: string | null;
  regionName: string;
  onEdit: (step: WizardStep) => void;
  formatHours: (hours: number) => string;
}) {
  const t = useTranslations("vacancies.wizard");
  const kinds = useTranslations("vacancies.kinds");
  const format = useFormatter();
  const schedule = useScheduleText(draft);
  const hours = estimatedHoursOf(draft);
  const prompt = draft.essayPrompt.trim();
  const location = [draft.locationName.trim(), regionName].filter(Boolean).join(", ");
  const capacity = draft.capacity.trim();
  const volunteering = draft.kind === "volunteering";

  const reward = volunteering
    ? t("rewardHour", { xp: CONFIRMED_HOUR_XP })
    : t("rewardCompetition", { xp: ATTENDED_EVENT_XP });
  const rewardDetail = volunteering
    ? [
        t("rewardAttend", { xp: ATTENDED_EVENT_XP }),
        hours === null ? null : t("commitment", { hours }),
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const rows: { term: string; value: ReactNode }[] = [
    { term: t("facts.title"), value: draft.title.trim() },
    { term: t("facts.organization"), value: organization.name },
    { term: t("facts.type"), value: kinds(draft.kind) },
    { term: t("facts.format"), value: t(`formats.${draft.format}.label`) },
    { term: t("facts.dates"), value: schedule.dates },
    {
      term: t("facts.dailyTime"),
      value: schedule.sameTimes ? (
        schedule.daily
      ) : (
        <ul className="flex flex-col gap-0.5">
          {schedule.sessions.map((session) => (
            <li key={session.date} className="tabular">
              {format.dateTime(tashkentInstant(session.date, "12:00") as Date, {
                day: "numeric",
                month: "short",
              })}
              {": "}
              {session.startTime}–{session.endTime}
            </li>
          ))}
        </ul>
      ),
    },
    ...(schedule.attendance
      ? [{ term: t("facts.attendance"), value: schedule.attendance }]
      : []),
    { term: t("facts.location"), value: location },
    {
      term: t("facts.places"),
      value: capacity ? format.number(Number(capacity)) : t("noLimit"),
    },
    {
      term: t("facts.deadline"),
      value: (
        <>
          {schedule.deadline}
          <span className="block text-xs text-ink-muted">{t("tashkentTime")}</span>
        </>
      ),
    },
    ...(hours === null
      ? []
      : [
          {
            term: t("facts.hours"),
            value:
              schedule.sessions.length > 1 && !draft.allDaysRequired
                ? t("hoursPerDay", { hours: formatHours(hours) })
                : t("hoursFact", { hours }),
          },
        ]),
    { term: t("facts.reward"), value: reward },
    {
      term: t("facts.acceptance"),
      value: t(`acceptanceModes.${draft.acceptanceMode}.label`),
    },
  ];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section
        aria-labelledby="wizard-review-preview"
        className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="wizard-review-preview" className="text-section text-ink">
              {t("reviewTitle")}
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">{t("reviewDescription")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="row"
            onClick={() => onEdit("details")}
          >
            <PencilLine aria-hidden="true" />
            <span className="max-sm:sr-only">{t("editDetails")}</span>
          </Button>
        </div>

        <article className="mt-4 overflow-hidden rounded-lg border border-border">
          {cover ? (
            <Image
              unoptimized
              src={cover}
              alt=""
              width={1200}
              height={600}
              className="aspect-[2/1] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[3/1] w-full place-items-center bg-[linear-gradient(135deg,var(--color-primary-muted),var(--color-surface-soft))] text-primary-ink">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ImageOff aria-hidden="true" className="size-5" />
                {t("noCover")}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <h4 className="text-2xl leading-tight font-semibold text-balance text-ink">
              {draft.title.trim()}
            </h4>
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Building2 aria-hidden="true" className="size-4" />
              {organization.name}
            </p>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-surface-soft px-3 py-1 text-xs font-semibold text-primary-ink">
              {volunteering ? (
                <UsersRound aria-hidden="true" className="size-3.5" />
              ) : (
                <Trophy aria-hidden="true" className="size-3.5" />
              )}
              {kinds(draft.kind)}
            </span>
            <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-ink">
              {draft.description.trim()}
            </p>
            <div className="grid gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-2 2xl:grid-cols-3">
              <Fact icon={<CalendarDays />} title={schedule.dates}>
                <p>{schedule.daily}</p>
                {schedule.attendance ? <p>{schedule.attendance}</p> : null}
              </Fact>
              <Fact icon={<MapPin />} title={location} />
              <Fact
                icon={<UsersRound />}
                title={
                  capacity
                    ? t("placesValue", { count: Number(capacity) })
                    : t("noLimit")
                }
              />
              <Fact icon={<Clock3 />} title={t("applyBy", { when: schedule.deadline })}>
                {t("tashkentTime")}
              </Fact>
              <Fact icon={<Sparkles />} title={reward}>
                {rewardDetail}
              </Fact>
            </div>
          </div>
        </article>
      </section>

      <aside className="flex min-w-0 flex-col gap-5">
        <section
          aria-labelledby="wizard-review-facts"
          className="rounded-xl border border-border bg-surface"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 id="wizard-review-facts" className="text-section text-ink">
              {t("keyDetails")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="row"
              onClick={() => onEdit("schedule")}
            >
              <PencilLine aria-hidden="true" />
              {t("edit")}
              <span className="sr-only"> — {t("editSchedule")}</span>
            </Button>
          </header>
          <dl className="divide-y divide-border px-4">
            {rows.map((row) => (
              <div
                key={row.term}
                className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2.5 text-sm"
              >
                <dt className="text-ink-muted">{row.term}</dt>
                <dd className="min-w-0 font-medium break-words text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="wizard-review-question"
          className="rounded-xl border border-border bg-surface"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 id="wizard-review-question" className="text-section text-ink">
              {t("question")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="row"
              onClick={() => onEdit("schedule")}
            >
              <PencilLine aria-hidden="true" />
              {t("edit")}
              <span className="sr-only"> — {t("editQuestion")}</span>
            </Button>
          </header>
          <div className="px-4 py-3">
            {prompt ? (
              <div className="rounded-lg border border-border bg-surface-sunk/60 px-4 py-3">
                <p className="text-sm font-semibold text-ink">{prompt}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {t("questionPreviewHelp")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">{t("noQuestion")}</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
