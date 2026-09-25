"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { idleResult } from "@/lib/api/action-result";
import { logInAction } from "@/lib/auth/actions";
import {
  fieldMessage,
  fieldsOf,
  formError,
  type MessageCatalog,
} from "@/lib/forms/messages";

export type LoginLabels = {
  handle: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  pending: string;
  fallbackError: string;
  errors: MessageCatalog;
};

export function LoginForm({
  locale,
  next,
  labels,
}: {
  locale: string;
  next: string | null;
  labels: LoginLabels;
}) {
  const [result, dispatch] = useActionState(logInAction, idleResult);
  const fields = fieldsOf(result);
  const message = formError(result, labels.errors, labels.fallbackError);
  const handleError = fieldMessage(fields, "handle", labels.errors);
  const passwordError = fieldMessage(fields, "password", labels.errors);

  return (
    <form action={dispatch} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {message ? <FormMessage tone="error">{message}</FormMessage> : null}

      <FieldGroup>
        <Field invalid={Boolean(handleError)}>
          <FieldLabel htmlFor="handle">{labels.handle}</FieldLabel>
          <Input
            id="handle"
            name="handle"
            type="text"
            autoComplete="username"
            required
            aria-invalid={Boolean(handleError) || undefined}
            aria-describedby={handleError ? "handle-error" : undefined}
          />
          <FieldError id="handle-error">{handleError}</FieldError>
        </Field>

        <Field invalid={Boolean(passwordError)}>
          <FieldLabel htmlFor="password">{labels.password}</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            showLabel={labels.showPassword}
            hideLabel={labels.hidePassword}
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={passwordError ? "password-error" : undefined}
          />
          <FieldError id="password-error">{passwordError}</FieldError>
        </Field>
      </FieldGroup>

      <SubmitButton className="w-full" pendingLabel={labels.pending}>
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
