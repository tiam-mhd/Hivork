import { z } from 'zod';

/** `module.resource.action` — validated server-side against permission registry */
export const PERMISSION_CODE_PATTERN =
  /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export const permissionCodeSchema = z
  .string()
  .trim()
  .regex(PERMISSION_CODE_PATTERN, 'Invalid permission code format');

export function dedupeStringArray(values: string[]): string[] {
  return [...new Set(values)];
}

export const permissionsArraySchema = z
  .array(permissionCodeSchema)
  .min(1)
  .transform(dedupeStringArray);

export const RESERVED_ROLE_CODES = ['owner', 'manager', 'cashier', 'viewer'] as const;

export const customRoleCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(50)
  .regex(/^[a-z][a-z0-9_]+$/, 'Role code must be lowercase slug')
  .refine(
    (code) => !(RESERVED_ROLE_CODES as readonly string[]).includes(code),
    'Role code is reserved',
  );

export const dataScopeSchema = z.enum(['all', 'branch', 'own']);

export const coreListMetaSchema = z.object({
  total: z.number().int().nonnegative().optional(),
  hasNext: z.boolean(),
  nextCursor: z.string().nullable(),
  requestId: z.string().uuid().optional(),
});

export type CoreListMetaDto = z.infer<typeof coreListMetaSchema>;
