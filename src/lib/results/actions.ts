"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { call, type CallResult } from "@/lib/results/call.server";
import {
  attendanceSheetSchema,
  instructionsSchema,
  sentDecisionsSchema,
  type AttendanceSheet,
  type Instructions,
  type SentDecisions,
  type XpRules,
} from "@/lib/results/schemas";
import type { SheetEntry } from "@/lib/results/sheet";
import type { StagedDecision } from "@/lib/domain/vocabulary";

const stagedSummarySchema = z.object({
  accept: z.number().int(),
  reject: z.number().int(),
  hold: z.number().int(),
  undecided: z.number().int(),
});

function settled<T>(result: CallResult<T>) {
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function stageDecisionsAction(
  vacancyId: string,
  decisions: Array<{ applicationId: string; decision: StagedDecision | null }>,
) {
  return call("stageDecisions", {
    params: { id: vacancyId },
    body: { decisions },
    schema: stagedSummarySchema,
  });
}

export async function sendDecisionsAction(
  vacancyId: string,
): Promise<CallResult<SentDecisions>> {
  const result = await call("sendDecisions", {
    params: { id: vacancyId },
    schema: sentDecisionsSchema,
  });
  // A refused send still cleared the decisions on withdrawn applications.
  revalidatePath("/", "layout");
  return result;
}

export async function sendInstructionsAction(
  vacancyId: string,
  input: { message: string; groupLink: string | null },
): Promise<CallResult<Instructions>> {
  return settled(
    await call("sendInstructions", {
      params: { id: vacancyId },
      body: input,
      schema: instructionsSchema,
    }),
  );
}

export async function retryInstructionsAction(
  vacancyId: string,
): Promise<CallResult<Instructions>> {
  return settled(
    await call("retryInstructions", {
      params: { id: vacancyId },
      schema: instructionsSchema,
    }),
  );
}

export async function refreshInstructionsAction(
  vacancyId: string,
): Promise<CallResult<Instructions>> {
  return call("instructions", {
    params: { id: vacancyId },
    schema: instructionsSchema,
  });
}

export async function saveAttendanceDraftAction(
  vacancyId: string,
  entries: SheetEntry[],
): Promise<CallResult<AttendanceSheet>> {
  return settled(
    await call("saveAttendanceDraft", {
      params: { id: vacancyId },
      body: { entries },
      schema: attendanceSheetSchema,
    }),
  );
}

export async function discardAttendanceDraftAction(
  vacancyId: string,
): Promise<CallResult<AttendanceSheet>> {
  return settled(
    await call("discardAttendanceDraft", {
      params: { id: vacancyId },
      schema: attendanceSheetSchema,
    }),
  );
}

/**
 * Sends the sheet on: an organization submits it for verification. Unsaved
 * rows are saved first, so what was reviewed is what is submitted.
 */
export async function finishAttendanceAction(
  vacancyId: string,
  entries: SheetEntry[],
  note: string,
): Promise<CallResult<AttendanceSheet>> {
  if (entries.length > 0) {
    const saved = await call("saveAttendanceDraft", {
      params: { id: vacancyId },
      body: { entries },
      schema: attendanceSheetSchema,
    });
    if (!saved.ok) return saved;
  }
  return settled(
    await call("submitAttendance", {
      params: { id: vacancyId },
      body: note.trim() ? { note: note.trim() } : {},
      schema: attendanceSheetSchema,
    }),
  );
}

export async function updateRewardsAction(
  vacancyId: string,
  rules: XpRules,
): Promise<CallResult<{ id: string }>> {
  return settled(
    await call("updateVacancy", {
      params: { id: vacancyId },
      body: rules,
      schema: z.object({ id: z.string() }).loose(),
    }),
  );
}
