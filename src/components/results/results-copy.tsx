import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

type Messages = Record<string, Record<string, unknown>>;

/**
 * Hands the result screens only the copy they render, so the applications
 * and attendance desks can count and pluralise in the browser.
 */
export async function ResultsCopy({ children }: { children: ReactNode }) {
  const messages = (await getMessages()) as Messages;
  return (
    <NextIntlClientProvider
      messages={{
        results: messages.results ?? {},
        applications: { status: messages.applications?.status ?? {} },
        attendance: { outcome: messages.attendance?.outcome ?? {} },
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
