import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

type Catalog = Record<string, Record<string, AbstractIntlMessages>>;

/**
 * The portal sends no messages to the browser by default. The wizard formats
 * plurals, dates and errors as people type, so it gets only its namespaces.
 */
export async function WizardMessages({ children }: { children: ReactNode }) {
  const messages = (await getMessages()) as unknown as Catalog;
  const scoped = {
    vacancies: {
      wizard: messages.vacancies?.wizard ?? {},
      kinds: messages.vacancies?.kinds ?? {},
    },
    errors: messages.errors ?? {},
    vocabulary: { regions: messages.vocabulary?.regions ?? {} },
  } as AbstractIntlMessages;

  return <NextIntlClientProvider messages={scoped}>{children}</NextIntlClientProvider>;
}
