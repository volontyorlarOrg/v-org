import { z } from "zod";

const nullable = <T extends z.ZodTypeAny>(schema: T) => schema.nullable().default(null);

export const PAST_EVENT_REQUEST_KINDS = ["create", "update", "remove"] as const;
export const PAST_EVENT_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type PastEventRequestKind = (typeof PAST_EVENT_REQUEST_KINDS)[number];
export type PastEventRequestStatus = (typeof PAST_EVENT_REQUEST_STATUSES)[number];

const personSchema = z.object({
  id: z.string().min(1),
  displayName: nullable(z.string()),
  username: z.string().default(""),
  avatarUrl: nullable(z.string()),
});

const participationSchema = z.object({
  attendedEvents: z.number().int().default(0),
  attendedHours: z.number().default(0),
  pastEvents: z.number().int().default(0),
});

const recordedEventSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  eventDate: z.string(),
  hours: z.number(),
  xpAwarded: z.number().int(),
  countsTowardProgress: z.boolean().default(true),
  live: z.boolean().default(true),
});

export const pastEventRequestSchema = z.object({
  id: z.string().min(1),
  rosterId: nullable(z.string()),
  kind: z.enum(PAST_EVENT_REQUEST_KINDS),
  status: z.enum(PAST_EVENT_REQUEST_STATUSES),
  title: nullable(z.string()),
  eventDate: nullable(z.string()),
  hours: nullable(z.number()),
  xpAwarded: nullable(z.number().int()),
  note: nullable(z.string()),
  adjusted: z.boolean().default(false),
  reviewNote: nullable(z.string()),
  createdAt: z.string().min(1),
  reviewedAt: nullable(z.string()),
  organization: z.object({ id: z.string().min(1), name: z.string() }),
  volunteer: personSchema,
  event: nullable(recordedEventSchema),
});

export type PastEventRequest = z.infer<typeof pastEventRequestSchema>;

export const pastEventRequestPageSchema = z.object({
  items: z.array(pastEventRequestSchema),
  page: z.number().int().default(1),
  pageSize: z.number().int().default(25),
  total: z.number().int().default(0),
  pending: z.number().int().default(0),
});

export type PastEventRequestPage = z.infer<typeof pastEventRequestPageSchema>;

export const participantSchema = personSchema.extend({
  participation: participationSchema,
  pendingRequests: z.number().int().default(0),
});

export type Participant = z.infer<typeof participantSchema>;

export const participantPageSchema = z.object({
  items: z.array(participantSchema),
  page: z.number().int().default(1),
  pageSize: z.number().int().default(25),
  total: z.number().int().default(0),
});

export type ParticipantPage = z.infer<typeof participantPageSchema>;

export const participantPastEventSchema = recordedEventSchema.extend({
  pendingRequestId: nullable(z.string()),
});

export type ParticipantPastEvent = z.infer<typeof participantPastEventSchema>;

export const participantDetailSchema = participantSchema.extend({
  attended: z
    .array(
      z.object({
        id: z.string().min(1),
        opportunityId: z.string().min(1),
        title: z.string(),
        kind: z.string(),
        eventDate: z.string(),
        hours: nullable(z.number()),
        placement: nullable(z.string()),
        xpAwarded: z.number().int().default(0),
      }),
    )
    .default([]),
  pastEvents: z.array(participantPastEventSchema).default([]),
  requests: z.array(pastEventRequestSchema).default([]),
});

export type ParticipantDetail = z.infer<typeof participantDetailSchema>;
