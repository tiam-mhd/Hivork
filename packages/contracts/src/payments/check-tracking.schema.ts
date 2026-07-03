import { z } from 'zod';

export const CheckTrackingTimelineEventSchema = z.object({
  at: z.string().datetime(),
  action: z.string(),
  actorStaffId: z.string().uuid().optional(),
  note: z.string().nullable(),
});

export type CheckTrackingTimelineEventDto = z.infer<typeof CheckTrackingTimelineEventSchema>;

export const CheckTrackingFollowUpNoteSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  createdAt: z.string().datetime(),
  createdById: z.string().uuid(),
});

export type CheckTrackingFollowUpNoteDto = z.infer<typeof CheckTrackingFollowUpNoteSchema>;

export const GetCheckTrackingResponseSchema = z.object({
  checkId: z.string().uuid(),
  timeline: z.array(CheckTrackingTimelineEventSchema),
  followUpNotes: z.array(CheckTrackingFollowUpNoteSchema),
});

export type GetCheckTrackingResponseDto = z.infer<typeof GetCheckTrackingResponseSchema>;

export const AddCheckTrackingNoteBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type AddCheckTrackingNoteBodyDto = z.infer<typeof AddCheckTrackingNoteBodySchema>;

export const AddCheckTrackingNoteResponseSchema = z.object({
  note: CheckTrackingFollowUpNoteSchema,
});

export type AddCheckTrackingNoteResponseDto = z.infer<typeof AddCheckTrackingNoteResponseSchema>;

export const UploadCheckImageResponseSchema = z.object({
  imageFileId: z.string().uuid(),
  mimeType: z.string(),
  sizeBytes: z.string(),
});

export type UploadCheckImageResponseDto = z.infer<typeof UploadCheckImageResponseSchema>;

export const GetCheckImageResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
  mimeType: z.string(),
  imageFileId: z.string().uuid(),
});

export type GetCheckImageResponseDto = z.infer<typeof GetCheckImageResponseSchema>;

export const CHECK_IMAGE_ABSOLUTE_MAX_BYTES = 5 * 1024 * 1024;
