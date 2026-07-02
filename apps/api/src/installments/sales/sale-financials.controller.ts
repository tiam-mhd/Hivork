import {
  ApplicationError,
  BulkUpsertSaleLineItemsUseCase,
  CreateSaleLineItemUseCase,
  ListSaleLineItemsUseCase,
  RecalculateSaleFinancialsUseCase,
  SoftDeleteSaleLineItemUseCase,
  UpdateSaleFinancialsUseCase,
  UpdateSaleLineItemUseCase,
} from '@hivork/application';
import {
  BulkUpsertLineItemsSchema,
  CreateSaleLineItemSchema,
  DeleteSaleLineItemBodySchema,
  RecalculateSaleFinancialsSchema,
  UpdateSaleFinancialsSchema,
  UpdateSaleLineItemSchema,
} from '@hivork/contracts/installments';
import { parseBigIntRial } from '@hivork/contracts';
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
  Put,
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

/** Contract financials & line items API — IFP-071. */
@Controller('v1/sales')
@RequireAuth('staff')
export class SaleFinancialsController {
  constructor(
    private readonly listLineItems: ListSaleLineItemsUseCase,
    private readonly createLineItem: CreateSaleLineItemUseCase,
    private readonly bulkUpsertLineItems: BulkUpsertSaleLineItemsUseCase,
    private readonly updateLineItem: UpdateSaleLineItemUseCase,
    private readonly softDeleteLineItem: SoftDeleteSaleLineItemUseCase,
    private readonly updateFinancials: UpdateSaleFinancialsUseCase,
    private readonly recalculateFinancials: RecalculateSaleFinancialsUseCase,
  ) {}

  @Get(':id/line-items')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async listItems(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const saleId = parseSaleId(id);

    try {
      const data = await this.listLineItems.execute({
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

  @Post(':id/line-items')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async createItem(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = CreateSaleLineItemSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.createLineItem.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        title: parsed.data.title,
        sku: parsed.data.sku,
        quantity: parsed.data.quantity,
        unitPriceRial: parseBigIntRial(parsed.data.unitPriceRial),
        discountRial: parseBigIntRial(parsed.data.discountRial),
        taxRial: parseBigIntRial(parsed.data.taxRial),
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

  @Put(':id/line-items')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async bulkUpsert(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = BulkUpsertLineItemsSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.bulkUpsertLineItems.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        expectedVersion: parsed.data.expectedVersion,
        regenerateInstallments: parsed.data.regenerateInstallments,
        items: parsed.data.items.map((item) => ({
          title: item.title,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceRial: parseBigIntRial(item.unitPriceRial),
          discountRial: parseBigIntRial(item.discountRial),
          taxRial: parseBigIntRial(item.taxRial),
          sortOrder: item.sortOrder,
        })),
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id/line-items/:lineItemId')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async updateItem(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedLineItemId = parseResourceId(lineItemId, 'Line item id');
    const branchId = resolveBranchId(staff, request);
    const parsed = UpdateSaleLineItemSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.updateLineItem.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        lineItemId: parsedLineItemId,
        title: parsed.data.title,
        sku: parsed.data.sku,
        quantity: parsed.data.quantity,
        unitPriceRial: parsed.data.unitPriceRial
          ? parseBigIntRial(parsed.data.unitPriceRial)
          : undefined,
        discountRial: parsed.data.discountRial
          ? parseBigIntRial(parsed.data.discountRial)
          : undefined,
        taxRial: parsed.data.taxRial ? parseBigIntRial(parsed.data.taxRial) : undefined,
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

  @Delete(':id/line-items/:lineItemId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async deleteItem(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedLineItemId = parseResourceId(lineItemId, 'Line item id');
    const branchId = resolveBranchId(staff, request);
    const parsed = DeleteSaleLineItemBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.softDeleteLineItem.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        lineItemId: parsedLineItemId,
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

  @Patch(':id/financials')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async patchFinancials(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = UpdateSaleFinancialsSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.updateFinancials.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        expectedVersion: parsed.data.expectedVersion,
        taxRial:
          parsed.data.taxRial !== undefined
            ? parsed.data.taxRial
              ? parseBigIntRial(parsed.data.taxRial)
              : null
            : undefined,
        taxRateBps: parsed.data.taxRateBps,
        taxInclusive: parsed.data.taxInclusive,
        insuranceRial:
          parsed.data.insuranceRial !== undefined
            ? parsed.data.insuranceRial
              ? parseBigIntRial(parsed.data.insuranceRial)
              : null
            : undefined,
        insuranceProvider: parsed.data.insuranceProvider,
        insurancePolicyNumber: parsed.data.insurancePolicyNumber,
        insuranceExpiresAt: parsed.data.insuranceExpiresAt,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/financials/recalculate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit_financials')
  @ApplyDataScope()
  async recalculate(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = RecalculateSaleFinancialsSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.recalculateFinancials.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        expectedVersion: parsed.data.expectedVersion,
        regenerateInstallments: parsed.data.regenerateInstallments,
        changeReason: parsed.data.changeReason,
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
