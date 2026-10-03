"use client";

import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function fieldIds(id: string, help: boolean, error: boolean) {
  return (
    [help ? `${id}-help` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

/**
 * Label, control, help and error for one wizard field. `beside` puts the label
 * in a column to the left on wide screens, as on the details step.
 */
export function FieldShell({
  id,
  label,
  required = false,
  optional,
  info,
  help,
  aside,
  error,
  beside = false,
  as = "div",
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: string;
  info?: ReactNode;
  help?: ReactNode;
  aside?: ReactNode;
  error?: string | undefined;
  beside?: boolean;
  as?: "div" | "fieldset";
  children: ReactNode;
  className?: string;
}) {
  const Wrapper = as;
  const Title = as === "fieldset" ? "legend" : "label";
  return (
    <Wrapper
      data-invalid={error ? "" : undefined}
      className={cn(
        "group/field min-w-0",
        beside
          ? "grid gap-2 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-6"
          : "flex flex-col gap-2",
        className,
      )}
    >
      <div
        className={cn("flex items-center gap-2", beside && "self-start lg:min-h-12")}
      >
        <Title
          {...(Title === "label" ? { htmlFor: id } : {})}
          className={cn(
            "text-sm font-semibold text-ink group-data-[invalid]/field:text-danger-ink",
            as === "fieldset" && "float-left",
          )}
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              {" *"}
            </span>
          ) : null}
          {optional ? (
            <span className="ml-1 font-normal text-ink-muted">{optional}</span>
          ) : null}
        </Title>
        {info}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {children}
        {help || aside ? (
          <div className="flex items-start justify-between gap-4">
            {help ? (
              <p id={`${id}-help`} className="text-xs leading-5 text-ink-muted">
                {help}
              </p>
            ) : (
              <span />
            )}
            {aside}
          </div>
        ) : null}
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="flex items-start gap-2 text-sm font-medium text-danger-ink"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">{error}</span>
          </p>
        ) : null}
      </div>
    </Wrapper>
  );
}
