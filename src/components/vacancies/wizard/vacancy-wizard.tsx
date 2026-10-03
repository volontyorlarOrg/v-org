"use client";

import {
  ArrowLeft,
  ArrowRight,
  MessageSquareWarning,
  TriangleAlert,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  type CoverState,
  displayedCover,
} from "@/components/vacancies/wizard/cover-field";
import {
  DetailsStep,
  type WizardOrganization,
} from "@/components/vacancies/wizard/details-step";
import { ReviewStep } from "@/components/vacancies/wizard/review-step";
import { ScheduleStep } from "@/components/vacancies/wizard/schedule-step";
import { WizardStepper } from "@/components/vacancies/wizard/wizard-stepper";
import type { Region } from "@/lib/domain/vocabulary";
import { vacancyEditHref } from "@/lib/routing/routes";
import {
  saveVacancyDraftAction,
  submitVacancyDraftAction,
  type DraftResult,
} from "@/lib/vacancies/actions";
import {
  WIZARD_STEPS,
  draftProblems,
  hasProblems,
  stepOfField,
  type DraftProblems,
  type VacancyDraft,
  type WizardStep,
} from "@/lib/vacancies/draft";
import { cn } from "@/lib/utils";

const FIELD_ORDER = [
  "title",
  "description",
  "image",
  "region",
  "locationName",
  "startDate",
  "endDate",
  "startTime",
  "endTime",
  "capacity",
  "deadlineDate",
  "deadlineTime",
  "essayPrompt",
];

const FIELD_ELEMENT: Record<string, string> = {
  title: "wizard-title",
  description: "wizard-description",
  image: "wizard-cover",
  region: "wizard-region",
  locationName: "wizard-location",
  startDate: "wizard-start-date",
  endDate: "wizard-end-date",
  startTime: "wizard-start-time",
  endTime: "wizard-end-time",
  capacity: "wizard-capacity",
  deadlineDate: "wizard-deadline-date",
  deadlineTime: "wizard-deadline-time",
  essayPrompt: "wizard-question",
};

function firstProblem(problems: DraftProblems): string | undefined {
  const keys = Object.keys(problems);
  return FIELD_ORDER.find((field) => keys.includes(field)) ?? keys[0];
}

