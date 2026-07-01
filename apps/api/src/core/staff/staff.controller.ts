import {
  ApplicationError,
  AssignRoleToStaffUseCase,
  CreatePermissionOverrideUseCase,
  CreateStaffUseCase,
  DeletePermissionOverrideUseCase,
  GetCurrentStaffMeUseCase,
  GetStaffUseCase,
  ListPermissionOverridesUseCase,
  ListRolesUseCase,
  ListStaffUseCase,
  RemoveRoleFromStaffUseCase,
  SetActiveBranchUseCase,
  SoftDeleteStaffUseCase,
  UpdateStaffUseCase,
} from '@hivork/application';
import {
  AssignRoleSchema,
  CreatePermissionOverrideSchema,
  CreateStaffSchema,
  StaffListQuerySchema,
  UpdateStaffSchema,
} from '@hivork/contracts/core';
import { SetActiveBranchSchema } from '@hivork/contracts/staff';
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
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequireAuth } from '../../common/decorators/require-auth.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';
import { AppConfigService } from '../../config/app-config.service';
import {
  buildRoleEmbedMap,
  toAssignRoleResponse,
  toPermissionOverrideResponse,
  toStaffListItemResponse,
  toStaffMeResponse,
  toStaffResponse,
} from './staff.response';

const staffIdParamSchema = z.string().uuid();
const roleIdParamSchema = z.string().uuid();
const overrideIdParamSchema = z.string().uuid();

