import {
  ApplicationError,
  CreateContractGuarantorUseCase,
  ListContractGuarantorsUseCase,
  RestoreContractGuarantorUseCase,
  SoftDeleteContractGuarantorUseCase,
  UpdateContractGuarantorUseCase,
} from '@hivork/application';
import {
  CreateGuarantorSchema,
  DeleteGuarantorBodySchema,
  UpdateGuarantorSchema,
} from '@hivork/contracts/installments';
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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import {
  parseResourceId,
  parseSaleId,
  resolveBranchId,
  toStaffContext,
} from './sales.controller.helpers.js';

/** Contract guarantor API — IFP-067. */
@Controller('v1/sales')
@RequireAuth('staff')
export class SaleGuarantorsController {
  constructor(
    private readonly listGuarantors: ListContractGuarantorsUseCase,
    private readonly createGuarantor: CreateContractGuarantorUseCase,
    private readonly updateGuarantor: UpdateContractGuarantorUseCase,
    private readonly softDeleteGuarantor: SoftDeleteContractGuarantorUseCase,
    private readonly restoreGuarantor: RestoreContractGuarantorUseCase,
  ) {}

  @Get(':id/guarantors')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.guarantor.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const saleId = parseSaleId(id);

    try {
      const data = await this.listGuarantors.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId: staff.activeBranchId ?? staff.primaryBranchId ?? '',
        saleId,
        staffContext: toStaffContext(staff),
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/guarantors')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.guarantor.create')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = CreateGuarantorSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.createGuarantor.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        tenantCustomerId: parsed.data.tenantCustomerId,
        fullName: parsed.data.fullName,
        nationalId: parsed.data.nationalId,
        phone: parsed.data.phone,
        relationship: parsed.data.relationship,
        note: parsed.data.note,
        sortOrder: parsed.data.sortOrder,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id/guarantors/:guarantorId')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.guarantor.update')
  @ApplyDataScope()
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('guarantorId') guarantorId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedGuarantorId = parseResourceId(guarantorId, 'Guarantor id');
    const branchId = resolveBranchId(staff, request);
    const parsed = UpdateGuarantorSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.updateGuarantor.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        guarantorId: parsedGuarantorId,
        tenantCustomerId: parsed.data.tenantCustomerId,
        fullName: parsed.data.fullName,
        nationalId: parsed.data.nationalId,
        phone: parsed.data.phone,
        relationship: parsed.data.relationship,
        note: parsed.data.note,
        sortOrder: parsed.data.sortOrder,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id/guarantors/:guarantorId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.guarantor.delete')
  @ApplyDataScope()
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('guarantorId') guarantorId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedGuarantorId = parseResourceId(guarantorId, 'Guarantor id');
    const branchId = resolveBranchId(staff, request);
    const parsed = DeleteGuarantorBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.softDeleteGuarantor.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        guarantorId: parsedGuarantorId,
        deleteReason: parsed.data.deleteReason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/guarantors/:guarantorId/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.guarantor.update')
  @ApplyDataScope()
  async restore(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('guarantorId') guarantorId: string,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedGuarantorId = parseResourceId(guarantorId, 'Guarantor id');
    const branchId = resolveBranchId(staff, request);

    try {
      const data = await this.restoreGuarantor.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        guarantorId: parsedGuarantorId,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
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

function validationError(message = 'Invalid request'): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message,
  });
}
