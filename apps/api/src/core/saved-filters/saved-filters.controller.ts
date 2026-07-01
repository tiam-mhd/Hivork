import {
  ApplicationError,
  CreateStaffSavedFilterUseCase,
  ListStaffSavedFiltersUseCase,
  RestoreStaffSavedFilterUseCase,
  SoftDeleteStaffSavedFilterUseCase,
  UpdateStaffSavedFilterUseCase,
} from '@hivork/application';
import {
  CreateSavedFilterSchema,
  ListSavedFiltersQuerySchema,
  SoftDeleteSavedFilterBodySchema,
  UpdateSavedFilterSchema,
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

import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { RequireAuth } from '../../common/decorators/require-auth.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { StaffContext } from '../../common/types/auth-context';
import { toSavedFilterResponse } from './saved-filters.response.js';

const filterIdParamSchema = z.string().uuid();

@Controller('v1/staff/me/saved-filters')
@RequireAuth('staff')
export class SavedFiltersController {
  constructor(
    private readonly listSavedFilters: ListStaffSavedFiltersUseCase,
    private readonly createSavedFilter: CreateStaffSavedFilterUseCase,
    private readonly updateSavedFilter: UpdateStaffSavedFilterUseCase,
    private readonly softDeleteSavedFilter: SoftDeleteStaffSavedFilterUseCase,
    private readonly restoreSavedFilter: RestoreStaffSavedFilterUseCase,
  ) {}

  @Get()
  @RequirePermission('core.saved_filter.manage')
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListSavedFiltersQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listSavedFilters.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        resourceKey: parsed.data.resourceKey,
      });

      return {
        items: result.items.map(toSavedFilterResponse),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post()
  @RequirePermission('core.saved_filter.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentStaff() staff: StaffContext, @Body() body: unknown, @Req() req: Request) {
    const parsed = CreateSavedFilterSchema.safeParse(body);
    if (!parsed.success) {
      const filterInvalid = parsed.error.issues.some((issue) =>
        issue.path.includes('filterAst'),
      );
      throw new BadRequestException({
        code: filterInvalid ? 'FILTER_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const created = await this.createSavedFilter.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        resourceKey: parsed.data.resourceKey,
        name: parsed.data.name,
        description: parsed.data.description,
        filterAst: parsed.data.filterAst,
        isDefault: parsed.data.isDefault,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedFilterResponse(created);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id')
  @RequirePermission('core.saved_filter.manage')
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const idParsed = filterIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid filter id' });
    }

    const parsed = UpdateSavedFilterSchema.safeParse(body);
    if (!parsed.success) {
      const filterInvalid = parsed.error.issues.some((issue) =>
        issue.path.includes('filterAst'),
      );
      throw new BadRequestException({
        code: filterInvalid ? 'FILTER_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const updated = await this.updateSavedFilter.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        filterId: idParsed.data,
        name: parsed.data.name,
        description: parsed.data.description,
        filterAst: parsed.data.filterAst,
        isDefault: parsed.data.isDefault,
        version: parsed.data.version,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedFilterResponse(updated);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @RequirePermission('core.saved_filter.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const idParsed = filterIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid filter id' });
    }

    const parsed = SoftDeleteSavedFilterBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.softDeleteSavedFilter.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        filterId: idParsed.data,
        deleteReason: parsed.data.deleteReason,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/restore')
  @RequirePermission('core.saved_filter.manage')
  async restore(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const idParsed = filterIdParamSchema.safeParse(id);
    if (!idParsed.success) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Invalid filter id' });
    }

    try {
      const restored = await this.restoreSavedFilter.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        filterId: idParsed.data,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return toSavedFilterResponse(restored);
    } catch (error) {
      throw this.toHttpException(error);
    }
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
