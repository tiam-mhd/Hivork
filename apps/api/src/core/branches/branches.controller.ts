import {
  ApplicationError,
  CreateBranchUseCase,
  GetBranchUseCase,
  ListBranchesUseCase,
  SoftDeleteBranchUseCase,
  UpdateBranchUseCase,
} from '@hivork/application';
import {
  BranchListQuerySchema,
  CreateBranchSchema,
  UpdateBranchSchema,
} from '@hivork/contracts/core';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequireAuth } from '../../common/decorators/require-auth.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';
import { toBranchListItemResponse, toBranchResponse } from './branches.response';

const branchIdParamSchema = z.string().uuid();

const softDeleteBranchBodySchema = z.object({
  deleteReason: z.string().trim().max(500).optional(),
});

function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

function assertBranchManagementAllowed(staff: StaffContext): void {
  if (staff.dataScope === 'all') {
    return;
  }

  throw new ApplicationError(
    'PERMISSION_DENIED',
    'Branch mutations require tenant-wide access.',
    403,
  );
}

@Controller('v1/branches')
@RequireAuth('staff')
export class BranchesController {
  constructor(
    private readonly createBranch: CreateBranchUseCase,
    private readonly listBranches: ListBranchesUseCase,
    private readonly getBranch: GetBranchUseCase,
    private readonly updateBranch: UpdateBranchUseCase,
    private readonly softDeleteBranch: SoftDeleteBranchUseCase,
  ) {}

  @Get()
  @RequirePermission('core.branch.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = BranchListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listBranches.execute({
        tenantId: staff.tenantId,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        sort: parsed.data.sort,
        isActive: parsed.data.isActive,
        staffContext: toStaffContext(staff),
      });

      return {
        data: result.data.map(toBranchListItemResponse),
        meta: result.meta,
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('core.branch.create')
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = CreateBranchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      assertBranchManagementAllowed(staff);

      const result = await this.createBranch.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        name: parsed.data.name,
        address: parsed.data.address,
        phone: parsed.data.phone,
        isActive: parsed.data.isActive,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toBranchResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id')
  @RequirePermission('core.branch.view')
  @ApplyDataScope()
  async get(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const branchId = this.parseBranchId(id);

    try {
      const result = await this.getBranch.execute({
        tenantId: staff.tenantId,
        branchId,
        staffContext: toStaffContext(staff),
      });

      return toBranchResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id')
  @RequirePermission('core.branch.update')
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const branchId = this.parseBranchId(id);
    const parsed = UpdateBranchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      assertBranchManagementAllowed(staff);

      const result = await this.updateBranch.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        branchId,
        name: parsed.data.name,
        address: parsed.data.address,
        phone: parsed.data.phone,
        isActive: parsed.data.isActive,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toBranchResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.branch.delete')
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const branchId = this.parseBranchId(id);
    const parsed =
      body === undefined || body === null
        ? { success: true as const, data: {} }
        : softDeleteBranchBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      assertBranchManagementAllowed(staff);

      const result = await this.softDeleteBranch.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        branchId,
        deleteReason: parsed.data.deleteReason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        id: result.id,
        deletedAt: result.deletedAt.toISOString(),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private parseBranchId(id: string): string {
    const parsed = branchIdParamSchema.safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Branch id must be a valid UUID.',
      });
    }

    return parsed.data;
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof ApplicationError) {
      return new HttpException(
        { code: error.code, message: error.message, details: error.details },
        error.httpStatus,
      );
    }

    throw error;
  }
}
