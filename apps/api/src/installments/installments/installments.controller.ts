import { ApplicationError, ListInstallmentsUseCase } from '@hivork/application';
import { ListInstallmentsQuerySchema } from '@hivork/contracts/installments';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { parseDateOnlyUtc, parseDateOnlyUtcEnd } from '../sales/sales.response.js';
import { toInstallmentSummaryResponse } from './installments.response.js';

function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

/**
 * Installments list API — cursor pagination with status, branch, and date filters.
 * @see docs/02-architecture/api-contracts.md § GET installments
 */
@Controller('v1/installments')
@RequireAuth('staff')
export class InstallmentsController {
  constructor(private readonly listInstallments: ListInstallmentsUseCase) {}

  /** GET /api/v1/installments/stub — module entitlement smoke (TASK-054). */
  @Get('stub')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  stub(): { ok: true; module: 'installments'; version: string } {
    return { ok: true, module: 'installments', version: '1.0.0' };
  }

  /** GET /api/v1/installments — paginated installment list. */
  @Get()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.installment.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListInstallmentsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    const statuses = parsed.data.status;
    const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;
    const multiStatuses = statuses && statuses.length > 1 ? statuses : undefined;

    try {
      const result = await this.listInstallments.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        sort: parsed.data.sort,
        status: singleStatus,
        statuses: multiStatuses,
        branchId: parsed.data.branchId,
        saleId: parsed.data.saleId,
        tenantCustomerId: parsed.data.tenantCustomerId,
        from: parsed.data.from ? parseDateOnlyUtc(parsed.data.from) : undefined,
        to: parsed.data.to ? parseDateOnlyUtcEnd(parsed.data.to) : undefined,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return {
        data: result.data.map(toInstallmentSummaryResponse),
        meta: {
          total: result.meta.total,
          hasNext: result.meta.hasNext,
          nextCursor: result.meta.nextCursor,
          ...(result.meta.totalAmountRial !== undefined
            ? { totalAmountRial: result.meta.totalAmountRial }
            : {}),
        },
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }
}
