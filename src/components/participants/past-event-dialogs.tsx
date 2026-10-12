"use client";

import { useState, type ReactNode } from "react";

import { FormDialog, type FormDialogLabels } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/api/action-result";

type Action = (previous: ActionResult, formData: FormData) => Promise<ActionResult>;

export type PastEventDialogLabels = {
  propose: string;
  proposeDescription: string;
  proposeSuccess: string;
  change: string;
  changeDescription: string;
  changeSuccess: string;
  remove: string;
  removeDescription: string;
  removeSuccess: string;
  withdraw: string;
  withdrawDescription: string;
  withdrawSuccess: string;
  send: string;
  title: string;
  date: string;
  hours: string;
  xp: string;
  xpHelp: string;
  note: string;
  noteHelp: string;
  reason: string;
  reasonHelp: string;
  close: string;
  cancel: string;
  pending: string;
  fallbackError: string;
  errors: Record<string, string>;
};

export type RecordedEvent = {
  id: string;
  title: string;
  eventDate: string;
  hours: number;
  xpAwarded: number;
  countsTowardProgress: boolean;
};

function dialogLabels(
  labels: PastEventDialogLabels,
  copy: { title: string; description: string; submit: string; success: string },
): FormDialogLabels {
  return {
    ...copy,
    pending: labels.pending,
    cancel: labels.cancel,
    close: labels.close,
    summary: labels.fallbackError,
    fallbackError: labels.fallbackError,
    errors: labels.errors,
  };
}

function typedValues(result: ActionResult): Record<string, string> {
  return result.status === "error" ? (result.values ?? {}) : {};
}

function attemptKey(result: ActionResult): string {
  return result.status === "error" ? (result.submissionId ?? "error") : "idle";
}

function useSubmissionId() {
  const [submissionId, setSubmissionId] = useState("");
  return {
    submissionId,
    renew: (open: boolean) => {
      if (open) setSubmissionId(crypto.randomUUID());
    },
  };
}

