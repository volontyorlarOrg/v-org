"use client";

import { Bookmark, Search } from "lucide-react";
import Form from "next/form";
import { useRef } from "react";

import { inputClass } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export function ListFilters({
  action,
  q,
  status,
  saved,
  statuses,
  labels,
}: {
  action: string;
  q: string;
  status: string;
  saved: boolean;
  statuses: { value: string; label: string }[];
  labels: {
    search: string;
    status: string;
    allStatuses: string;
    savedOnly: string;
    apply: string;
  };
}) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();

  return (
    <Form
      ref={form}
      action={action}
      role="search"
      className="flex flex-col gap-3 md:flex-row md:items-center"
    >
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{labels.search}</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={labels.search}
          className={cn(inputClass, "pl-11")}
        />
      </label>
      <div className="flex items-center gap-3">
        <label className="min-w-0 flex-1 md:w-56 md:flex-none">
          <span className="sr-only">{labels.status}</span>
          <NativeSelect name="status" defaultValue={status} onChange={submit}>
            <NativeSelectOption value="">{labels.allStatuses}</NativeSelectOption>
            {statuses.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex min-h-12 shrink-0 cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            role="switch"
            name="saved"
            value="1"
            defaultChecked={saved}
            onChange={submit}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-6 w-10 rounded-full bg-border-control transition-colors peer-checked:bg-action peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-knockout after:transition-[translate] peer-checked:after:translate-x-4 motion-reduce:after:transition-none"
          />
          <Bookmark aria-hidden="true" className="size-4 text-ink-muted" />
          {labels.savedOnly}
        </label>
      </div>
      <button type="submit" className="sr-only">
        {labels.apply}
      </button>
    </Form>
  );
}
