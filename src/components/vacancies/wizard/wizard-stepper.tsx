"use client";

import { useTranslations } from "next-intl";

import { Steps } from "@/components/forms/steps";
import { WIZARD_STEPS, type WizardStep } from "@/lib/vacancies/draft";

export function WizardStepper({
  current,
  reachable,
  onSelect,
}: {
  current: WizardStep;
  reachable: number;
  onSelect: (step: WizardStep) => void;
}) {
  const t = useTranslations("vacancies.wizard.steps");

  return (
    <Steps
      label={t("label")}
      doneLabel={t("done")}
      steps={WIZARD_STEPS.map((step) => ({ key: step, label: t(step) }))}
      current={WIZARD_STEPS.indexOf(current)}
      reachable={reachable}
      onSelect={(step) => onSelect(step as WizardStep)}
    />
  );
}
