import { z } from 'zod';

import { CursorPaginationSchema } from '../common/pagination.schema.js';
import { phoneSchema } from '../common/phone.schema.js';
import { coreListMetaSchema, dataScopeSchema } from './shared.schema.js';

export const StaffListSortSchema = z.enum([
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
]);

export type StaffListSortDto = z.infer<typeof StaffListSortSchema>;

export const StaffRoleEmbedSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
});

export type StaffRoleEmbedDto = z.infer<typeof StaffRoleEmbedSchema>;

export const CreateStaffSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().optional(),
  jobTitle: z.string().trim().max(100).optional(),
  dataScope: dataScopeSchema,
  assignedBranchIds: z.array(z.string().uuid()).max(50).optional(),
  primaryBranchId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional().nullable(),
  jobTitle: z.string().trim().max(100).optional().nullable(),
  status: z.enum(['active', 'suspended']).optional(),
  dataScope: dataScopeSchema.optional(),
  assignedBranchIds: z.array(z.string().uuid()).max(50).optional(),
  primaryBranchId: z.string().uuid().nullable().optional(),
});

export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;

export const StaffResponseSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  email: z.string().nullable(),
  jobTitle: z.string().nullable(),
  status: z.enum(['active', 'suspended']),
  dataScope: dataScopeSchema,
  assignedBranchIds: z.array(z.string().uuid()),
  primaryBranchId: z.string().uuid().nullable(),
  roles: z.array(StaffRoleEmbedSchema),
  lastLoginAt: z.string().datetime().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
});

export type StaffResponseDto = z.infer<typeof StaffResponseSchema>;

export const StaffListItemSchema = StaffResponseSchema.pick({
  id: true,
  phone: true,
  name: true,
  email: true,
  jobTitle: true,
  status: true,
  dataScope: true,
  assignedBranchIds: true,
  primaryBranchId: true,
  lastLoginAt: true,
  createdAt: true,
}).extend({
  roleIds: z.array(z.string().uuid()),
});

export type StaffListItemDto = z.infer<typeof StaffListItemSchema>;

export const StaffListQuerySchema = CursorPaginationSchema.pick({
  cursor: true,
  limit: true,
}).extend({
  sort: StaffListSortSchema.default('createdAt:desc'),
  status: z.enum(['active', 'suspended']).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
});

export type StaffListQueryDto = z.infer<typeof StaffListQuerySchema>;

export const StaffListResponseSchema = z.object({
  data: z.array(StaffListItemSchema),
  meta: coreListMetaSchema,
});

export type StaffListResponseDto = z.infer<typeof StaffListResponseSchema>;

export const AssignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;

export const AssignRoleResponseSchema = z.object({
  staffId: z.string().uuid(),
  roleId: z.string().uuid(),
  role: StaffRoleEmbedSchema.omit({ id: true }),
  assignedAt: z.string().datetime(),
  created: z.boolean().optional(),
});

export type AssignRoleResponseDto = z.infer<typeof AssignRoleResponseSchema>;

export const RemoveRoleResponseSchema = z.object({
  removed: z.literal(true),
});

export type RemoveRoleResponseDto = z.infer<typeof RemoveRoleResponseSchema>;
