"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failedResult, type ActionResult } from "@/lib/api/action-result";
import { read, write, writeReturning } from "@/lib/api/gateway.server";
import { fieldErrorsOf, stringField } from "@/lib/auth/credentials";
import { isLocale } from "@/i18n/routing";
import { pastEventRosterHref } from "@/lib/routing/routes";
import { ROSTER_LIMIT } from "./roster";
import {
  participantsInputSchema,
  pastEventRosterSchema,
  rosterInputSchema,
  rosterVolunteerSchema,
  type RosterVolunteer,
} from "./schemas";

const LOOKUPS_AT_ONCE = 5;

type Lookup =
  | { volunteer: RosterVolunteer }
  | { missing: string }
  | { failure: "sessionExpired" | "server" };

async function lookUp(username: string): Promise<Lookup> {
  const loaded = await read("pastEventVolunteer", {
    schema: rosterVolunteerSchema,
    query: { username },
  });
  if (loaded.state === "ready") return { volunteer: loaded.data };
  if (loaded.state === "missing") return { missing: username };
  return { failure: loaded.state === "expired" ? "sessionExpired" : "server" };
}

export async function findPastEventVolunteersAction(usernames: string[]) {
  const wanted = [...new Set(usernames)]
    .filter((name) => /^[a-z0-9_]{3,32}$/.test(name))
    .slice(0, ROSTER_LIMIT);
  const found: RosterVolunteer[] = [];
  const missing: string[] = [];
  for (let start = 0; start < wanted.length; start += LOOKUPS_AT_ONCE) {
    const answers = await Promise.all(
      wanted.slice(start, start + LOOKUPS_AT_ONCE).map(lookUp),
    );
    for (const answer of answers) {
      if ("failure" in answer) {
        return { result: failedResult(answer.failure), found, missing };
      }
      if ("volunteer" in answer) found.push(answer.volunteer);
      else missing.push(answer.missing);
    }
  }
  return { result: { status: "ok" } as ActionResult, found, missing };
}

export async function addPastEventParticipantsAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = stringField(formData, "rosterId");
  if (!id) return failedResult("pastEventRosterNotFound");
  let raw: unknown;
  try {
    raw = JSON.parse(stringField(formData, "participants"));
  } catch {
    return failedResult("validationFailed");
  }
  const parsed = participantsInputSchema.safeParse({ participants: raw });
  if (!parsed.success)
    return failedResult("validationFailed", fieldErrorsOf(parsed.error));
  const result = await write("addPastEventParticipants", {
    params: { id },
    body: parsed.data,
  });
  if (result.status === "ok") revalidatePath("/", "layout");
  return result;
}

export async function createPastEventRosterAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(stringField(formData, "roster"));
  } catch {
    return failedResult("validationFailed");
  }
  const parsed = rosterInputSchema.safeParse(raw);
  if (!parsed.success)
    return failedResult("validationFailed", fieldErrorsOf(parsed.error));
  const locale = stringField(formData, "locale");
  if (!isLocale(locale)) return failedResult("validationFailed");
  const { result, data } = await writeReturning("createPastEventRoster", {
    schema: pastEventRosterSchema,
    body: parsed.data,
  });
  if (result.status !== "ok" || !data) return result;
  revalidatePath("/", "layout");
  redirect(`/${locale}${pastEventRosterHref(data.id)}`);
}
