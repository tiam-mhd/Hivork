import {
  ApplicationError,
  CancelSaleUseCase,
  CreateSaleUseCase,
  GetSaleUseCase,
  ListSalesUseCase,
} from '@hivork/application';
import {
  CancelSaleSchema,
  CreateSaleSchema,
  ListSalesQuerySchema,
} from '@hivork/contracts/installments';
import { parseBigIntRial } from '@hivork/contracts';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import {
  parseDateOnlyUtc,
  parseDateOnlyUtcEnd,
  toCancelSaleResponse,
  toSaleDetailResponse,
  toSaleSummaryResponse,
} from './sales.response.js';

const saleIdParamSchema = z.string().uuid();
const idempotencyKeySchema = z.string().uuid();

function toStaffContext(staff: StaffContext) {
  return {
    staffId: staff.id,
    dataScope: staff.dataScope,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: staff.activeBranchId,
  };
}

/**
 * Installments sales API — create, list, detail, cancel.
 * @see docs/02-architecture/api-contracts.md § sales
 */
@Controller('v1/sales')
@RequireAuth('staff')
export class SalesController {
  constructor(
    private readonly createSale: CreateSaleUseCase,
    private readonly listSales: ListSalesUseCase,
    private readonly getSale: GetSaleUseCase,
    private readonly cancelSale: CancelSaleUseCase,
  ) {}

  /** POST /api/v1/sales — create installment sale (requires Idempotency-Key header). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.create')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
  ) {
    const idempotencyKeyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyKeyResult.success) {
      throw new BadRequestException({
        code: idempotencyKeyHeader ? 'VALIDATION_ERROR' : 'FIELD_REQUIRED',
        message: idempotencyKeyHeader
          ? 'Idempotency-Key must be a valid UUID.'
          : 'Idempotency-Key header is required.',
      });
    }

    const parsed = CreateSaleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const detail = await this.createSale.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        idempotencyKey: idempotencyKeyResult.data,
        tenantCustomerId: parsed.data.tenantCustomerId,
        branchId: parsed.data.branchId,
        title: parsed.data.title,
        description: parsed.data.description,
        invoiceNumber: parsed.data.invoiceNumber,
        totalAmountRial: parseBigIntRial(parsed.data.totalAmountRial),
        downPaymentRial: parseBigIntRial(parsed.data.downPaymentRial),
        discountRial: parsed.data.discountRial
          ? parseBigIntRial(parsed.data.discountRial)
          : undefined,
        taxRial: parsed.data.taxRial ? parseBigIntRial(parsed.data.taxRial) : undefined,
        installmentCount: parsed.data.installmentCount,
        firstDueDate: parseDateOnlyUtc(parsed.data.firstDueDate),
        contractDate: parseDateOnlyUtc(parsed.data.contractDate),
        intervalDays: parsed.data.intervalDays,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toSaleDetailResponse(detail);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** GET /api/v1/sales — cursor-paginated sale list. */
  @Get()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListSalesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const statuses = parsed.data.status;
      const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;
      const multiStatuses = statuses && statuses.length > 1 ? statuses : undefined;

      const result = await this.listSales.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        sort: parsed.data.sort,
        status: singleStatus,
        statuses: multiStatuses,
        branchId: parsed.data.branchId,
        search: parsed.data.search,
        from: parsed.data.from ? parseDateOnlyUtc(parsed.data.from) : undefined,
        to: parsed.data.to ? parseDateOnlyUtcEnd(parsed.data.to) : undefined,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return {
        data: result.data.map(toSaleSummaryResponse),
        meta: {
          nextCursor: result.meta.nextCursor,
          hasMore: result.meta.hasMore,
        },
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** GET /api/v1/sales/:id — sale detail with installments. */
  @Get(':id')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.view')
  @ApplyDataScope()
  async getById(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const parsedId = saleIdParamSchema.safeParse(id);
    if (!parsedId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Sale id must be a valid UUID.',
      });
    }

    try {
      const detail = await this.getSale.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        saleId: parsedId.data,
        staffContext: toStaffContext(staff),
      });

      return toSaleDetailResponse(detail);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** POST /api/v1/sales/:id/cancel — cancel active sale. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.cancel')
  @ApplyDataScope()
  async cancel(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsedId = saleIdParamSchema.safeParse(id);
    if (!parsedId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Sale id must be a valid UUID.',
      });
    }

    const parsedBody = CancelSaleSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.cancelSale.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        saleId: parsedId.data,
        reason: parsedBody.data.reason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toCancelSaleResponse(result);
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
