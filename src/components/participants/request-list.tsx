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
  action,
}: {
  requests: readonly PastEventRequest[];
  labels: RequestListLabels;
  showVolunteer?: boolean;
  action?: (request: PastEventRequest) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-border">
      {requests.map((request) => {
        const date = requestDate(request);
        const facts = [
          date ? labels.day(date) : null,
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
              <p className="text-xs font-semibold tracking-[0.04em] text-ink-muted uppercase">
                {labels.kind[request.kind]}
              </p>
              <p className="mt-1 font-semibold [overflow-wrap:anywhere] text-ink">
                {requestSubject(request)}
              </p>
              {showVolunteer ? (
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
              {request.note ? (
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
