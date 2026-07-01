import {
  ApplicationError,
  CreateStaffSavedViewUseCase,
  ForkSharedSavedViewUseCase,
  GetStaffPermissionsUseCase,
  ListStaffSavedViewsUseCase,
  RestoreStaffSavedViewUseCase,
  SoftDeleteStaffSavedViewUseCase,
  UpdateStaffSavedViewUseCase,
} from '@hivork/application';
import {
  CreateSavedViewSchema,
  ForkSavedViewSchema,
  ListSavedViewsQuerySchema,
  SoftDeleteSavedViewBodySchema,
  UpdateSavedViewSchema,
} from '@hivork/contracts/core';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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

import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { toSavedViewResponse } from './saved-views.response.js';

const viewIdParamSchema = z.string().uuid();

@Controller('v1/staff/me/saved-views')
@RequireAuth('staff')
export class SavedViewsController {
  constructor(
    private readonly listSavedViews: ListStaffSavedViewsUseCase,
    private readonly createSavedView: CreateStaffSavedViewUseCase,
    private readonly updateSavedView: UpdateStaffSavedViewUseCase,
    private readonly softDeleteSavedView: SoftDeleteStaffSavedViewUseCase,
    private readonly restoreSavedView: RestoreStaffSavedViewUseCase,
    private readonly forkSharedSavedView: ForkSharedSavedViewUseCase,
    private readonly getStaffPermissions: GetStaffPermissionsUseCase,
  ) {}

  @Get()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListSavedViewsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const { canManage, canUseShared } = await this.resolvePermissions(staff.id);
      if (!canManage && !canUseShared) {
        throw this.permissionDenied();
      }

      const result = await this.listSavedViews.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        resourceKey: parsed.data.resourceKey,
        includeShared: parsed.data.includeShared && canUseShared,
      });

      return {
        mine: canManage ? result.mine.map(toSavedViewResponse) : [],
        shared: parsed.data.includeShared && canUseShared
          ? result.shared.map(toSavedViewResponse)
          : [],
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post()
  @RequirePermission('core.saved_view.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentStaff() staff: StaffContext, @Body() body: unknown, @Req() req: Request) {
    const parsed = CreateSavedViewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const created = await this.createSavedView.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        resourceKey: parsed.data.resourceKey,
        name: parsed.data.name,
        description: parsed.data.description,
        columnState: parsed.data.columnState,
        sortBy: parsed.data.sortBy,
        sortDir: parsed.data.sortDir,
        search: parsed.data.search,
        savedFilterId: parsed.data.savedFilterId,
        isDefault: parsed.data.isDefault,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedViewResponse(created);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id')
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const idParsed = viewIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid view id' });
    }

    const parsed = UpdateSavedViewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const { canManage, canShare } = await this.resolvePermissions(staff.id);
      const visibilityOnly =
        parsed.data.visibility !== undefined &&
        parsed.data.name === undefined &&
        parsed.data.description === undefined &&
        parsed.data.columnState === undefined &&
        parsed.data.sortBy === undefined &&
        parsed.data.sortDir === undefined &&
        parsed.data.search === undefined &&
        parsed.data.savedFilterId === undefined &&
        parsed.data.isDefault === undefined;

      if (visibilityOnly) {
        if (!canShare) {
          throw this.permissionDenied();
        }
      } else if (!canManage) {
        throw this.permissionDenied();
      }
      if (parsed.data.visibility !== undefined && !canShare) {
        throw this.permissionDenied();
      }

      const updated = await this.updateSavedView.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        viewId: idParsed.data,
        name: parsed.data.name,
        description: parsed.data.description,
        columnState: parsed.data.columnState,
        sortBy: parsed.data.sortBy,
        sortDir: parsed.data.sortDir,
        search: parsed.data.search,
        savedFilterId: parsed.data.savedFilterId,
        isDefault: parsed.data.isDefault,
        visibility: parsed.data.visibility,
        version: parsed.data.version,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedViewResponse(updated);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @RequirePermission('core.saved_view.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const idParsed = viewIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid view id' });
    }

    const parsed = SoftDeleteSavedViewBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.softDeleteSavedView.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        viewId: idParsed.data,
        deleteReason: parsed.data.deleteReason,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/restore')
  @RequirePermission('core.saved_view.manage')
  async restore(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const idParsed = viewIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid view id' });
    }

    try {
      const restored = await this.restoreSavedView.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        viewId: idParsed.data,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedViewResponse(restored);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/fork')
  async fork(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const idParsed = viewIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid view id' });
    }

    const parsed = ForkSavedViewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const { canUseShared } = await this.resolvePermissions(staff.id);
      if (!canUseShared) {
        throw this.permissionDenied();
      }

      const forked = await this.forkSharedSavedView.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        viewId: idParsed.data,
        name: parsed.data.name,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedViewResponse(forked);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private async resolvePermissions(staffId: string) {
    const effective = await this.getStaffPermissions.execute({ staffId });
    return {
      canManage: this.getStaffPermissions.hasPermission(effective, 'core.saved_view.manage'),
      canShare: this.getStaffPermissions.hasPermission(effective, 'core.saved_view.share'),
      canUseShared: this.getStaffPermissions.hasPermission(effective, 'core.saved_view.use_shared'),
    };
  }

  private permissionDenied(): ForbiddenException {
    return new ForbiddenException({
      code: 'PERMISSION_DENIED',
      message: 'You do not have permission to perform this action.',
    });
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof ApplicationError) {
      return new HttpException(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        error.httpStatus,
      );
    }

    throw error;
  }
}
