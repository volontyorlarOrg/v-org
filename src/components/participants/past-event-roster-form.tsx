"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { FormMessage } from "@/components/forms/form-message";
import {
  ParticipantPicker,
  type Participant,
  type ParticipantPickerLabels,
} from "@/components/participants/participant-picker";
import { Register } from "@/components/register/register";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { idleResult } from "@/lib/api/action-result";
import { createPastEventRosterAction } from "@/lib/past-event-rosters/actions";
import { filled, rosterTotals } from "@/lib/past-event-rosters/roster";
import { rosterInputSchema } from "@/lib/past-event-rosters/schemas";
import { navHref } from "@/lib/routing/routes";

export type RosterFormLabels = ParticipantPickerLabels &
  Record<
    | "steps"
    | "details"
    | "participants"
    | "review"
    | "title"
    | "date"
    | "note"
    | "usernameHelp"
    | "next"
    | "back"
    | "send"
    | "sending"
    | "cancel"
    | "reviewHelp"
    | "totals"
    | "zeroHours",
    string
  >;

export function PastEventRosterForm({
  locale,
  submissionId: initialId,
  latestDate,
  labels,
}: {
  locale: string;
  submissionId: string;
  latestDate: string;
  labels: RosterFormLabels;
}) {
  const [result, action, pending] = useActionState(
    createPastEventRosterAction,
    idleResult,
  );
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ title: "", eventDate: "", note: "" });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [validationError, setValidationError] = useState("");
  const [detailProblems, setDetailProblems] = useState<{
    title?: string;
    eventDate?: string;
  }>({});
  const [submissionId, setSubmissionId] = useState(initialId);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const payload = {
    ...details,
    submissionId,
    participants: participants.map(({ id, hours, xpAwarded }) => ({
      volunteerId: id,
      hours,
      xpAwarded,
    })),
  };
  const message = (code: string) => labels.errors[code] ?? labels.fallbackError;
  const renew = () => {
    setSubmissionId(crypto.randomUUID());
    setValidationError("");
  };
  const goTo = (next: number) => {
    setStep(next);
    setValidationError("");
    requestAnimationFrame(() => stepHeading.current?.focus());
  };
  const next = () => {
    if (step === 0) {
      const problems = {
        title: details.title.trim() ? undefined : message("required"),
        eventDate:
          /^\d{4}-\d{2}-\d{2}$/.test(details.eventDate) &&
          details.eventDate <= latestDate
            ? undefined
            : message("pastEventDateInvalid"),
      };
      setDetailProblems(problems);
      if (problems.title || problems.eventDate) {
        document
          .getElementById(problems.title ? "roster-title" : "roster-date")
          ?.focus();
        return;
      }
    } else {
      const parsed = rosterInputSchema.safeParse(payload);
      if (!parsed.success) {
        setValidationError(
          message(parsed.error.issues[0]?.message ?? "validationFailed"),
        );
        return;
      }
    }
    goTo(step + 1);
  };
  const totals = rosterTotals(participants);
  const dirty =
    !pending &&
    Boolean(details.title || details.eventDate || details.note || participants.length);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const error =
    validationError ||
    (result.status === "error"
      ? message(Object.values(result.fields).flat()[0] ?? result.code)
      : "");

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        if (step !== 2) {
          event.preventDefault();
          next();
        }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="roster" value={JSON.stringify(payload)} />
      <ol aria-label={labels.steps} className="flex flex-wrap gap-2">
        {[labels.details, labels.participants, labels.review].map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={
              step === index
                ? "rounded-full bg-action px-4 py-2 text-sm font-semibold text-knockout"
                : "rounded-full bg-surface-sunk px-4 py-2 text-sm text-ink-muted"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <fieldset disabled={pending} className="min-w-0">
        <h2 ref={stepHeading} tabIndex={-1} className="sr-only">
          {[labels.details, labels.participants, labels.review][step]}
        </h2>
        {step === 0 ? (
          <Register id="event-details" title={labels.details}>
            <div className="grid max-w-3xl gap-5 p-5">
              <Field invalid={Boolean(detailProblems.title)}>
                <FieldLabel htmlFor="roster-title">{labels.title}</FieldLabel>
                <Input
                  id="roster-title"
                  required
                  maxLength={160}
                  value={details.title}
                  aria-invalid={Boolean(detailProblems.title) || undefined}
                  aria-describedby={
                    detailProblems.title ? "roster-title-error" : undefined
                  }
                  onChange={(event) => {
                    setDetails({ ...details, title: event.target.value });
                    setDetailProblems({ ...detailProblems, title: undefined });
                    renew();
                  }}
                />
                <FieldError id="roster-title-error">{detailProblems.title}</FieldError>
              </Field>
              <Field invalid={Boolean(detailProblems.eventDate)}>
                <FieldLabel htmlFor="roster-date">{labels.date}</FieldLabel>
                <Input
                  id="roster-date"
                  type="date"
                  required
                  max={latestDate}
                  value={details.eventDate}
                  aria-invalid={Boolean(detailProblems.eventDate) || undefined}
                  aria-describedby={
                    detailProblems.eventDate ? "roster-date-error" : undefined
                  }
                  onChange={(event) => {
                    setDetails({ ...details, eventDate: event.target.value });
                    setDetailProblems({ ...detailProblems, eventDate: undefined });
                    renew();
                  }}
                />
                <FieldError id="roster-date-error">
                  {detailProblems.eventDate}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="roster-note">{labels.note}</FieldLabel>
                <Textarea
                  id="roster-note"
                  maxLength={500}
                  value={details.note}
                  onChange={(event) => {
                    setDetails({ ...details, note: event.target.value });
                    renew();
                  }}
                />
              </Field>
            </div>
          </Register>
        ) : null}
        {step === 1 ? (
          <Register
            id="event-participants"
            title={labels.participants}
            count={participants.length}
            description={labels.usernameHelp}
          >
            <ParticipantPicker
              idPrefix="roster"
              participants={participants}
              onChange={(next) => {
                setParticipants(next);
                renew();
              }}
              labels={labels}
            />
          </Register>
        ) : null}
        {step === 2 ? (
          <Register
            id="event-review"
            title={details.title}
            count={participants.length}
            description={labels.reviewHelp}
          >
            <div className="border-b border-border px-5 py-4">
              <p className="tabular text-sm text-ink-muted">
                <time dateTime={details.eventDate}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(`${details.eventDate}T00:00:00Z`))}
                </time>
              </p>
              {details.note ? (
                <p className="mt-2 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">
                  {details.note}
                </p>
              ) : null}
              <p className="tabular mt-3 text-sm font-semibold text-ink">
                {filled(labels.totals, {
                  count: totals.count,
                  hours: totals.hours,
                  xp: totals.xp,
                })}
              </p>
              {totals.zeroHours > 0 ? (
                <p
                  role="status"
                  className="mt-2 flex items-start gap-2 text-sm text-ink"
                >
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-ink-muted"
                  />
                  {filled(labels.zeroHours, { count: totals.zeroHours })}
                </p>
              ) : null}
            </div>
            <ul className="divide-y divide-border">
              {participants.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4"
                >
                  <p className="min-w-0 font-semibold [overflow-wrap:anywhere] text-ink">
                    {person.displayName ?? person.username}{" "}
                    <span className="font-normal text-ink-muted">
                      @{person.username}
                    </span>
                  </p>
                  <p className="tabular text-sm text-ink-muted">
                    {labels.hours}: {person.hours} · {labels.xp}: {person.xpAwarded}
                  </p>
                </li>
              ))}
            </ul>
          </Register>
        ) : null}
      </fieldset>
      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-paper py-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={navHref("pastEvents")}>{labels.cancel}</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => goTo(step - 1)}
            >
              {labels.back}
            </Button>
          ) : null}
          {step < 2 ? (
            <Button type="submit" size="sm">
              {labels.next}
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? labels.sending : labels.send}
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}
