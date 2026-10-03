"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { WIZARD_STEPS, type WizardStep } from "@/lib/vacancies/draft";
import { cn } from "@/lib/utils";

export function WizardStepper({
  current,
  reachable,
  onSelect,
}: {
  current: WizardStep;
  reachable: number;
  onSelect: (step: WizardStep) => void;
}) {
  const t = useTranslations("vacancies.wizard.steps");
  const currentIndex = WIZARD_STEPS.indexOf(current);

  return (
    <nav aria-label={t("label")}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {WIZARD_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const enabled = index <= reachable && !active;
          return (
            <li
              key={step}
              className={cn(
                "flex min-w-0 items-center gap-2 sm:gap-3",
                index > 0 && "flex-1",
              )}
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 min-w-4 flex-1 rounded-full transition-colors duration-300",
                    index <= currentIndex ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <button
                type="button"
                disabled={!enabled}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step)}
                className="group flex min-h-11 shrink-0 items-center gap-2.5 rounded-full pr-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default"
              >
                <span
                  className={cn(
                    "tabular grid size-8 shrink-0 place-items-center rounded-full border text-sm transition-colors duration-200",
                    active &&
                      "border-primary bg-primary text-knockout shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]",
                    done && "border-primary bg-primary text-knockout",
                    !active && !done && "border-border-control text-ink-muted",
                    enabled && "group-hover:border-primary-ink",
                  )}
                >
                  {done ? (
                    <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    active ? "text-ink" : "text-ink-muted",
                    !active && "max-sm:sr-only",
                    enabled && "group-hover:text-primary-ink",
                  )}
                >
                  {t(step)}
                  {done ? <span className="sr-only"> ({t("done")})</span> : null}
                  {active ? <span className="sr-only"> ({t("current")})</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
