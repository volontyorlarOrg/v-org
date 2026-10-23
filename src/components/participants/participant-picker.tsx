"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { RegisterNote } from "@/components/register/register";
import { Avatar } from "@/components/portal/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { findPastEventVolunteersAction } from "@/lib/past-event-rosters/actions";
import {
  amountProblem,
  ROSTER_LIMIT,
  usernamesIn,
} from "@/lib/past-event-rosters/roster";
import type { RosterVolunteer } from "@/lib/past-event-rosters/schemas";

export type Participant = RosterVolunteer & { hours: string; xpAwarded: string };

export type ParticipantPickerLabels = Record<
  | "username"
  | "usernameHint"
  | "find"
  | "finding"
  | "notFound"
  | "alreadyAdded"
  | "everyone"
  | "everyoneHelp"
  | "apply"
  | "hours"
  | "xp"
  | "remove"
  | "empty"
  | "emptyHelp"
  | "limit",
  string
> & { errors: Record<string, string>; fallbackError: string };

type Amounts = { hours: string; xpAwarded: string };

const START: Amounts = { hours: "0", xpAwarded: "0" };

function listed(template: string, names: readonly string[]) {
  return template.replace("{names}", names.map((name) => `@${name}`).join(", "));
}

export function ParticipantPicker({
  idPrefix,
  participants,
  onChange,
  taken = [],
  labels,
}: {
  idPrefix: string;
  participants: readonly Participant[];
  onChange: (next: Participant[]) => void;
  taken?: readonly string[];
  labels: ParticipantPickerLabels;
}) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");
  const [everyone, setEveryone] = useState<Amounts>(START);
  const [everyoneProblems, setEveryoneProblems] = useState<Partial<Amounts>>({});
  const [finding, startFinding] = useTransition();
  const room = ROSTER_LIMIT - taken.length - participants.length;
  const message = (code: string) => labels.errors[code] ?? labels.fallbackError;
  const id = (name: string) => `${idPrefix}-${name}`;
  const startingAmounts = (): Amounts =>
    amountProblem("hours", everyone.hours) ||
    amountProblem("xpAwarded", everyone.xpAwarded)
      ? START
      : { hours: everyone.hours.trim(), xpAwarded: everyone.xpAwarded.trim() };

  const add = () => {
    const { valid, invalid } = usernamesIn(text);
    if (valid.length + invalid.length === 0) return;
    setProblem("");
    setNote("");
    const onList = new Set(participants.map((person) => person.username.toLowerCase()));
    const wanted = valid.filter((name) => !onList.has(name));
    const alreadyAdded = valid.filter((name) => onList.has(name));
    startFinding(async () => {
      try {
        const answer = wanted.length
          ? await findPastEventVolunteersAction(wanted.slice(0, Math.max(room, 0)))
          : { result: { status: "ok" as const }, found: [], missing: [] };
        const takenIds = new Set([
          ...taken,
          ...participants.map((person) => person.id),
        ]);
        const fresh = answer.found.filter((volunteer) => !takenIds.has(volunteer.id));
        alreadyAdded.push(
          ...answer.found
            .filter((volunteer) => takenIds.has(volunteer.id))
            .map((volunteer) => volunteer.username),
        );
        if (fresh.length) {
          const amounts = startingAmounts();
          onChange([
            ...participants,
            ...fresh.map((volunteer) => ({ ...volunteer, ...amounts })),
          ]);
        }
        const notFound = [...invalid, ...answer.missing];
        const skipped = wanted.length > room;
        setProblem(
          [
            answer.result.status === "error" ? message(answer.result.code) : "",
            notFound.length ? listed(labels.notFound, notFound) : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
        setNote(
          [
            alreadyAdded.length ? listed(labels.alreadyAdded, alreadyAdded) : "",
            skipped ? labels.limit : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
        setText(notFound.map((name) => `@${name}`).join(", "));
      } catch {
        setProblem(labels.fallbackError);
      }
    });
  };

  const applyToEveryone = () => {
    const found = {
      hours: amountProblem("hours", everyone.hours) ?? undefined,
      xpAwarded: amountProblem("xpAwarded", everyone.xpAwarded) ?? undefined,
    };
    setEveryoneProblems(found);
    if (found.hours || found.xpAwarded) return;
    const amounts = startingAmounts();
    onChange(participants.map((person) => ({ ...person, ...amounts })));
  };

  const update = (personId: string, key: keyof Amounts, value: string) =>
    onChange(
      participants.map((person) =>
        person.id === personId ? { ...person, [key]: value } : person,
      ),
    );

  const full = room <= 0;
  const describedBy = [id("username-help"), problem ? id("username-error") : null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-border p-5">
        <Field invalid={Boolean(problem)}>
          <FieldLabel htmlFor={id("username")}>{labels.username}</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={id("username")}
              className="sm:max-w-md"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              maxLength={3400}
              value={text}
              disabled={finding || full}
              aria-describedby={describedBy}
              aria-invalid={Boolean(problem) || undefined}
              onChange={(event) => {
                setText(event.target.value);
                setProblem("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (text.trim() && !finding && !full) add();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={finding || !text.trim() || full}
              onClick={add}
            >
              <Plus aria-hidden="true" />
              {finding ? labels.finding : labels.find}
            </Button>
          </div>
          <FieldError id={id("username-error")}>{problem}</FieldError>
          {note ? (
            <p role="status" className="text-sm text-ink-muted">
              {note}
            </p>
          ) : null}
          <FieldDescription id={id("username-help")}>
            {full ? labels.limit : labels.usernameHint}
          </FieldDescription>
        </Field>

        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-ink">
            {labels.everyone}
          </legend>
          <div className="flex flex-wrap items-start gap-3">
            <Field invalid={Boolean(everyoneProblems.hours)} className="w-32">
              <FieldLabel htmlFor={id("everyone-hours")}>{labels.hours}</FieldLabel>
              <Input
                id={id("everyone-hours")}
                type="number"
                inputMode="decimal"
                min={0}
                max={999}
                step="0.01"
                value={everyone.hours}
                aria-invalid={Boolean(everyoneProblems.hours) || undefined}
                onChange={(event) => {
                  setEveryone({ ...everyone, hours: event.target.value });
                  setEveryoneProblems({ ...everyoneProblems, hours: undefined });
                }}
              />
            </Field>
            <Field invalid={Boolean(everyoneProblems.xpAwarded)} className="w-32">
              <FieldLabel htmlFor={id("everyone-xp")}>{labels.xp}</FieldLabel>
              <Input
                id={id("everyone-xp")}
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                step={1}
                value={everyone.xpAwarded}
                aria-invalid={Boolean(everyoneProblems.xpAwarded) || undefined}
                onChange={(event) => {
                  setEveryone({ ...everyone, xpAwarded: event.target.value });
                  setEveryoneProblems({ ...everyoneProblems, xpAwarded: undefined });
                }}
              />
            </Field>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="sm:mt-7"
              disabled={participants.length === 0}
              onClick={applyToEveryone}
            >
              {labels.apply}
            </Button>
          </div>
          <FieldError>
            {[everyoneProblems.hours, everyoneProblems.xpAwarded]
              .filter((code): code is string => Boolean(code))
              .map(message)
              .join(" ")}
          </FieldError>
          <FieldDescription>{labels.everyoneHelp}</FieldDescription>
        </fieldset>
      </div>

      {participants.length === 0 ? (
        <RegisterNote title={labels.empty} description={labels.emptyHelp} />
      ) : (
        <ul className="divide-y divide-border">
          {participants.map((person) => (
            <li key={person.id} className="flex flex-wrap items-end gap-4 px-5 py-4">
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
                  <FieldLabel htmlFor={id(`hours-${person.id}`)}>
                    {labels.hours}
                  </FieldLabel>
                  <Input
                    id={id(`hours-${person.id}`)}
                    aria-label={`${labels.hours} @${person.username}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={999}
                    step="0.01"
                    required
                    value={person.hours}
                    onChange={(event) => update(person.id, "hours", event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={id(`xp-${person.id}`)}>{labels.xp}</FieldLabel>
                  <Input
                    id={id(`xp-${person.id}`)}
                    aria-label={`${labels.xp} @${person.username}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100000}
                    step={1}
                    required
                    value={person.xpAwarded}
                    onChange={(event) =>
                      update(person.id, "xpAwarded", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${labels.remove} @${person.username}`}
                onClick={() =>
                  onChange(participants.filter((item) => item.id !== person.id))
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
