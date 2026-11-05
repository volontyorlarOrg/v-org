import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Step = { key: string; label: string };

/**
 * Where a multi-step form stands, in the grammar of a filter tab: the current
 * step is a soft selection, nothing fills. A step is a button only when
 * `onSelect` is given and the step can be reached.
 */
export function Steps({
  label,
  doneLabel,
  steps,
  current,
  reachable = current,
  onSelect,
}: {
  label: string;
  doneLabel: string;
  steps: readonly Step[];
  current: number;
  reachable?: number;
  onSelect?: (key: string) => void;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {steps.map((step, index) => {
          const active = index === current;
          const done = index < current;
          const enabled = Boolean(onSelect) && !active && index <= reachable;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "tabular grid size-5 shrink-0 place-items-center rounded-sm text-xs font-semibold",
                  active ? "bg-surface text-ink" : "bg-surface-sunk text-ink-muted",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : index + 1}
              </span>
              {step.label}
              {done ? <span className="sr-only"> ({doneLabel})</span> : null}
            </>
          );
          const className = cn(
            "inline-flex min-h-8 items-center gap-2 rounded-md px-2 text-sm whitespace-nowrap transition-colors duration-150",
            active
              ? "bg-surface-sunk font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
              : "font-medium text-ink-muted",
            enabled && "hover:bg-surface-sunk hover:text-ink",
          );
          return (
            <li key={step.key} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight aria-hidden="true" className="size-4 text-ink-faint" />
              ) : null}
              {enabled ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(step.key)}
                  className={className}
                >
                  {content}
                </button>
              ) : (
                <span aria-current={active ? "step" : undefined} className={className}>
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
