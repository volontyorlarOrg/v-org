"use client";

import {
  CalendarDays,
  Clock3,
  FileQuestion,
  MapPin,
  MonitorSmartphone,
  UsersRound,
  Video,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FieldShell, fieldIds } from "@/components/vacancies/wizard/field-shell";
import { InfoTip } from "@/components/vacancies/wizard/info-tip";
import {
  ACCEPTANCE_MODES,
  VACANCY_FORMATS,
  type Region,
  type VacancyFormat,
} from "@/lib/domain/vocabulary";
import {
  QUESTION_LIMIT,
  estimatedHoursOf,
  sessionsOf,
  tashkentInstant,
  type VacancyDraft,
} from "@/lib/vacancies/draft";
import { cn } from "@/lib/utils";

const FORMAT_ICON = {
  onsite: MapPin,
  remote: Video,
  hybrid: MonitorSmartphone,
} as const;

function IconInput({
  icon,
  className,
  ...props
}: ComponentProps<typeof Input> & { icon: ReactNode }) {
  return (
    <span className="relative block">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted [&_svg]:size-4.5"
      >
        {icon}
      </span>
      <Input
        className={cn(
          "pl-11",
          // Chromium draws its own picker icon; it stays clickable across the
          // whole field but invisible, so only the leading icon shows.
          "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          className,
        )}
        {...props}
      />
    </span>
  );
}

function Check({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 cursor-pointer rounded accent-action"
      />
      {children}
    </label>
  );
}

