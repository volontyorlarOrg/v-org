"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { failedResult, type ActionResult } from "@/lib/api/action-result";
import { write } from "@/lib/api/gateway.server";
import { fieldErrorsOf, stringField } from "@/lib/auth/credentials";
import {
  pastEventChangeSchema,
  pastEventProposalSchema,
  pastEventRemovalSchema,
} from "@/lib/participants/input";

function proposalOf(formData: FormData) {
  return {
    title: stringField(formData, "title"),
    eventDate: stringField(formData, "eventDate"),
    hours: stringField(formData, "hours"),
    xpAwarded: stringField(formData, "xpAwarded") || "0",
    note: stringField(formData, "note"),
  };
}

function settled(
  result: ActionResult,
  values: Record<string, string> = {},
): ActionResult {
  if (result.status === "ok") {
    revalidatePath("/", "layout");
    return result;
  }
  return result.status === "error"
    ? { ...result, values, submissionId: randomUUID() }
    : result;
}

export async function proposePastEventAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = stringField(formData, "id");
  const submissionId = stringField(formData, "submissionId");
  if (!id) return failedResult("participantNotFound");
  if (!submissionId) return failedResult("pastEventRequestConflict");
  const values = proposalOf(formData);
  const parsed = pastEventProposalSchema.safeParse(values);
  if (!parsed.success)
    return settled(
      failedResult("validationFailed", fieldErrorsOf(parsed.error)),
      values,
    );
  const { note, ...proposal } = parsed.data;
  return settled(
    await write("proposePastEvent", {
      params: { id },
      body: { ...proposal, submissionId, ...(note ? { note } : {}) },
    }),
    values,
  );
}

export async function proposePastEventChangeAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const eventId = stringField(formData, "eventId");
  const submissionId = stringField(formData, "submissionId");
  if (!eventId) return failedResult("pastEventNotFound");
  if (!submissionId) return failedResult("pastEventRequestConflict");
  const values = proposalOf(formData);
  const parsed = pastEventChangeSchema.safeParse(values);
  if (!parsed.success)
    return settled(
      failedResult("validationFailed", fieldErrorsOf(parsed.error)),
      values,
    );
  return settled(
    await write("proposePastEventChange", {
      params: { eventId },
      body: { ...parsed.data, submissionId },
    }),
    values,
  );
}

export async function proposePastEventRemovalAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const eventId = stringField(formData, "eventId");
  const submissionId = stringField(formData, "submissionId");
  if (!eventId) return failedResult("pastEventNotFound");
  if (!submissionId) return failedResult("pastEventRequestConflict");
  const values = { note: stringField(formData, "note") };
  const parsed = pastEventRemovalSchema.safeParse(values);
  if (!parsed.success)
    return settled(
      failedResult("validationFailed", fieldErrorsOf(parsed.error)),
      values,
    );
  return settled(
    await write("proposePastEventRemoval", {
      params: { eventId },
      body: { ...parsed.data, submissionId },
    }),
    values,
  );
}

export async function cancelPastEventRequestAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = stringField(formData, "requestId");
  if (!id) return failedResult("pastEventRequestNotFound");
  return settled(await write("cancelPastEventRequest", { params: { id } }));
}
