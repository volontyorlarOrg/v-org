"use client";

import { Bookmark } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { setVacancySavedAction } from "@/lib/vacancies/actions";
import { cn } from "@/lib/utils";

export function SaveToggle({
  id,
  saved,
  labels,
}: {
  id: string;
  saved: boolean;
  labels: { save: string; unsave: string; failed: string };
}) {
  const [confirmed, setConfirmed] = useState(saved);
  const [shown, setShown] = useOptimistic(confirmed);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !shown;
    startTransition(async () => {
      setShown(next);
      const result = await setVacancySavedAction(id, next);
      if (result.status === "ok") setConfirmed(next);
      else toast.error(labels.failed);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={shown}
      aria-label={shown ? labels.unsave : labels.save}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md border border-border-strong bg-surface transition-colors duration-150 hover:border-border-control hover:bg-surface-sunk",
        shown ? "text-primary-ink" : "text-ink-muted",
      )}
    >
      <Bookmark
        aria-hidden="true"
        className="size-4"
        fill={shown ? "currentColor" : "none"}
      />
    </button>
  );
}
