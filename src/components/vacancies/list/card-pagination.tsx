import { ArrowLeft, ArrowRight } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function pagesAround(page: number, last: number): (number | "gap")[] {
  const wanted = new Set(
    [1, last, page - 1, page, page + 1].filter((n) => n >= 1 && n <= last),
  );
  const sorted = [...wanted].sort((a, b) => a - b);
  const output: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) output.push("gap");
    output.push(value);
  });
  return output;
}

export function CardPagination({
  page,
  last,
  summary,
  hrefFor,
  labels,
}: {
  page: number;
  last: number;
  summary: string;
  hrefFor: (page: number) => string;
  labels: {
    pages: string;
    previous: string;
    next: string;
    page: (page: number) => string;
  };
}) {
  const disabled = "pointer-events-none opacity-40";
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p aria-live="polite" className="tabular text-sm text-ink-muted">
        {summary}
      </p>
      {last > 1 ? (
        <nav aria-label={labels.pages} className="flex flex-wrap items-center gap-1.5">
          <Link
            href={hrefFor(page - 1)}
            aria-disabled={page <= 1 || undefined}
            tabIndex={page <= 1 ? -1 : undefined}
            className={cn(
              buttonClass({ variant: "outline", size: "row" }),
              page <= 1 && disabled,
            )}
          >
            <ArrowLeft aria-hidden="true" />
            {labels.previous}
          </Link>
          {pagesAround(page, last).map((value, index) =>
            value === "gap" ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-ink-muted"
              >
                …
              </span>
            ) : (
              <Link
                key={value}
                href={hrefFor(value)}
                aria-current={value === page ? "page" : undefined}
                aria-label={labels.page(value)}
                className={cn(
                  buttonClass({
                    variant: value === page ? "primary" : "outline",
                    size: "row",
                  }),
                  "tabular min-w-9 px-0",
                )}
              >
                {value}
              </Link>
            ),
          )}
          <Link
            href={hrefFor(page + 1)}
            aria-disabled={page >= last || undefined}
            tabIndex={page >= last ? -1 : undefined}
            className={cn(
              buttonClass({ variant: "outline", size: "row" }),
              page >= last && disabled,
            )}
          >
            {labels.next}
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
