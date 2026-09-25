import { z } from "zod";

export const PASSWORD_MAX_LENGTH = 128;

export const logInSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(1, "required")
    .max(160, "tooLong")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug"),
  password: z.string().min(1, "required").max(PASSWORD_MAX_LENGTH, "passwordLong"),
});

export type LogInValues = z.input<typeof logInSchema>;

export function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function credentialsFromFormData(formData: FormData) {
  return {
    handle: stringField(formData, "handle").trim().toLowerCase(),
    password: stringField(formData, "password"),
  };
}

export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const output: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    output[field] = [...(output[field] ?? []), issue.message];
  }

  return output;
}
