"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failedResult, type ActionResult } from "@/lib/api/action-result";
import { read, writeReturning } from "@/lib/api/gateway.server";
import { fieldErrorsOf, stringField } from "@/lib/auth/credentials";
import { isLocale } from "@/i18n/routing";
import { pastEventRosterHref } from "@/lib/routing/routes";
import {
  pastEventRosterSchema,
  rosterInputSchema,
  rosterVolunteerSchema,
} from "./schemas";

export async function findPastEventVolunteerAction(username: string) {
  const normalized = username.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalized)) {
    return { result: failedResult("pastEventVolunteerNotFound") };
  }
  const loaded = await read("pastEventVolunteer", {
    schema: rosterVolunteerSchema,
    query: { username: normalized },
  });
  if (loaded.state === "ready")
    return { result: { status: "ok" } as ActionResult, volunteer: loaded.data };
  return {
    result: failedResult(
      loaded.state === "expired"
        ? "sessionExpired"
        : loaded.state === "missing"
          ? "pastEventVolunteerNotFound"
          : "server",
    ),
  };
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
