"use client";

import { ShieldAlert, Trophy, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/components/portal/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CoverField, type CoverState } from "@/components/vacancies/wizard/cover-field";
import { FieldShell, fieldIds } from "@/components/vacancies/wizard/field-shell";
import { VACANCY_KINDS, type VacancyKind } from "@/lib/domain/vocabulary";
import {
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
  type VacancyDraft,
} from "@/lib/vacancies/draft";
import { cn } from "@/lib/utils";

export type WizardOrganization = {
  name: string;
  verified: boolean;
  logoUrl?: string | undefined;
};

const KIND_ICON = { volunteering: UsersRound, competition: Trophy } as const;

export function DetailsStep({
  draft,
  set,
  error,
  organization,
  cover,
  onCover,
  kindLocked,
}: {
  draft: VacancyDraft;
  set: <K extends keyof VacancyDraft>(field: K, value: VacancyDraft[K]) => void;
  error: (field: string) => string | undefined;
  organization: WizardOrganization;
  cover: CoverState;
  onCover: (next: CoverState) => void;
  kindLocked: boolean;
}) {
  const t = useTranslations("vacancies.wizard");
  const kinds = useTranslations("vacancies.kinds");
  const count = draft.description.length;

  return (
    <div className="flex flex-col gap-6">
      <FieldShell id="wizard-organization" label={t("organization")} beside>
        <div
          id="wizard-organization"
          className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface-sunk/60 px-3 text-base text-ink"
        >
          <Avatar name={organization.name} src={organization.logoUrl} size="sm" />
          <span className="min-w-0 truncate">{organization.name}</span>
        </div>
        {organization.verified ? null : (
          <p className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-muted px-3 py-2.5 text-sm text-ink">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-danger-ink"
            />
            <span className="min-w-0">{t("organizationUnverified")}</span>
          </p>
        )}
      </FieldShell>

      <FieldShell
        id="wizard-title"
        label={t("title")}
        required
        beside
        error={error("title")}
      >
        <Input
          id="wizard-title"
          value={draft.title}
          maxLength={TITLE_LIMIT + 20}
          autoComplete="off"
          placeholder={t("titlePlaceholder")}
          onChange={(event) => set("title", event.target.value)}
          aria-required
          aria-invalid={Boolean(error("title")) || undefined}
          aria-describedby={fieldIds("wizard-title", false, Boolean(error("title")))}
        />
      </FieldShell>

      <FieldShell
        id="wizard-kind"
        label={t("type")}
        required
        beside
        as="fieldset"
        help={kindLocked ? t("typeLocked") : t(`typeHelp.${draft.kind}`)}
      >
        <div className="flex flex-wrap gap-3">
          {VACANCY_KINDS.map((kind: VacancyKind) => {
            const Icon = KIND_ICON[kind];
            return (
              <label
                key={kind}
                className={cn(
                  "flex min-h-12 min-w-[11rem] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-lg border px-4 text-sm font-semibold transition-colors sm:flex-none",
                  "border-border-control text-ink hover:border-primary-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                  "has-checked:border-action has-checked:bg-action has-checked:text-knockout",
                  kindLocked && "cursor-not-allowed opacity-60 has-checked:opacity-100",
                )}
              >
                <input
                  type="radio"
                  name="wizard-kind"
                  value={kind}
                  checked={draft.kind === kind}
                  disabled={kindLocked}
                  onChange={() => set("kind", kind)}
                  className="sr-only"
                />
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                {kinds(kind)}
              </label>
            );
          })}
        </div>
      </FieldShell>

      <FieldShell
        id="wizard-cover"
        label={t("cover")}
        optional={t("optional")}
        beside
        error={error("image")}
      >
        <CoverField id="wizard-cover" cover={cover} onChange={onCover} />
      </FieldShell>

      <FieldShell
        id="wizard-description"
        label={t("description")}
        required
        beside
        help={t("descriptionHelp")}
        aside={
          <span
            className={cn(
              "tabular shrink-0 text-xs",
              count > DESCRIPTION_LIMIT
                ? "font-semibold text-danger-ink"
                : "text-ink-muted",
            )}
            aria-live={count > DESCRIPTION_LIMIT - 50 ? "polite" : "off"}
          >
            {count.toLocaleString("en-US")}/{DESCRIPTION_LIMIT.toLocaleString("en-US")}
          </span>
        }
        error={error("description")}
      >
        <Textarea
          id="wizard-description"
          value={draft.description}
          rows={6}
          placeholder={t("descriptionPlaceholder")}
          onChange={(event) => set("description", event.target.value)}
          aria-required
          aria-invalid={Boolean(error("description")) || undefined}
          aria-describedby={fieldIds(
            "wizard-description",
            true,
            Boolean(error("description")),
          )}
        />
      </FieldShell>
    </div>
  );
}