function NoteField({
  id,
  label,
  help,
  required,
  value,
  error,
}: {
  id: string;
  label: string;
  help: string;
  required: boolean;
  value: string;
  error: string | undefined;
}) {
  return (
    <Field invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        name="note"
        rows={3}
        maxLength={500}
        required={required}
        defaultValue={value}
        aria-describedby={`${id}-help`}
        aria-invalid={Boolean(error) || undefined}
      />
      <FieldDescription id={`${id}-help`}>{help}</FieldDescription>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

export function PastEventProposalDialog({
  participantId,
  event,
  latestDate,
  action,
  labels,
  trigger,
}: {
  participantId: string;
  event?: RecordedEvent;
  latestDate: string;
  action: Action;
  labels: PastEventDialogLabels;
  trigger?: ReactNode;
}) {
  const { submissionId, renew } = useSubmissionId();
  const change = Boolean(event);
  const suffix = event?.id ?? "new";
  const fieldId = (name: string) => `past-event-${suffix}-${name}`;
  const creditable = event?.countsTowardProgress ?? true;

  return (
    <FormDialog
      action={action}
      onOpenChange={renew}
      labels={dialogLabels(labels, {
        title: change ? labels.change : labels.propose,
        description: change ? labels.changeDescription : labels.proposeDescription,
        submit: labels.send,
        success: change ? labels.changeSuccess : labels.proposeSuccess,
      })}
      trigger={
        trigger ?? (
          <Button type="button" variant={change ? "outline" : "primary"} size="sm">
            {change ? labels.change : labels.propose}
          </Button>
        )
      }
      fields={{
        submissionId,
        ...(event ? { eventId: event.id } : { id: participantId }),
      }}
      fieldLabels={{
        title: labels.title,
        eventDate: labels.date,
        hours: labels.hours,
        xpAwarded: labels.xp,
        note: change ? labels.reason : labels.note,
      }}
      idFor={fieldId}
      size="lg"
    >
      {({ error, result }) => {
        const typed = typedValues(result);
        return (
          <div key={attemptKey(result)} className="flex flex-col gap-5">
            <Field invalid={Boolean(error("title"))}>
              <FieldLabel htmlFor={fieldId("title")}>{labels.title}</FieldLabel>
              <Input
                id={fieldId("title")}
                name="title"
                required
                maxLength={160}
                defaultValue={typed.title ?? event?.title ?? ""}
                aria-invalid={Boolean(error("title")) || undefined}
              />
              <FieldError id={`${fieldId("title")}-error`}>{error("title")}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field invalid={Boolean(error("eventDate"))}>
                <FieldLabel htmlFor={fieldId("eventDate")}>{labels.date}</FieldLabel>
                <Input
                  id={fieldId("eventDate")}
                  name="eventDate"
                  type="date"
                  required
                  max={latestDate}
                  defaultValue={typed.eventDate ?? event?.eventDate ?? ""}
                  aria-invalid={Boolean(error("eventDate")) || undefined}
                />
                <FieldError id={`${fieldId("eventDate")}-error`}>
                  {error("eventDate")}
                </FieldError>
              </Field>
              <Field invalid={Boolean(error("hours"))}>
                <FieldLabel htmlFor={fieldId("hours")}>{labels.hours}</FieldLabel>
                <Input
                  id={fieldId("hours")}
                  name="hours"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={999}
                  step={0.25}
                  required
                  defaultValue={typed.hours ?? event?.hours ?? ""}
                  aria-invalid={Boolean(error("hours")) || undefined}
                />
                <FieldError id={`${fieldId("hours")}-error`}>
                  {error("hours")}
                </FieldError>
              </Field>
              <Field invalid={Boolean(error("xpAwarded"))}>
                <FieldLabel htmlFor={fieldId("xpAwarded")}>{labels.xp}</FieldLabel>
                <Input
                  id={fieldId("xpAwarded")}
                  name="xpAwarded"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100000}
                  step={1}
                  required
                  readOnly={!creditable}
                  defaultValue={typed.xpAwarded ?? event?.xpAwarded ?? 0}
                  aria-describedby={`${fieldId("xpAwarded")}-help`}
                  aria-invalid={Boolean(error("xpAwarded")) || undefined}
                />
                <FieldError id={`${fieldId("xpAwarded")}-error`}>
                  {error("xpAwarded")}
                </FieldError>
              </Field>
            </div>
            <FieldDescription id={`${fieldId("xpAwarded")}-help`}>
              {labels.xpHelp}
            </FieldDescription>
            <NoteField
              id={fieldId("note")}
              label={change ? labels.reason : labels.note}
              help={change ? labels.reasonHelp : labels.noteHelp}
              required={change}
              value={typed.note ?? ""}
              error={error("note")}
            />
          </div>
        );
      }}
    </FormDialog>
  );
}

export function PastEventRemovalDialog({
  eventId,
  action,
  labels,
}: {
  eventId: string;
  action: Action;
  labels: PastEventDialogLabels;
}) {
  const { submissionId, renew } = useSubmissionId();
  const fieldId = (name: string) => `past-event-removal-${eventId}-${name}`;

  return (
    <FormDialog
      action={action}
      onOpenChange={renew}
      fields={{ eventId, submissionId }}
      fieldLabels={{ note: labels.reason }}
      idFor={fieldId}
      labels={dialogLabels(labels, {
        title: labels.remove,
        description: labels.removeDescription,
        submit: labels.send,
        success: labels.removeSuccess,
      })}
      trigger={
        <Button type="button" variant="danger-outline" size="sm">
          {labels.remove}
        </Button>
      }
      tone="danger"
    >
      {({ error, result }) => (
        <NoteField
          key={attemptKey(result)}
          id={fieldId("note")}
          label={labels.reason}
          help={labels.reasonHelp}
          required
          value={typedValues(result).note ?? ""}
          error={error("note")}
        />
      )}
    </FormDialog>
  );
}

export function WithdrawRequestDialog({
  requestId,
  action,
  labels,
}: {
  requestId: string;
  action: Action;
  labels: PastEventDialogLabels;
}) {
  return (
    <FormDialog
      action={action}
      fields={{ requestId }}
      labels={dialogLabels(labels, {
        title: labels.withdraw,
        description: labels.withdrawDescription,
        submit: labels.withdraw,
        success: labels.withdrawSuccess,
      })}
      trigger={
        <Button type="button" variant="outline" size="row">
          {labels.withdraw}
        </Button>
      }
    />
  );
}
