import {
  ApplicationError,
  CloseSettlementBatchUseCase,
  CreateSettlementBatchUseCase,
  GetSettlementBatchUseCase,
  ListSettlementBatchesUseCase,
  RunReconciliationUseCase,
} from '@hivork/application';
import {
  CloseSettlementBatchBodySchema,
  CloseSettlementBatchResponseSchema,
  CreateSettlementBatchBodySchema,
  CreateSettlementBatchResponseSchema,
  GetSettlementBatchResponseSchema,
  ListSettlementBatchesQuerySchema,
  ListSettlementBatchesResponseSchema,
  ReconcileSettlementFormSchema,
  RunReconciliationResponseSchema,
} from '@hivork/contracts/payments';
import { BankStatementParseError, parseBankStatementCsv } from '@hivork/infrastructure';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { parseResourceId, toStaffContext } from '../sales/sales.controller.helpers.js';

@Controller('v1/payments/settlements')
@RequireAuth('staff')
export class SettlementController {
  constructor(
    private readonly createSettlementBatch: CreateSettlementBatchUseCase,
    private readonly listSettlementBatches: ListSettlementBatchesUseCase,
    private readonly getSettlementBatch: GetSettlementBatchUseCase,
    private readonly closeSettlementBatch: CloseSettlementBatchUseCase,
    private readonly runReconciliation: RunReconciliationUseCase,
  ) {}

  /** POST /api/v1/payments/settlements */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.settlement.manage')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = CreateSettlementBatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.createSettlementBatch.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId: parsed.data.branchId,
        periodFrom: parsed.data.periodFrom,
        periodTo: parsed.data.periodTo,
        paymentMethods: parsed.data.paymentMethods as Array<'card' | 'online'>,
        note: parsed.data.note,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return CreateSettlementBatchResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }

  /** GET /api/v1/payments/settlements */
  @Get()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.settlement.manage')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListSettlementBatchesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listSettlementBatches.execute({
        tenantId: staff.tenantId,
        staffContext: toStaffContext(staff),
        branchId: parsed.data.branchId,
        status: parsed.data.status,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return ListSettlementBatchesResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }

  /** GET /api/v1/payments/settlements/:id */
  @Get(':id')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.settlement.manage')
  @ApplyDataScope()
  async getById(@CurrentStaff() staff: StaffContext, @Param('id') idParam: string) {
    const settlementBatchId = parseResourceId(idParam, 'Settlement batch id');

    try {
      const result = await this.getSettlementBatch.execute({
        tenantId: staff.tenantId,
        settlementBatchId,
        staffContext: toStaffContext(staff),
      });

      return GetSettlementBatchResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }

  /** POST /api/v1/payments/settlements/:id/reconcile */
  @Post(':id/reconcile')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.reconciliation.manage')
  @ApplyDataScope()
  @UseInterceptors(
    FileInterceptor('bankStatementFile', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async reconcile(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @UploadedFile() bankStatementFile: Express.Multer.File | undefined,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const settlementBatchId = parseResourceId(idParam, 'Settlement batch id');

    if (!bankStatementFile?.buffer?.length) {
      throw new BadRequestException({
        code: 'FIELD_REQUIRED',
        message: 'bankStatementFile is required.',
      });
    }

    const parsedForm = ReconcileSettlementFormSchema.safeParse(body);
    if (!parsedForm.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsedForm.error.issues[0]?.message ?? 'Invalid form fields.',
      });
    }

    let bankRows;
    try {
      bankRows = parseBankStatementCsv(bankStatementFile.buffer, 'utf-8');
    } catch (error) {
      if (error instanceof BankStatementParseError) {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
        });
      }

      throw error;
    }

    try {
      const result = await this.runReconciliation.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        settlementBatchId,
        bankRows: bankRows.map((row) => ({
          reference: row.reference,
          amountRial: row.amountRial,
        })),
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return RunReconciliationResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }

  /** POST /api/v1/payments/settlements/:id/close */
  @Post(':id/close')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.settlement.manage')
  @ApplyDataScope()
  async close(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const settlementBatchId = parseResourceId(idParam, 'Settlement batch id');
    const parsed = CloseSettlementBatchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.closeSettlementBatch.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        settlementBatchId,
        expectedVersion: parsed.data.expectedVersion,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return CloseSettlementBatchResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }

      throw error;
    }
  }
}
