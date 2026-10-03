import {
  ArrowRight,
  Ban,
  Archive,
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  Flag,
  Hourglass,
  Inbox,
  MapPin,
  PencilLine,
  Trophy,
  Undo2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

import { buttonClass } from "@/components/ui/button";
import { CardMenu, type CardMenuItem } from "@/components/vacancies/list/card-menu";
import { SaveToggle } from "@/components/vacancies/list/save-toggle";
import { Link } from "@/i18n/navigation";
import type { CardStage, VacancyCard as Card } from "@/lib/vacancies/cards";
import { cn } from "@/lib/utils";

const STAGE: Record<CardStage, { icon: LucideIcon; className: string }> = {
  draft: { icon: PencilLine, className: "bg-black/60 text-white" },
  pending_review: { icon: Hourglass, className: "bg-knockout text-primary-deep" },
  changes_requested: { icon: Undo2, className: "bg-accent-ink text-white" },
  published: { icon: BadgeCheck, className: "bg-action text-knockout" },
  ended: { icon: Flag, className: "bg-black/60 text-white" },
  verifying: { icon: Hourglass, className: "bg-knockout text-primary-deep" },
  results: { icon: CircleCheck, className: "bg-accent text-white" },
  rejected: { icon: Ban, className: "bg-danger-fill text-white" },
  archived: { icon: Archive, className: "bg-black/60 text-white" },
};

export type VacancyCardProps = {
  id: string;
  title: string;
  organization: string;
  imageUrl: string | null;
  dates: string;
  location: string;
  kind: "volunteering" | "competition";
  kindLabel: string;
  card: Card;
  stageLabel: string;
  actionLabel: string;
  countLabel: string | null;
  saved: boolean;
  saveLabels: { save: string; unsave: string; failed: string };
  menuLabel: string;
  menu: CardMenuItem[];
};

export function VacancyCard(props: VacancyCardProps) {
  const stage = STAGE[props.card.stage];
  const StageIcon = stage.icon;
  const highlight =
    props.card.count?.key === "toReview" ||
    props.card.count?.key === "attendanceDue" ||
    props.card.count?.key === "resultsReturned";

  return (
    <article
      aria-labelledby={`vacancy-${props.id}-title`}
      className="card-rise relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-(--sheet-shadow)"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-surface-sunk">
        {props.imageUrl ? (
          <Image
            unoptimized
            src={props.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 26rem, (min-width: 768px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full place-items-center bg-[linear-gradient(135deg,var(--color-primary-muted),var(--color-surface-soft)_60%)] text-primary-ink"
          >
            {props.kind === "competition" ? (
              <Trophy className="size-9 opacity-70" strokeWidth={1.25} />
            ) : (
              <CalendarDays className="size-9 opacity-70" strokeWidth={1.25} />
            )}
          </div>
        )}
        <span
          className={cn(
            "absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-semibold shadow-sm backdrop-blur-sm",
            stage.className,
          )}
        >
          <StageIcon aria-hidden="true" className="size-3.5" />
          {props.stageLabel}
        </span>
        <div className="absolute top-3 right-3 flex gap-2">
          <SaveToggle id={props.id} saved={props.saved} labels={props.saveLabels} />
          <CardMenu label={props.menuLabel} items={props.menu} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="min-w-0">
          <h3
            id={`vacancy-${props.id}-title`}
            className="truncate text-base leading-snug font-semibold text-ink"
            title={props.title}
          >
            {props.title}
          </h3>
          <p className="truncate text-sm text-ink-muted">{props.organization}</p>
        </div>

        <p className="flex min-w-0 items-center gap-3 text-sm text-ink">
          <span className="tabular inline-flex shrink-0 items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4 text-ink-muted" />
            {props.dates}
          </span>
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
            <span className="truncate" title={props.location}>
              {props.location}
            </span>
          </span>
        </p>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-primary-ink">
            {props.kind === "competition" ? (
              <Trophy aria-hidden="true" className="size-3.5" />
            ) : (
              <UsersRound aria-hidden="true" className="size-3.5" />
            )}
            {props.kindLabel}
          </span>
          {props.countLabel ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                highlight ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              <Inbox aria-hidden="true" className="size-4 text-ink-muted" />
              {props.countLabel}
            </span>
          ) : null}
        </div>

        <Link
          href={props.card.href}
          aria-describedby={`vacancy-${props.id}-title`}
          className={cn(
            buttonClass({ size: "sm" }),
            "mt-auto w-full justify-between rounded-lg",
          )}
        >
          <span className="w-4" aria-hidden="true" />
          {props.actionLabel}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
