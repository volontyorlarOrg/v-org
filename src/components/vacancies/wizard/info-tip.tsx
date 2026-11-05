"use client";

import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={label}
        className="-m-1.5 inline-grid size-8 place-items-center rounded-md text-ink-muted transition-colors duration-150 hover:text-primary-ink"
      >
        <Info aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="leading-relaxed text-ink">
        {children}
      </PopoverContent>
    </Popover>
  );
}
