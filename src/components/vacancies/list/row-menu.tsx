"use client";

import { CalendarCheck, Eye, Inbox, MoreVertical, PencilLine } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

export type RowMenuItem = {
  key: "open" | "edit" | "applications" | "attendance";
  href: string;
  label: string;
};

const ICON = {
  open: Eye,
  edit: PencilLine,
  applications: Inbox,
  attendance: CalendarCheck,
} as const;

export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="grid size-8 shrink-0 place-items-center rounded-md border border-border-strong bg-surface text-ink-muted transition-colors duration-150 hover:border-border-control hover:bg-surface-sunk hover:text-ink"
      >
        <MoreVertical aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {items.map((item) => {
          const Icon = ICON[item.key];
          return (
            <DropdownMenuItem key={item.key} asChild>
              <Link href={item.href}>
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
