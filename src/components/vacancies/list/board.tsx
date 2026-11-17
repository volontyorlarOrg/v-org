import type { ReactNode } from "react";

import { Count } from "@/components/register/register";
import { cn } from "@/lib/utils";

export function BoardLane({
  id,
  title,
  description,
  count,
  countLabel,
  tone = "neutral",
  empty,
  footer,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  tone?: "neutral" | "waiting";
  empty: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex w-[min(20rem,82vw)] min-w-0 shrink-0 snap-start flex-col gap-2 rounded-2xl border border-border bg-surface-sunk p-2 md:w-auto md:shrink"
    >
      <header className="px-2 pt-1.5 pb-1">
        <div className="flex items-center gap-2">
          <h2 id={`${id}-title`} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          <Count value={count} label={countLabel} tone={count > 0 ? tone : "neutral"} />
        </div>
        <p className="mt-0.5 text-xs leading-snug text-ink-muted">{description}</p>
      </header>
      {count === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-xs text-ink-muted">
          {empty}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">{children}</ol>
      )}
      {footer ? <div className="px-2 pt-0.5 pb-1">{footer}</div> : null}
    </section>
  );
}

export function BoardCard({
  chip,
  tools,
  title,
  meta,
  facts,
  action,
}: {
  chip: ReactNode;
  tools?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  facts?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-[0_1px_2px_rgb(15_27_42/0.04)]">
      <div className="flex min-h-7 items-center justify-between gap-2">
        {chip}
        {tools ? <div className="-my-1 -mr-1.5 flex items-center">{tools}</div> : null}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm leading-snug font-semibold break-words text-ink">
          {title}
        </h3>
        {meta ? (
          <p className="mt-1 text-xs leading-snug break-words text-ink-muted">{meta}</p>
        ) : null}
      </div>
      {facts ? (
        <p
          className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink")}
        >
          {facts}
        </p>
      ) : null}
      {action ? <div className="flex">{action}</div> : null}
    </li>
  );
}