export function ScheduleStep({
  draft,
  set,
  error,
  regions,
  formatHours,
}: {
  draft: VacancyDraft;
  set: <K extends keyof VacancyDraft>(field: K, value: VacancyDraft[K]) => void;
  error: (field: string) => string | undefined;
  regions: readonly Region[];
  formatHours: (hours: number) => string;
}) {
  const t = useTranslations("vacancies.wizard");
  const vocabulary = useTranslations("vocabulary");
  const format = useFormatter();
  const sessions = sessionsOf(draft);
  const multiDay = sessions.length > 1;
  const hours = estimatedHoursOf(draft);
  const online = draft.format === "remote";
  const invalid = (field: string) => Boolean(error(field)) || undefined;

  const dayLabel = (date: string) =>
    format.dateTime(tashkentInstant(date, "12:00") as Date, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const setDay = (date: string, key: "startTime" | "endTime", value: string) => {
    const current = draft.days[date] ?? {
      startTime: draft.startTime,
      endTime: draft.endTime,
    };
    set("days", { ...draft.days, [date]: { ...current, [key]: value } });
  };

  return (
    <div className="flex flex-col gap-6">
      <FieldShell id="wizard-format" label={t("format")} required as="fieldset">
        <div className="grid gap-3 sm:grid-cols-3">
          {VACANCY_FORMATS.map((value: VacancyFormat) => {
            const Icon = FORMAT_ICON[value];
            return (
              <label
                key={value}
                className={cn(
                  "flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  "border-border-control hover:border-primary-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                  "has-checked:border-primary has-checked:bg-surface-soft",
                )}
              >
                <input
                  type="radio"
                  name="wizard-format"
                  value={value}
                  checked={draft.format === value}
                  onChange={() => set("format", value)}
                  className="size-4.5 shrink-0 accent-action"
                />
                <Icon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-primary-ink"
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {t(`formats.${value}.label`)}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {t(`formats.${value}.hint`)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </FieldShell>

      <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
        <FieldShell
          id="wizard-region"
          label={t("region")}
          required
          error={error("region")}
        >
          <NativeSelect
            id="wizard-region"
            value={draft.region}
            onChange={(event) => set("region", event.target.value as Region)}
            aria-required
            aria-invalid={invalid("region")}
            aria-describedby={fieldIds(
              "wizard-region",
              false,
              Boolean(error("region")),
            )}
          >
            <NativeSelectOption value="" disabled>
              {t("regionChoose")}
            </NativeSelectOption>
            {regions.map((region) => (
              <NativeSelectOption key={region} value={region}>
                {vocabulary(`regions.${region}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldShell>

        <FieldShell
          id="wizard-location"
          label={online ? t("onlineVenue") : t("venue")}
          required
          help={online ? t("venueHelp") : undefined}
          error={error("locationName")}
        >
          <IconInput
            id="wizard-location"
            icon={online ? <Video /> : <MapPin />}
            value={draft.locationName}
            autoComplete="off"
            placeholder={online ? t("onlineVenuePlaceholder") : t("venuePlaceholder")}
            onChange={(event) => set("locationName", event.target.value)}
            aria-required
            aria-invalid={invalid("locationName")}
            aria-describedby={fieldIds(
              "wizard-location",
              online,
              Boolean(error("locationName")),
            )}
          />
        </FieldShell>

        <FieldShell
          id="wizard-start-date"
          label={t("startDate")}
          required
          error={error("startDate")}
        >
          <IconInput
            id="wizard-start-date"
            type="date"
            icon={<CalendarDays />}
            value={draft.startDate}
            onChange={(event) => {
              const value = event.target.value;
              set("startDate", value);
              if (!draft.endDate || draft.endDate < value) set("endDate", value);
            }}
            aria-required
            aria-invalid={invalid("startDate")}
            aria-describedby={fieldIds(
              "wizard-start-date",
              false,
              Boolean(error("startDate")),
            )}
          />
        </FieldShell>

        <FieldShell
          id="wizard-end-date"
          label={t("endDate")}
          required
          error={error("endDate")}
        >
          <IconInput
            id="wizard-end-date"
            type="date"
            icon={<CalendarDays />}
            min={draft.startDate || undefined}
            value={draft.endDate}
            onChange={(event) => set("endDate", event.target.value)}
            aria-required
            aria-invalid={invalid("endDate")}
            aria-describedby={fieldIds(
              "wizard-end-date",
              false,
              Boolean(error("endDate")),
            )}
          />
        </FieldShell>

        <FieldShell
          id="wizard-start-time"
          label={t("startTime")}
          required
          error={error("startTime")}
        >
          <IconInput
            id="wizard-start-time"
            type="time"
            step={300}
            icon={<Clock3 />}
            value={draft.startTime}
            onChange={(event) => set("startTime", event.target.value)}
            aria-required
            aria-invalid={invalid("startTime")}
            aria-describedby={fieldIds(
              "wizard-start-time",
              false,
              Boolean(error("startTime")),
            )}
          />
        </FieldShell>

        <FieldShell
          id="wizard-end-time"
          label={t("endTime")}
          required
          error={error("endTime")}
        >
          <IconInput
            id="wizard-end-time"
            type="time"
            step={300}
            icon={<Clock3 />}
            value={draft.endTime}
            onChange={(event) => set("endTime", event.target.value)}
            aria-required
            aria-invalid={invalid("endTime")}
            aria-describedby={fieldIds(
              "wizard-end-time",
              false,
              Boolean(error("endTime")),
            )}
          />
        </FieldShell>
      </div>

      {multiDay ? (
        <div className="-mt-2 flex flex-col gap-1">
          <div className="flex flex-wrap gap-x-8">
            <Check
              id="wizard-same-times"
              checked={draft.sameTimes}
              onChange={(value) => set("sameTimes", value)}
            >
              {t("sameTimes")}
            </Check>
            <Check
              id="wizard-all-days"
              checked={draft.allDaysRequired}
              onChange={(value) => set("allDaysRequired", value)}
            >
              {t("allDaysRequired")}
            </Check>
          </div>

          {draft.sameTimes ? null : (
            <fieldset className="mt-2 rounded-lg border border-border bg-surface-sunk/50 px-4 py-3">
              <legend className="px-1 text-sm font-semibold text-ink">
                {t("perDay")}
              </legend>
              <ul className="flex flex-col divide-y divide-border">
                {sessions.map((session) => {
                  const day = dayLabel(session.date);
                  const problem = error(`day-${session.date}`);
                  return (
                    <li
                      key={session.date}
                      className="grid items-center gap-2 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3"
                    >
                      <span className="tabular text-sm font-semibold text-ink">
                        {day}
                      </span>
                      <Input
                        type="time"
                        step={300}
                        value={session.startTime}
                        aria-label={t("dayStart", { day })}
                        aria-invalid={Boolean(problem) || undefined}
                        onChange={(event) =>
                          setDay(session.date, "startTime", event.target.value)
                        }
                        className="min-h-10"
                      />
                      <Input
                        type="time"
                        step={300}
                        value={session.endTime}
                        aria-label={t("dayEnd", { day })}
                        aria-invalid={Boolean(problem) || undefined}
                        onChange={(event) =>
                          setDay(session.date, "endTime", event.target.value)
                        }
                        className="min-h-10"
                      />
                      {problem ? (
                        <p
                          role="alert"
                          className="text-sm font-medium text-danger-ink sm:col-span-3"
                        >
                          {problem}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}
        </div>
      ) : null}

      <div className="grid gap-x-5 gap-y-5 border-t border-border pt-6 md:grid-cols-2">
        <FieldShell
          id="wizard-capacity"
          label={t(`places.${draft.kind}`)}
          required={draft.kind === "volunteering"}
          help={draft.kind === "competition" ? t("placesHelp") : undefined}
          error={error("capacity")}
        >
          <IconInput
            id="wizard-capacity"
            inputMode="numeric"
            icon={<UsersRound />}
            value={draft.capacity}
            onChange={(event) =>
              set("capacity", event.target.value.replace(/[^\d]/g, ""))
            }
            aria-required={draft.kind === "volunteering" || undefined}
            aria-invalid={invalid("capacity")}
            aria-describedby={fieldIds(
              "wizard-capacity",
              draft.kind === "competition",
              Boolean(error("capacity")),
            )}
          />
        </FieldShell>

        <FieldShell
          id="wizard-deadline-date"
          label={t("deadline")}
          required
          help={t("tashkentTime")}
          error={error("deadlineDate") ?? error("deadlineTime")}
        >
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
            <IconInput
              id="wizard-deadline-date"
              type="date"
              icon={<CalendarDays />}
              max={draft.startDate || undefined}
              value={draft.deadlineDate}
              onChange={(event) => set("deadlineDate", event.target.value)}
              aria-label={t("deadlineDate")}
              aria-required
              aria-invalid={invalid("deadlineDate")}
              aria-describedby={fieldIds(
                "wizard-deadline-date",
                true,
                Boolean(error("deadlineDate") ?? error("deadlineTime")),
              )}
            />
            <IconInput
              id="wizard-deadline-time"
              type="time"
              step={300}
              icon={<Clock3 />}
              value={draft.deadlineTime}
              onChange={(event) => set("deadlineTime", event.target.value)}
              aria-label={t("deadlineTime")}
              aria-required
              aria-invalid={invalid("deadlineTime")}
              aria-describedby="wizard-deadline-date-help"
            />
          </div>
        </FieldShell>

        {draft.kind === "volunteering" ? (
          <FieldShell id="wizard-hours" label={t("hours")} help={t("hoursInfo")}>
            <output
              id="wizard-hours"
              aria-live="polite"
              className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface-sunk/60 px-4 text-base text-ink"
            >
              <Clock3 aria-hidden="true" className="size-4.5 text-ink-muted" />
              {hours === null ? (
                <span className="text-ink-muted">{t("hoursPending")}</span>
              ) : multiDay && !draft.allDaysRequired ? (
                t("hoursPerDay", { hours: formatHours(hours) })
              ) : (
                t("hoursValue", { hours: formatHours(hours) })
              )}
            </output>
          </FieldShell>
        ) : null}

        <FieldShell
          id="wizard-question"
          label={t("question")}
          info={<InfoTip label={t("questionInfoLabel")}>{t("questionInfo")}</InfoTip>}
          help={t("questionHelp")}
          error={error("essayPrompt")}
        >
          <span className="relative flex min-h-12 items-center rounded-lg border border-input bg-field transition-colors focus-within:border-primary-ink hover:border-primary-ink has-aria-invalid:border-danger">
            <FileQuestion
              aria-hidden="true"
              className="ml-4 size-4.5 shrink-0 text-ink-muted"
            />
            <span
              aria-hidden="true"
              className="ml-3 shrink-0 text-sm text-ink-muted max-sm:hidden"
            >
              {t("questionPrefix")}
            </span>
            <input
              id="wizard-question"
              value={draft.essayPrompt}
              maxLength={QUESTION_LIMIT + 20}
              autoComplete="off"
              placeholder={t("questionPlaceholder")}
              onChange={(event) => set("essayPrompt", event.target.value)}
              aria-invalid={invalid("essayPrompt")}
              aria-describedby={fieldIds(
                "wizard-question",
                true,
                Boolean(error("essayPrompt")),
              )}
              className="min-h-12 w-full min-w-0 bg-transparent px-2 pr-4 text-base text-ink outline-none placeholder:text-muted-foreground"
            />
          </span>
        </FieldShell>
      </div>

      <FieldShell id="wizard-acceptance" label={t("acceptance")} as="fieldset">
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCEPTANCE_MODES.map((mode) => (
            <label
              key={mode}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-control px-4 py-3 transition-colors hover:border-primary-ink has-checked:border-primary has-checked:bg-surface-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
            >
              <input
                type="radio"
                name="wizard-acceptance"
                value={mode}
                checked={draft.acceptanceMode === mode}
                onChange={() => set("acceptanceMode", mode)}
                className="mt-0.5 size-4.5 shrink-0 accent-action"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t(`acceptanceModes.${mode}.label`)}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                  {t(`acceptanceModes.${mode}.hint`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </FieldShell>
    </div>
  );
}
