import "server-only";

import { getTranslations } from "next-intl/server";

const ERROR_CODES = [
  "server",
  "network",
  "timeout",
  "rateLimited",
  "unavailable",
  "forbidden",
  "notFound",
  "conflict",
  "validationFailed",
  "awaitingContract",
  "sessionExpired",
  "required",
  "tooLong",
  "slug",
  "date",
  "deadlineAfterStart",
  "endBeforeStart",
  "capacity",
  "estimatedHours",
  "competitionHoursNotAllowed",
  "opportunityKindLocked",
  "cityRequired",
  "venueRequired",
  "onlineLocationRequired",
  "onlineLocationCredentials",
  "slugUnavailable",
  "opportunityNotFound",
  "organizationNotVerified",
  "opportunityNotReadyForApproval",
  "opportunityNotSubmittable",
  "opportunityNotPending",
  "decisionNoteRequired",
  "opportunityIncomplete",
  "opportunityCannotBeSubmitted",
  "opportunityCannotBePublished",
  "opportunityNotPendingApproval",
  "opportunityNotEditable",
  "opportunityImageInvalid",
  "opportunityImageTooLarge",
  "opportunityImageFormatUnsupported",
  "opportunityImageTooSmall",
  "opportunityImageStorageUnavailable",
  "vacancyImageAfterSaveFailed",
  "approvalNoteRequired",
  "deadlinePassed",
  "invalidOpportunityDates",
] as const;

export async function errorCatalog(
  codes: readonly string[] = ERROR_CODES,
): Promise<Record<string, string>> {
  const errors = await getTranslations("errors");
  return Object.fromEntries(codes.map((code) => [code, errors(code)]));
}
