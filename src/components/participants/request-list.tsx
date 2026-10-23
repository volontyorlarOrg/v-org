import type { ReactNode } from "react";

import { StatusBadge } from "@/components/portal/status-badge";
import { Link } from "@/i18n/navigation";
import {
  REQUEST_TONES,
  requestDate,
  requestSubject,
} from "@/lib/participants/requests";
import type {
  PastEventRequest,
  PastEventRequestKind,
  PastEventRequestStatus,
} from "@/lib/participants/schemas";
import { participantHref } from "@/lib/routing/routes";

export type RequestListLabels = {
  kind: Record<PastEventRequestKind, string>;
  status: Record<PastEventRequestStatus, string>;
  adjusted: string;
  yourNote: (note: string) => string;
  reviewNote: (note: string) => string;
  sent: (when: string) => string;
  hours: (value: string) => string;
  xp: (value: string) => string;
  day: (date: string) => string;
  moment: (date: string) => string;
  number: (value: number) => string;
  unnamed: string;
};

export function RequestList({
  requests,
  labels,
  showVolunteer = false,
  inEvent = false,
  action,
}: {
  requests: readonly PastEventRequest[];
  labels: RequestListLabels;
  showVolunteer?: boolean;
  inEvent?: boolean;
  action?: (request: PastEventRequest) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-border">
      {requests.map((request) => {
        const date = requestDate(request);
        const facts = [
          date && !inEvent ? labels.day(date) : null,
          request.hours === null ? null : labels.hours(labels.number(request.hours)),
          request.xpAwarded === null
            ? null
            : labels.xp(labels.number(request.xpAwarded)),
        ].filter((fact): fact is string => fact !== null);

        return (
          <li
            key={request.id}
            className="flex flex-wrap items-start gap-x-5 gap-y-3 px-5 py-4"
          >
            <div className="min-w-0 flex-1 basis-64">
              {inEvent ? (
                <p className="[overflow-wrap:anywhere]">
                  <span className="font-semibold text-ink">
                    {request.volunteer.displayName ?? labels.unnamed}
                  </span>{" "}
                  <span className="text-sm text-ink-muted">
                    @{request.volunteer.username}
                  </span>
                </p>
              ) : (
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span className="font-semibold [overflow-wrap:anywhere] text-ink">
                    {requestSubject(request)}
                  </span>
                  <StatusBadge label={labels.kind[request.kind]} tone="neutral" />
                </p>
              )}
              {inEvent ? null : showVolunteer && request.rosterId ? (
                <p className="mt-0.5 text-sm [overflow-wrap:anywhere] text-ink-muted">
                  {request.volunteer.displayName ?? labels.unnamed} @
                  {request.volunteer.username}
                </p>
              ) : showVolunteer ? (
                <Link
                  href={participantHref(request.volunteer.id)}
                  className="mt-0.5 block w-fit text-sm text-primary-ink underline-offset-4 hover:underline"
                >
                  {request.volunteer.displayName ?? labels.unnamed}
                </Link>
              ) : null}
              {facts.length > 0 ? (
                <p className="tabular mt-1 text-sm text-ink-muted">
                  {facts.join(" · ")}
                </p>
              ) : null}
              {request.note && !inEvent ? (
                <p className="mt-2 text-sm leading-relaxed [overflow-wrap:anywhere] text-ink-muted">
                  {labels.yourNote(request.note)}
                </p>
              ) : null}
              {request.reviewNote ? (
                <p className="mt-2 text-sm leading-relaxed [overflow-wrap:anywhere] text-ink">
                  {labels.reviewNote(request.reviewNote)}
                </p>
              ) : null}
              {request.adjusted ? (
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {labels.adjusted}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusBadge
                label={labels.status[request.status]}
                tone={REQUEST_TONES[request.status]}
              />
              <time
                dateTime={request.createdAt}
                className="tabular text-xs text-ink-muted"
              >
                {labels.sent(labels.moment(request.createdAt))}
              </time>
              {action?.(request)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
