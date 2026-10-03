"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";

import { failedResult, type ActionResult } from "@/lib/api/action-result";
import type { FieldErrors } from "@/lib/api/errors";
import { write, writeMultipart, writeReturning } from "@/lib/api/gateway.server";
import { vacancySchema } from "@/lib/api/schemas";
import { stringField } from "@/lib/auth/credentials";
import { isLocale } from "@/i18n/routing";
import { vacancyHref } from "@/lib/routing/routes";
import {
  draftPayload,
  draftProblems,
  hasProblems,
  vacancyDraftSchema,
  type DraftCheck,
} from "@/lib/vacancies/draft";
import { vacancyImageFileProblem } from "@/lib/vacancies/image";

function revalidateVacancies() {
  revalidatePath("/", "layout");
}

function vacancySlug(title: string): string {
  const readable = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
  return `${readable || "vacancy"}-${randomUUID().slice(0, 8)}`;
}

export type DraftResult =
  | { status: "ok"; id: string }
  | { status: "error"; code: string; fields: FieldErrors; id?: string };

function failed(code: string, fields: FieldErrors = {}, id?: string): DraftResult {
  return { status: "error", code, fields, ...(id ? { id } : {}) };
}

function fromResult(result: ActionResult, id?: string): DraftResult {
  return result.status === "error"
    ? failed(result.code, result.fields, id)
    : failed("server", {}, id);
}

function imageOf(formData: FormData): { file?: File; remove: boolean; error?: string } {
  const value = formData.get("image");
  const remove = formData.get("removeImage") === "on";
  if (value === null) return { remove };
  if (!(value instanceof File)) return { remove, error: "opportunityImageInvalid" };
  if (value.size === 0) return { remove };
  const error = vacancyImageFileProblem(value);
  return error ? { remove, error } : { file: value, remove: false };
}

async function uploadImage(
  id: string,
  image: ReturnType<typeof imageOf>,
): Promise<ActionResult> {
  if (image.file) {
    const body = new FormData();
    body.set("image", image.file);
    return writeMultipart("uploadVacancyImage", { id }, body);
  }
  if (image.remove) return write("removeVacancyImage", { params: { id } });
  return { status: "ok" };
}

/**
 * Creates or updates the draft, then stores or removes its photo. The photo
 * goes after the details because a new vacancy has no id before that.
 */
async function persistDraft(
  formData: FormData,
  check: DraftCheck,
): Promise<DraftResult> {
  const id = stringField(formData, "id") || undefined;

  let raw: unknown;
  try {
    raw = JSON.parse(stringField(formData, "draft"));
  } catch {
    return failed("validationFailed", {}, id);
  }
  const parsed = vacancyDraftSchema.safeParse(raw);
  if (!parsed.success) return failed("validationFailed", {}, id);

  const draft = parsed.data;
  const problems = draftProblems(draft, "all", check);
  const image = imageOf(formData);
  if (image.error) problems.image = [image.error];
  if (hasProblems(problems)) return failed("validationFailed", problems, id);

  const body = draftPayload(draft);
  let savedId = id;

  if (id) {
    const result = await write("updateVacancy", { params: { id }, body });
    if (result.status !== "ok") return fromResult(result, id);
  } else {
    const created = await writeReturning("createVacancy", {
      schema: vacancySchema,
      body: { ...body, slug: vacancySlug(draft.title) },
    });
    if (created.result.status !== "ok" || !created.data) {
      return fromResult(created.result);
    }
    savedId = created.data.id;
  }

  const stored = savedId as string;
  const imageResult = await uploadImage(stored, image);
  if (imageResult.status !== "ok") {
    return failed(
      "vacancyImageAfterSaveFailed",
      { image: [imageResult.status === "error" ? imageResult.code : "server"] },
      stored,
    );
  }

  return { status: "ok", id: stored };
}

export async function saveVacancyDraftAction(formData: FormData): Promise<DraftResult> {
  return persistDraft(formData, "draft");
}

export async function submitVacancyDraftAction(
  formData: FormData,
): Promise<DraftResult> {
  const saved = await persistDraft(formData, "submit");
  if (saved.status !== "ok") return saved;

  const result = await write("submitVacancyForApproval", { params: { id: saved.id } });
  revalidateVacancies();
  if (result.status !== "ok") return fromResult(result, saved.id);

  const locale = stringField(formData, "locale");
  redirect(
    `/${isLocale(locale) ? locale : "uz"}${vacancyHref(saved.id)}?sent=1`,
    RedirectType.replace,
  );
}

export async function setVacancySavedAction(
  id: string,
  saved: boolean,
): Promise<ActionResult> {
  if (!id) return failedResult("opportunityNotFound");
  return write(saved ? "saveVacancy" : "unsaveVacancy", { params: { id } });
}

export async function submitVacancyForApprovalAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = stringField(formData, "id");
  if (!id) return failedResult("opportunityNotFound");

  const result = await write("submitVacancyForApproval", { params: { id } });
  if (result.status === "ok") revalidateVacancies();
  return result;
}

export async function archiveVacancyAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = stringField(formData, "id");
  if (!id) return failedResult("opportunityNotFound");

  const result = await write("archiveVacancy", { params: { id } });
  if (result.status === "ok") revalidateVacancies();
  return result;
}
