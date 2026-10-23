"use client";

import { useActionState, useEffect, useState } from "react";
import { TriangleAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { FormMessage } from "@/components/forms/form-message";
import {
  ParticipantPicker,
  type Participant,
  type ParticipantPickerLabels,
} from "@/components/participants/participant-picker";
import { Register } from "@/components/register/register";
import { Button } from "@/components/ui/button";
import { idleResult, type ActionResult } from "@/lib/api/action-result";
import { addPastEventParticipantsAction } from "@/lib/past-event-rosters/actions";
import { filled, rosterTotals } from "@/lib/past-event-rosters/roster";
import { rosterInputSchema } from "@/lib/past-event-rosters/schemas";

export type AddParticipantsLabels = ParticipantPickerLabels &
  Record<
    | "add"
    | "addHelp"
    | "send"
    | "sending"
    | "cancel"
    | "added"
    | "totals"
    | "zeroHours",
    string
  >;

export function AddParticipantsForm({
  rosterId,
  taken,
  labels,
}: {
  rosterId: string;
  taken: readonly string[];
  labels: AddParticipantsLabels;
}) {
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [problem, setProblem] = useState("");
  const [result, action, pending] = useActionState(
    async (previous: ActionResult, formData: FormData) => {
      const outcome = await addPastEventParticipantsAction(previous, formData);
      if (outcome.status === "ok") {
        toast.success(labels.added);
        setParticipants([]);
        setOpen(false);
      }
      return outcome;
    },
    idleResult,
  );
  const message = (code: string) => labels.errors[code] ?? labels.fallbackError;
  const payload = participants.map(({ id, hours, xpAwarded }) => ({
    volunteerId: id,
    hours,
    xpAwarded,
  }));
  const dirty = open && participants.length > 0 && !pending;
  const totals = rosterTotals(participants);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const error =
    problem ||
    (result.status === "error"
      ? message(Object.values(result.fields).flat()[0] ?? result.code)
      : "");

  return (
    <Register
      id="add-participants"
      title={labels.add}
      description={labels.addHelp}
      actions={
        open ? null : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            <UserPlus aria-hidden="true" />
            {labels.add}
          </Button>
        )
      }
    >
      {open ? (
        <form
          action={action}
          noValidate
          onSubmit={(event) => {
            const parsed = rosterInputSchema.shape.participants.safeParse(payload);
            if (!parsed.success) {
              event.preventDefault();
              setProblem(
                message(parsed.error.issues[0]?.message ?? "validationFailed"),
              );
            }
          }}
        >
          <input type="hidden" name="rosterId" value={rosterId} />
          <input type="hidden" name="participants" value={JSON.stringify(payload)} />
          <fieldset disabled={pending} className="min-w-0">
            <ParticipantPicker
              idPrefix="add"
              participants={participants}
              taken={taken}
              onChange={(next) => {
                setParticipants(next);
                setProblem("");
              }}
              labels={labels}
            />
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
            {error ? (
              <FormMessage tone="error">{error}</FormMessage>
            ) : participants.length > 0 ? (
              <div className="flex flex-col gap-1 text-sm">
                <p className="tabular font-semibold text-ink">
                  {filled(labels.totals, {
                    count: totals.count,
                    hours: totals.hours,
                    xp: totals.xp,
                  })}
                </p>
                {totals.zeroHours > 0 ? (
                  <p role="status" className="flex items-start gap-2 text-ink">
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-ink-muted"
                    />
                    {filled(labels.zeroHours, { count: totals.zeroHours })}
                  </p>
                ) : null}
              </div>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setParticipants([]);
                  setProblem("");
                }}
              >
                {labels.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending || participants.length === 0}
              >
                {pending ? labels.sending : labels.send}
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </Register>
  );
}
