import { z } from 'zod';

export const LoginSnapshotSchema = z.object({
  at: z.string().datetime(),
  ip: z.string().optional(),
  deviceLabel: z.string().optional(),
});

export const StaffLastLoginResponseSchema = z.object({
  current: LoginSnapshotSchema.nullable(),
  previous: LoginSnapshotSchema.nullable(),
});

export type LoginSnapshotDto = z.infer<typeof LoginSnapshotSchema>;
export type StaffLastLoginResponseDto = z.infer<typeof StaffLastLoginResponseSchema>;
