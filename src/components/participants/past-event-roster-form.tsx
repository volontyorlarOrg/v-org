"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormMessage } from "@/components/forms/form-message";
import { Register, RegisterNote } from "@/components/register/register";
import { Avatar } from "@/components/portal/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { idleResult } from "@/lib/api/action-result";
import {
  createPastEventRosterAction,
  findPastEventVolunteerAction,
} from "@/lib/past-event-rosters/actions";
import {
  rosterInputSchema,
  type RosterVolunteer,
} from "@/lib/past-event-rosters/schemas";
import { navHref } from "@/lib/routing/routes";

export type RosterFormLabels = Record<
  | "details"
  | "participants"
  | "review"
  | "title"
  | "date"
  | "note"
  | "username"
  | "usernameHelp"
  | "find"
  | "finding"
  | "hours"
  | "xp"
  | "remove"
  | "empty"
  | "emptyHelp"
  | "next"
  | "back"
  | "send"
  | "sending"
  | "cancel"
  | "approvalHelp"
  | "limit"
  | "reviewHelp",
  string
> & { errors: Record<string, string>; fallbackError: string };

type Participant = RosterVolunteer & { hours: string; xpAwarded: string };

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
  const [username, setUsername] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [finding, startFinding] = useTransition();
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
      if (!details.title.trim()) {
        setValidationError(message("required"));
        return;
      }
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(details.eventDate) ||
        details.eventDate > latestDate
      ) {
        setValidationError(message("pastEventDateInvalid"));
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
  const findVolunteer = () => {
    setLookupError("");
    startFinding(async () => {
      try {
        const found = await findPastEventVolunteerAction(username);
        if (found.result.status !== "ok" || !found.volunteer) {
          setLookupError(
            message(found.result.status === "error" ? found.result.code : "server"),
          );
          return;
        }
        const volunteer = found.volunteer;
        if (participants.some((person) => person.id === volunteer.id)) {
          setLookupError(message("pastEventRosterDuplicate"));
          return;
        }
        setParticipants((current) => [
          ...current,
          { ...volunteer, hours: "0", xpAwarded: "0" },
        ]);
        setUsername("");
        renew();
      } catch {
        setLookupError(labels.fallbackError);
      }
    });
  };
  const updateAmount = (id: string, key: "hours" | "xpAwarded", value: string) => {
    setParticipants((current) =>
      current.map((person) =>
        person.id === id ? { ...person, [key]: value } : person,
      ),
    );
    renew();
  };
  const error =
    validationError ||
    (result.status === "error"
      ? message(Object.values(result.fields).flat()[0] ?? result.code)
      : "");

  return (
    <form
      action={action}
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
      <ol aria-label={labels.review} className="flex flex-wrap gap-2">
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
              <Field>
                <FieldLabel htmlFor="roster-title">{labels.title}</FieldLabel>
                <Input
                  id="roster-title"
                  required
                  maxLength={160}
                  value={details.title}
                  onChange={(event) => {
                    setDetails({ ...details, title: event.target.value });
                    renew();
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="roster-date">{labels.date}</FieldLabel>
                <Input
                  id="roster-date"
                  type="date"
                  required
                  max={latestDate}
                  value={details.eventDate}
                  onChange={(event) => {
                    setDetails({ ...details, eventDate: event.target.value });
                    renew();
                  }}
                />
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
            <div className="border-b border-border p-5">
              <Field>
                <FieldLabel htmlFor="roster-username">{labels.username}</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="roster-username"
                    className="sm:max-w-sm"
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={33}
                    value={username}
                    disabled={finding || participants.length >= 100}
                    aria-describedby="roster-lookup-help"
                    aria-invalid={Boolean(lookupError) || undefined}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setLookupError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (username.trim() && !finding && participants.length < 100)
                          findVolunteer();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={finding || !username.trim() || participants.length >= 100}
                    onClick={findVolunteer}
                  >
                    <Plus aria-hidden="true" />
                    {finding ? labels.finding : labels.find}
                  </Button>
                </div>
                <FieldError id="roster-lookup-error">{lookupError}</FieldError>
                <p id="roster-lookup-help" className="text-xs text-ink-muted">
                  {participants.length >= 100 ? labels.limit : labels.approvalHelp}
                </p>
              </Field>
            </div>
            {participants.length === 0 ? (
              <RegisterNote title={labels.empty} description={labels.emptyHelp} />
            ) : (
              <ul className="divide-y divide-border">
                {participants.map((person) => (
                  <li
                    key={person.id}
                    className="flex flex-wrap items-end gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 flex-1 basis-52 items-center gap-3 self-center">
                      <Avatar
                        name={person.displayName ?? undefined}
                        src={person.avatarUrl ?? undefined}
                        size="sm"
                        person
                      />
                      <div className="min-w-0">
                        <p className="font-semibold [overflow-wrap:anywhere] text-ink">
                          {person.displayName ?? person.username}
                        </p>
                        <p className="text-sm [overflow-wrap:anywhere] text-ink-muted">
                          @{person.username}
                        </p>
                      </div>
                    </div>
                    <div className="grid min-w-0 flex-1 basis-52 grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor={`hours-${person.id}`}>
                          {labels.hours}
                        </FieldLabel>
                        <Input
                          id={`hours-${person.id}`}
                          aria-label={`${labels.hours} @${person.username}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={999}
                          step="0.01"
                          required
                          value={person.hours}
                          onChange={(event) =>
                            updateAmount(person.id, "hours", event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`xp-${person.id}`}>{labels.xp}</FieldLabel>
                        <Input
                          id={`xp-${person.id}`}
                          aria-label={`${labels.xp} @${person.username}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100000}
                          step={1}
                          required
                          value={person.xpAwarded}
                          onChange={(event) =>
                            updateAmount(person.id, "xpAwarded", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${labels.remove} @${person.username}`}
                      onClick={() => {
                        setParticipants((current) =>
                          current.filter((item) => item.id !== person.id),
                        );
                        renew();
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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
              <p className="tabular text-sm text-ink-muted">{details.eventDate}</p>
              {details.note ? (
                <p className="mt-2 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">
                  {details.note}
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
            <Button type="submit" size="sm" disabled={finding}>
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
