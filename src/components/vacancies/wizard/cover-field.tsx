"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";

import { prepareCoverImage } from "@/lib/vacancies/cover-image";
import { VACANCY_IMAGE_TYPES } from "@/lib/vacancies/image";
import { cn } from "@/lib/utils";

export type CoverState = {
  /** The image the API holds now. */
  stored: string | null;
  /** A prepared image not uploaded yet. */
  file: File | null;
  preview: string | null;
  /** Remove the stored image on the next save. */
  remove: boolean;
};

export function displayedCover(cover: CoverState): string | null {
  return cover.preview ?? (cover.remove ? null : cover.stored);
}

export function CoverField({
  id,
  cover,
  onChange,
  error,
  describedBy,
}: {
  id: string;
  cover: CoverState;
  onChange: (next: CoverState) => void;
  error?: string | undefined;
  describedBy?: string;
}) {
  const t = useTranslations("vacancies.wizard");
  const errors = useTranslations("errors");
  const input = useRef<HTMLInputElement>(null);
  const choice = useRef(0);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shown = displayedCover(cover);
  const message = localError ?? error;

  async function take(file: File | undefined) {
    if (!file) return;
    const current = ++choice.current;
    setLocalError(null);
    setPreparing(true);
    const prepared = await prepareCoverImage(file);
    if (current !== choice.current) return;
    setPreparing(false);
    if (input.current) input.current.value = "";
    if ("error" in prepared) {
      setLocalError(errors(prepared.error));
      return;
    }
    if (cover.preview) URL.revokeObjectURL(cover.preview);
    onChange({
      ...cover,
      file: prepared.file,
      preview: URL.createObjectURL(prepared.file),
      remove: false,
    });
  }

  function clear() {
    choice.current += 1;
    setPreparing(false);
    setLocalError(null);
    if (cover.preview) URL.revokeObjectURL(cover.preview);
    onChange({ ...cover, file: null, preview: null, remove: Boolean(cover.stored) });
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void take(event.dataTransfer.files[0]);
  }

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "grid gap-3",
          shown ? "sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
        {shown ? (
          <div className="relative overflow-hidden rounded-lg border border-border bg-surface-sunk">
            <Image
              unoptimized
              src={shown}
              alt={t("coverAlt")}
              width={640}
              height={360}
              className="aspect-video w-full object-cover"
            />
            <button
              type="button"
              onClick={clear}
              aria-label={t("coverRemove")}
              className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}

        <label
          htmlFor={id}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={cn(
            "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
            "border-border-control bg-surface-soft/40 hover:border-primary-ink hover:bg-surface-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
            dragging && "border-primary-ink bg-surface-soft",
            message && "border-danger",
          )}
        >
          {preparing ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-6 animate-spin text-primary-ink motion-reduce:animate-none"
            />
          ) : (
            <ImagePlus
              aria-hidden="true"
              className="size-6 text-primary-ink"
              strokeWidth={1.75}
            />
          )}
          <span className="text-sm font-semibold text-ink">
            {preparing
              ? t("coverPreparing")
              : shown
                ? t("coverChange")
                : t("coverChoose")}
          </span>
          <span id={hintId} className="text-xs text-ink-muted">
            {t("coverHint")}
          </span>
          <input
            ref={input}
            id={id}
            type="file"
            accept={VACANCY_IMAGE_TYPES.join(",")}
            className="sr-only"
            aria-invalid={Boolean(message) || undefined}
            aria-describedby={[describedBy, hintId, message ? errorId : null]
              .filter(Boolean)
              .join(" ")}
            onChange={(event) => void take(event.currentTarget.files?.[0])}
          />
        </label>
      </div>
      {message ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger-ink">
          {message}
        </p>
      ) : null}
    </div>
  );
}
