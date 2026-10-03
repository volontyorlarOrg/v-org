"use client";

import { CalendarCheck, Eye, Inbox, MoreVertical, PencilLine } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

export type CardMenuItem = {
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

export function CardMenu({ label, items }: { label: string; items: CardMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="grid size-9 place-items-center rounded-lg bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <MoreVertical aria-hidden="true" className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
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
