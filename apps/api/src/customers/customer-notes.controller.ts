import {
  ApplicationError,
  CreateCustomerNoteUseCase,
  DeleteCustomerNoteUseCase,
  GetStaffPermissionsUseCase,
  ListCustomerNotesUseCase,
  UpdateCustomerNoteUseCase,
} from '@hivork/application';
import {
  CreateCustomerNoteInputSchema,
  CustomerNoteListResponseSchema,
  DeleteCustomerNoteBodySchema,
  DeleteCustomerNoteResponseSchema,
  ListCustomerNotesQuerySchema,
  UpdateCustomerNoteInputSchema,
} from '@hivork/contracts/customers';
import { RequireModule } from '@hivork/module-core';
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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../common/decorators/apply-data-scope.decorator';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { RequireAuth } from '../common/decorators/require-auth.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { ModuleGuard } from '../common/guards/module.guard';
import type { StaffContext } from '../common/types/auth-context';
import { toCustomerNoteResponse } from './customer-notes.response.js';

const customerIdParamSchema = z.string().uuid();
const noteIdParamSchema = z.string().uuid();

function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

@Controller('v1/customers')
@RequireAuth('staff')
export class CustomerNotesController {
  constructor(
    private readonly listCustomerNotes: ListCustomerNotesUseCase,
    private readonly createCustomerNote: CreateCustomerNoteUseCase,
    private readonly updateCustomerNote: UpdateCustomerNoteUseCase,
    private readonly deleteCustomerNote: DeleteCustomerNoteUseCase,
    private readonly getStaffPermissions: GetStaffPermissionsUseCase,
  ) {}

  @Get(':customerId/notes')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async list(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @Query() query: unknown,
  ) {
    const idResult = customerIdParamSchema.safeParse(customerId);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = ListCustomerNotesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters.',
      });
    }

    try {
      const result = await this.listCustomerNotes.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
      });

      return CustomerNoteListResponseSchema.parse({
        data: result.items.map(toCustomerNoteResponse),
        meta: result.meta,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':customerId/notes')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.note.create')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(customerId);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = CreateCustomerNoteInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body.',
      });
    }

    try {
      const created = await this.createCustomerNote.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        body: parsed.data.body,
        isPinned: parsed.data.isPinned,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toCustomerNoteResponse(created) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':customerId/notes/:noteId')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const customerIdResult = customerIdParamSchema.safeParse(customerId);
    const noteIdResult = noteIdParamSchema.safeParse(noteId);
    if (!customerIdResult.success || !noteIdResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer and note ids must be valid UUIDs.',
      });
    }

    const parsed = UpdateCustomerNoteInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body.',
      });
    }

    const effective = await this.getStaffPermissions.execute({ staffId: staff.id });
    const canUpdateAny = this.getStaffPermissions.hasPermission(
      effective,
      'installments.customer.note.update',
    );

    try {
      const updated = await this.updateCustomerNote.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: customerIdResult.data,
        noteId: noteIdResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        body: parsed.data.body,
        isPinned: parsed.data.isPinned,
        canUpdateAny,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toCustomerNoteResponse(updated) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':customerId/notes/:noteId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.note.delete')
  @ApplyDataScope()
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const customerIdResult = customerIdParamSchema.safeParse(customerId);
    const noteIdResult = noteIdParamSchema.safeParse(noteId);
    if (!customerIdResult.success || !noteIdResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer and note ids must be valid UUIDs.',
      });
    }

    const parsed = DeleteCustomerNoteBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body.',
      });
    }

    const effective = await this.getStaffPermissions.execute({ staffId: staff.id });
    const canDeleteAny = this.getStaffPermissions.hasPermission(
      effective,
      'installments.customer.note.delete.any',
    );

    try {
      const result = await this.deleteCustomerNote.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: customerIdResult.data,
        noteId: noteIdResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        deleteReason: parsed.data.deleteReason,
        canDeleteAny,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return DeleteCustomerNoteResponseSchema.parse({
        data: {
          id: result.id,
          deletedAt: result.deletedAt.toISOString(),
        },
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
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
