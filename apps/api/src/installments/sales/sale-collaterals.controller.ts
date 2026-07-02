import {
  ApplicationError,
  CreateContractCollateralUseCase,
  ForfeitContractCollateralUseCase,
  ListContractCollateralsUseCase,
  ReleaseContractCollateralUseCase,
  SoftDeleteContractCollateralUseCase,
  UpdateContractCollateralUseCase,
} from '@hivork/application';
import {
  CreateCollateralSchema,
  DeleteCollateralBodySchema,
  ForfeitCollateralSchema,
  ReleaseCollateralSchema,
  UpdateCollateralSchema,
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

/** Contract collateral API — IFP-067. */
@Controller('v1/sales')
@RequireAuth('staff')
export class SaleCollateralsController {
  constructor(
    private readonly listCollaterals: ListContractCollateralsUseCase,
    private readonly createCollateral: CreateContractCollateralUseCase,
    private readonly updateCollateral: UpdateContractCollateralUseCase,
    private readonly softDeleteCollateral: SoftDeleteContractCollateralUseCase,
    private readonly releaseCollateral: ReleaseContractCollateralUseCase,
    private readonly forfeitCollateral: ForfeitContractCollateralUseCase,
  ) {}

  @Get(':id/collaterals')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.collateral.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const saleId = parseSaleId(id);

    try {
      const data = await this.listCollaterals.execute({
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

  @Post(':id/collaterals')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.collateral.create')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = CreateCollateralSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.createCollateral.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        collateralType: parsed.data.collateralType,
        title: parsed.data.title,
        description: parsed.data.description,
        estimatedValueRial: parsed.data.estimatedValueRial,
        documentFileId: parsed.data.documentFileId,
        registrationNumber: parsed.data.registrationNumber,
        issuedAt: parsed.data.issuedAt,
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

  @Patch(':id/collaterals/:collateralId')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.collateral.update')
  @ApplyDataScope()
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('collateralId') collateralId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedCollateralId = parseResourceId(collateralId, 'Collateral id');
    const branchId = resolveBranchId(staff, request);
    const parsed = UpdateCollateralSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.updateCollateral.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        collateralId: parsedCollateralId,
        collateralType: parsed.data.collateralType,
        title: parsed.data.title,
        description: parsed.data.description,
        estimatedValueRial: parsed.data.estimatedValueRial,
        documentFileId: parsed.data.documentFileId,
        registrationNumber: parsed.data.registrationNumber,
        issuedAt: parsed.data.issuedAt,
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

  @Delete(':id/collaterals/:collateralId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.collateral.delete')
  @ApplyDataScope()
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('collateralId') collateralId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedCollateralId = parseResourceId(collateralId, 'Collateral id');
    const branchId = resolveBranchId(staff, request);
    const parsed = DeleteCollateralBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.softDeleteCollateral.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        collateralId: parsedCollateralId,
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

  @Post(':id/collaterals/:collateralId/release')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.collateral.release')
  @ApplyDataScope()
  async release(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('collateralId') collateralId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedCollateralId = parseResourceId(collateralId, 'Collateral id');
    const branchId = resolveBranchId(staff, request);
    const parsed = ReleaseCollateralSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.releaseCollateral.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        collateralId: parsedCollateralId,
        reason: parsed.data.reason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/collaterals/:collateralId/forfeit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.collateral.forfeit')
  @ApplyDataScope()
  async forfeit(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('collateralId') collateralId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedCollateralId = parseResourceId(collateralId, 'Collateral id');
    const branchId = resolveBranchId(staff, request);
    const parsed = ForfeitCollateralSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.forfeitCollateral.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        collateralId: parsedCollateralId,
        reason: parsed.data.reason,
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
