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
        "grid size-9 place-items-center rounded-lg bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        shown && "text-accent",
      )}
    >
      <Bookmark
        aria-hidden="true"
        className="size-4.5"
        fill={shown ? "currentColor" : "none"}
      />
    </button>
  );
}
