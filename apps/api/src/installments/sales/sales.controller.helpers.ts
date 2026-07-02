import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { readBranchHeader } from '../../common/utils/auth-request.util.js';
import type { StaffContext } from '../../common/types/auth-context.js';

export const saleIdParamSchema = z.string().uuid();
export const versionNumberParamSchema = z.coerce.number().int().positive();
export const expectedVersionHeaderSchema = z.coerce.number().int().positive();

export function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

export function resolveBranchId(staff: StaffContext, request: Request): string {
  const branchId = readBranchHeader(request) ?? staff.activeBranchId;
  if (!branchId) {
    throw new BadRequestException({
      code: 'FIELD_REQUIRED',
      message: 'X-Branch-Id header or active branch session is required.',
    });
  }
  return branchId;
}

export function readExpectedVersion(request: Request): number {
  const raw = request.headers['x-sale-version'];
  const parsed = expectedVersionHeaderSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'FIELD_REQUIRED',
      message: 'X-Sale-Version header must be a positive integer.',
    });
  }
  return parsed.data;
}

export function parseSaleId(id: string): string {
  const parsed = saleIdParamSchema.safeParse(id);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Sale id must be a valid UUID.',
    });
  }
  return parsed.data;
}

export function parseResourceId(id: string, label: string): string {
  const parsed = saleIdParamSchema.safeParse(id);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `${label} must be a valid UUID.`,
    });
  }
  return parsed.data;
}