const softDeleteStaffBodySchema = z.object({
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

@Controller('v1/staff')
@RequireAuth('staff')
export class StaffController {
  constructor(
    private readonly createStaff: CreateStaffUseCase,
    private readonly listStaff: ListStaffUseCase,
    private readonly getStaff: GetStaffUseCase,
    private readonly getCurrentStaffMe: GetCurrentStaffMeUseCase,
    private readonly updateStaff: UpdateStaffUseCase,
    private readonly softDeleteStaff: SoftDeleteStaffUseCase,
    private readonly assignRole: AssignRoleToStaffUseCase,
    private readonly removeRole: RemoveRoleFromStaffUseCase,
    private readonly listPermissionOverrides: ListPermissionOverridesUseCase,
    private readonly createPermissionOverride: CreatePermissionOverrideUseCase,
    private readonly deletePermissionOverride: DeletePermissionOverrideUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly setActiveBranchUseCase: SetActiveBranchUseCase,
    private readonly appConfig: AppConfigService,
  ) {}

  @Patch('me/active-branch')
  @HttpCode(HttpStatus.OK)
  async setActiveBranch(@CurrentStaff() staff: StaffContext, @Body() body: unknown) {
    const parsed = SetActiveBranchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.setActiveBranchUseCase.execute({
        staffId: staff.id,
        branchId: parsed.data.branchId,
      });

      return {
        activeBranchId: result.activeBranchId,
        expiresIn: this.appConfig.jwtRefreshTtlSeconds,
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentStaff() staff: StaffContext) {
    try {
      const result = await this.getCurrentStaffMe.execute({
        staffId: staff.id,
        tenantId: staff.tenantId,
        activeBranchId: staff.activeBranchId,
      });

      return toStaffMeResponse(result.staff, result.permissions, result.activeBranchId);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get()
  @RequirePermission('core.staff.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = StaffListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listStaff.execute({
        tenantId: staff.tenantId,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        sort: parsed.data.sort,
        status: parsed.data.status,
        branchId: parsed.data.branchId,
        search: parsed.data.search,
        staffContext: toStaffContext(staff),
      });

      return {
        data: result.data.map(toStaffListItemResponse),
        meta: result.meta,
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('core.staff.create')
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = CreateStaffSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.createStaff.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        phone: parsed.data.phone,
        name: parsed.data.name,
        email: parsed.data.email,
        jobTitle: parsed.data.jobTitle,
        dataScope: parsed.data.dataScope,
        assignedBranchIds: parsed.data.assignedBranchIds,
        primaryBranchId: parsed.data.primaryBranchId,
        roleIds: parsed.data.roleIds,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const rolesById = await this.loadRoleEmbedMap(staff.tenantId);
      return toStaffResponse(result, rolesById);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id')
  @RequirePermission('core.staff.view')
  @ApplyDataScope()
  async get(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const staffId = this.parseStaffId(id);

    try {
      const result = await this.getStaff.execute({
        tenantId: staff.tenantId,
        staffId,
        staffContext: toStaffContext(staff),
      });

      const rolesById = await this.loadRoleEmbedMap(staff.tenantId);
      return toStaffResponse(result, rolesById);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id')
  @RequirePermission('core.staff.update')
  @ApplyDataScope()
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const staffId = this.parseStaffId(id);
    const parsed = UpdateStaffSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.updateStaff.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffId,
        name: parsed.data.name,
        email: parsed.data.email,
        jobTitle: parsed.data.jobTitle,
        status: parsed.data.status,
        dataScope: parsed.data.dataScope,
        assignedBranchIds: parsed.data.assignedBranchIds,
        primaryBranchId: parsed.data.primaryBranchId,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const rolesById = await this.loadRoleEmbedMap(staff.tenantId);
      return toStaffResponse(result, rolesById);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.staff.delete')
  @ApplyDataScope()
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const staffId = this.parseStaffId(id);
    const parsed =
      body === undefined || body === null
        ? { success: true as const, data: {} }
        : softDeleteStaffBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.softDeleteStaff.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffId,
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

  @Post(':id/roles')
  @RequirePermission('core.staff.update')
  @ApplyDataScope()
  async assignStaffRole(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const staffId = this.parseStaffId(id);
    const parsed = AssignRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.assignRole.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffId,
        roleId: parsed.data.roleId,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
      return toAssignRoleResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.staff.update')
  @ApplyDataScope()
  async removeStaffRole(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Req() request: Request,
  ) {
    const staffId = this.parseStaffId(id);
    const parsedRoleId = this.parseRoleId(roleId);

    try {
      const result = await this.removeRole.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffId,
        roleId: parsedRoleId,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return result;
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id/permission-overrides')
  @RequirePermission('core.staff.update')
  @ApplyDataScope()
  async listStaffPermissionOverrides(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
  ) {
    const staffId = this.parseStaffId(id);

    try {
      const result = await this.listPermissionOverrides.execute({
        tenantId: staff.tenantId,
        staffId,
        staffContext: toStaffContext(staff),
      });

      return {
        data: result.data.map(toPermissionOverrideResponse),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/permission-overrides')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('core.staff.update')
  @ApplyDataScope()
  async createStaffPermissionOverride(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const staffId = this.parseStaffId(id);
    const parsed = CreatePermissionOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.createPermissionOverride.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffId,
        permission: parsed.data.permission,
        effect: parsed.data.effect,
        reason: parsed.data.reason,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toPermissionOverrideResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id/permission-overrides/:overrideId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.staff.update')
  @ApplyDataScope()
  async removeStaffPermissionOverride(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('overrideId') overrideId: string,
    @Req() request: Request,
  ) {
    const staffId = this.parseStaffId(id);
    const parsedOverrideId = this.parseOverrideId(overrideId);

    try {
      return await this.deletePermissionOverride.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffId,
        overrideId: parsedOverrideId,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private async loadRoleEmbedMap(tenantId: string) {
    const listed = await this.listRoles.execute({ tenantId });
    return buildRoleEmbedMap(listed.data);
  }

  private parseStaffId(id: string): string {
    const parsed = staffIdParamSchema.safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Staff id must be a valid UUID.',
      });
    }

    return parsed.data;
  }

  private parseRoleId(id: string): string {
    const parsed = roleIdParamSchema.safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Role id must be a valid UUID.',
      });
    }

    return parsed.data;
  }

  private parseOverrideId(id: string): string {
    const parsed = overrideIdParamSchema.safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Override id must be a valid UUID.',
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
