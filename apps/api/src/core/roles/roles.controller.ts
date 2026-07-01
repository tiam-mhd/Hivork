import {
  ApplicationError,
  CreateRoleUseCase,
  GetRoleUseCase,
  ListRolesUseCase,
  SoftDeleteRoleUseCase,
  UpdateRoleUseCase,
} from '@hivork/application';
import { CreateRoleSchema, UpdateRoleSchema } from '@hivork/contracts/core';
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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequireAuth } from '../../common/decorators/require-auth.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';
import { toRoleResponse } from './roles.response';

const roleIdParamSchema = z.string().uuid();

const softDeleteRoleBodySchema = z.object({
  deleteReason: z.string().trim().max(500).optional(),
});

@Controller('v1/roles')
@RequireAuth('staff')
export class RolesController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly getRole: GetRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly softDeleteRole: SoftDeleteRoleUseCase,
  ) {}

  @Get()
  @RequirePermission('core.role.view')
  async list(@CurrentStaff() staff: StaffContext) {
    try {
      const result = await this.listRoles.execute({ tenantId: staff.tenantId });
      return {
        data: result.data.map((role) => toRoleResponse(role)),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('core.role.create')
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = CreateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.createRole.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        code: parsed.data.code,
        name: parsed.data.name,
        permissions: parsed.data.permissions,
        dataScope: parsed.data.dataScope,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toRoleResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id')
  @RequirePermission('core.role.view')
  async get(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const roleId = this.parseRoleId(id);

    try {
      const result = await this.getRole.execute({
        tenantId: staff.tenantId,
        roleId,
      });

      return toRoleResponse(result, { assignedStaffCount: result.assignedStaffCount });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id')
  @RequirePermission('core.role.update')
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const roleId = this.parseRoleId(id);
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.updateRole.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        roleId,
        name: parsed.data.name,
        permissions: parsed.data.permissions,
        dataScope: parsed.data.dataScope,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toRoleResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.role.delete')
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const roleId = this.parseRoleId(id);
    const parsed =
      body === undefined || body === null
        ? { success: true as const, data: {} }
        : softDeleteRoleBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.softDeleteRole.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        roleId,
        deleteReason: parsed.data.deleteReason,
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