export function VacancyWizard({
  locale,
  vacancyId,
  initialDraft,
  initialStep = "details",
  organization,
  storedImageUrl = null,
  regions,
  kindLocked = false,
  published = false,
  feedback,
  photoFailed = false,
}: {
  locale: string;
  vacancyId?: string;
  initialDraft: VacancyDraft;
  initialStep?: WizardStep;
  organization: WizardOrganization;
  storedImageUrl?: string | null;
  regions: readonly Region[];
  kindLocked?: boolean;
  published?: boolean;
  feedback?: string | undefined;
  photoFailed?: boolean;
}) {
  const t = useTranslations("vacancies.wizard");
  const errors = useTranslations("errors");
  const vocabulary = useTranslations("vocabulary");
  const format = useFormatter();

  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [reachable, setReachable] = useState(
    vacancyId ? WIZARD_STEPS.length - 1 : WIZARD_STEPS.indexOf(initialStep),
  );
  const [problems, setProblems] = useState<DraftProblems>({});
  const [notice, setNotice] = useState<string | null>(
    photoFailed ? t("photoFailed") : null,
  );
  // A banner about highlighted fields goes away once nothing is highlighted.
  const [noticeForFields, setNoticeForFields] = useState(false);
  const [savedId, setSavedId] = useState(vacancyId);
  const [cover, setCover] = useState<CoverState>({
    stored: storedImageUrl,
    file: null,
    preview: null,
    remove: false,
  });
  const [saved, setSaved] = useState(() => JSON.stringify(initialDraft));
  const [pending, setPending] = useState<"save" | "submit" | null>(null);
  const [, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const dirty = JSON.stringify(draft) !== saved || cover.file !== null || cover.remove;

  useEffect(() => {
    if (!dirty || pending === "submit") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [step]);

  const set = useCallback(
    <K extends keyof VacancyDraft>(field: K, value: VacancyDraft[K]) => {
      setDraft((current) => ({ ...current, [field]: value }));
      setProblems((current) => {
        const clears =
          field === "days" || field === "sameTimes" || field === "deadlineTime";
        if (!(field in current) && !clears) return current;
        const next = { ...current };
        delete next[field];
        if (field === "deadlineTime") delete next.deadlineDate;
        if (field === "days" || field === "sameTimes") {
          for (const key of Object.keys(next))
            if (key.startsWith("day-")) delete next[key];
        }
        return next;
      });
    },
    [],
  );

  const message = (code: string) =>
    errors.has(code) ? errors(code) : errors("server");
  const error = (field: string) => {
    const code = problems[field]?.[0];
    return code ? message(code) : undefined;
  };

  function go(next: WizardStep) {
    moved.current = true;
    setStep(next);
    setReachable((current) => Math.max(current, WIZARD_STEPS.indexOf(next)));
  }

  function show(found: DraftProblems, banner?: string) {
    setProblems(found);
    setNotice(banner ?? t("fixFirst"));
    setNoticeForFields(true);
    const field = firstProblem(found);
    if (!field) return;
    const target = stepOfField(field);
    if (target !== step) go(target);
    requestAnimationFrame(() => {
      const element = document.getElementById(FIELD_ELEMENT[field] ?? "");
      element?.focus({ preventScroll: false });
    });
  }

  function proceed() {
    const found = draftProblems(draft, step);
    if (hasProblems(found)) {
      show(found);
      return;
    }
    setProblems({});
    setNotice(null);
    const next = WIZARD_STEPS[WIZARD_STEPS.indexOf(step) + 1];
    if (next) go(next);
  }

  function back() {
    const previous = WIZARD_STEPS[WIZARD_STEPS.indexOf(step) - 1];
    if (previous) go(previous);
  }

  function formData() {
    const body = new FormData();
    body.set("draft", JSON.stringify(draft));
    body.set("locale", locale);
    if (savedId) body.set("id", savedId);
    if (cover.file) body.set("image", cover.file);
    if (cover.remove) body.set("removeImage", "on");
    return body;
  }

  function settle(result: DraftResult, snapshot: string) {
    const id = result.id;
    if (id && id !== savedId) {
      setSavedId(id);
      window.history.replaceState(null, "", `/${locale}${vacancyEditHref(id)}`);
    }
    if (result.status === "ok") {
      setSaved(snapshot);
      setCover((current) => ({
        stored: current.preview ?? (current.remove ? null : current.stored),
        file: null,
        preview: current.preview,
        remove: false,
      }));
      setProblems({});
      setNotice(null);
      return true;
    }
    if (result.code === "vacancyImageAfterSaveFailed") {
      setSaved(snapshot);
      show(result.fields, t("photoFailed"));
      return false;
    }
    if (Object.keys(result.fields).length > 0) {
      show(result.fields);
      return false;
    }
    setNotice(message(result.code));
    setNoticeForFields(false);
    return false;
  }

  function save() {
    const found = draftProblems(draft, "all", "draft");
    if (hasProblems(found)) {
      const scheduleOnly = Object.keys(found).every(
        (field) => stepOfField(field) === "schedule",
      );
      show(
        found,
        step === "details" && scheduleOnly ? t("draftNeedsSchedule") : undefined,
      );
      return;
    }
    const snapshot = JSON.stringify(draft);
    const body = formData();
    setPending("save");
    startTransition(async () => {
      try {
        const result = await saveVacancyDraftAction(body);
        if (settle(result, snapshot)) toast.success(t("saved"));
      } catch {
        setNoticeForFields(false);
        setNotice(errors("network"));
      } finally {
        setPending(null);
      }
    });
  }

  function submit() {
    const found = draftProblems(draft, "all", "submit");
    if (hasProblems(found)) {
      show(found);
      return;
    }
    const snapshot = JSON.stringify(draft);
    const body = formData();
    setPending("submit");
    startTransition(async () => {
      try {
        const result = await submitVacancyDraftAction(body);
        // Success redirects; reaching here means it did not go through.
        settle(result, snapshot);
      } catch {
        setNoticeForFields(false);
        setNotice(errors("network"));
      } finally {
        setPending(null);
      }
    });
  }

  const formatHours = (hours: number) =>
    format.number(hours, { maximumFractionDigits: 2 });
  const index = WIZARD_STEPS.indexOf(step);
  const busy = pending !== null;
  const stepTitle =
    step === "details"
      ? t("steps.details")
      : step === "schedule"
        ? t("scheduleTitle")
        : t("reviewTitle");

  return (
    <div className="flex flex-col gap-5">
      <WizardStepper
        current={step}
        reachable={reachable}
        onSelect={(next) => {
          if (WIZARD_STEPS.indexOf(next) < index) {
            go(next);
            return;
          }
          const found = draftProblems(draft, step);
          if (hasProblems(found)) show(found);
          else go(next);
        }}
      />

      {feedback ? (
        <section className="flex gap-3 rounded-xl border border-primary-muted bg-surface-soft px-4 py-3">
          <MessageSquareWarning
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-primary-ink"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{t("feedbackTitle")}</h2>
            <p className="mt-0.5 text-sm whitespace-pre-line text-ink">{feedback}</p>
          </div>
        </section>
      ) : null}

      {published ? (
        <p className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-ink">
          {t("publishedNote")}
        </p>
      ) : null}

      <form
        noValidate
        aria-labelledby="wizard-step-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "review") submit();
          else proceed();
        }}
        className="flex min-w-0 flex-col sheet"
      >
        <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
          <div className={cn(step === "review" && "sr-only")}>
            <h2
              id="wizard-step-title"
              ref={heading}
              tabIndex={-1}
              className="scroll-mt-6 text-section text-ink outline-none"
            >
              {stepTitle}
            </h2>
            {step === "schedule" ? (
              <p className="mt-0.5 text-sm text-ink-muted">
                {t("scheduleDescription")}
              </p>
            ) : null}
          </div>

          {notice && !(noticeForFields && !hasProblems(problems)) ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-muted px-4 py-3 text-sm font-medium text-danger-ink"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">{notice}</span>
            </p>
          ) : null}

          <div key={step} className="wizard-step-enter">
            {step === "details" ? (
              <DetailsStep
                draft={draft}
                set={set}
                error={error}
                organization={organization}
                cover={cover}
                onCover={(next) => {
                  setCover(next);
                  setProblems((current) => {
                    const rest = { ...current };
                    delete rest.image;
                    return rest;
                  });
                }}
                kindLocked={kindLocked}
              />
            ) : step === "schedule" ? (
              <ScheduleStep
                draft={draft}
                set={set}
                error={error}
                regions={regions}
                formatHours={formatHours}
              />
            ) : (
              <ReviewStep
                draft={draft}
                organization={organization}
                cover={displayedCover(cover)}
                regionName={draft.region ? vocabulary(`regions.${draft.region}`) : ""}
                onEdit={go}
                formatHours={formatHours}
              />
            )}
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-b-[inherit] border-t border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {index > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={back}
                disabled={busy}
              >
                <ArrowLeft aria-hidden="true" />
                {t("previous")}
              </Button>
            ) : null}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={save}
                disabled={busy}
              >
                {pending === "save" ? t("saving") : t("saveDraft")}
              </Button>
              {step === "review" ? (
                <Button type="submit" size="sm" disabled={busy}>
                  {pending === "submit" ? t("submitting") : t("submit")}
                </Button>
              ) : (
                <Button type="submit" size="sm" disabled={busy}>
                  {t("continue")}
                  <ArrowRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          {step === "review" ? (
            <p className="text-right text-xs text-ink-muted">{t("submitNote")}</p>
          ) : null}
        </footer>
      </form>
    </div>
  );
}
