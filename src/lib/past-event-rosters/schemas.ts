import { z } from "zod";
import { pastEventRequestSchema } from "@/lib/participants/schemas";
import { pastEventProposalSchema } from "@/lib/participants/input";

export const rosterVolunteerSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

export type RosterVolunteer = z.infer<typeof rosterVolunteerSchema>;

export const rosterInputSchema = pastEventProposalSchema
  .omit({ hours: true, xpAwarded: true })
  .extend({
    submissionId: z.uuid("pastEventRosterConflict"),
    participants: z
      .array(
        pastEventProposalSchema.pick({ hours: true, xpAwarded: true }).extend({
          volunteerId: z.uuid("pastEventVolunteerNotFound"),
        }),
      )
      .min(1, "pastEventRosterParticipants")
      .max(100, "pastEventRosterParticipants")
      .refine(
        (participants) =>
          new Set(participants.map((person) => person.volunteerId)).size ===
          participants.length,
        "pastEventRosterDuplicate",
      ),
  });

const summaryFields = {
  id: z.uuid(),
  title: z.string(),
  eventDate: z.iso.date(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
};

export const pastEventRosterSchema = z.object({
  ...summaryFields,
  requests: z.array(pastEventRequestSchema),
});

export type PastEventRoster = z.infer<typeof pastEventRosterSchema>;

export const pastEventRosterPageSchema = z.object({
  items: z.array(
    z.object({
      ...summaryFields,
      participants: z.number().int(),
      pending: z.number().int(),
      approved: z.number().int(),
      rejected: z.number().int(),
      cancelled: z.number().int(),
    }),
  ),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
