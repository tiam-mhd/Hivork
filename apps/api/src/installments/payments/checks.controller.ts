import {
  ApplicationError,
  AddCheckTrackingNoteUseCase,
  CollectCheckUseCase,
  GetCheckImageUseCase,
  GetCheckTrackingUseCase,
  ListChecksUseCase,
  MarkCheckBouncedUseCase,
  RegisterPayableCheckUseCase,
  RegisterReceivedCheckUseCase,
  TransferCheckUseCase,
  UploadCheckImageUseCase,
} from '@hivork/application';
import {
  AddCheckTrackingNoteBodySchema,
  AddCheckTrackingNoteResponseSchema,
  CHECK_IMAGE_ABSOLUTE_MAX_BYTES,
  CollectCheckBodySchema,
  CollectCheckResponseSchema,
  GetCheckImageResponseSchema,
  GetCheckTrackingResponseSchema,
  ListChecksQuerySchema,
  ListChecksResponseSchema,
  MarkCheckBouncedBodySchema,
  MarkCheckBouncedResponseSchema,
  RegisterPayableCheckBodySchema,
  RegisterPayableCheckResponseSchema,
  RegisterReceivedCheckBodySchema,
  RegisterReceivedCheckResponseSchema,
  TransferCheckBodySchema,
  TransferCheckResponseSchema,
  UploadCheckImageResponseSchema,
} from '@hivork/contracts/payments';
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import type { Request } from 'express';

import { ApplyDataScope } from '../../common/decorators/apply-data-scope.decorator.js';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator.js';
import { RequireAuth } from '../../common/decorators/require-auth.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { ModuleGuard } from '../../common/guards/module.guard.js';
import type { StaffContext } from '../../common/types/auth-context.js';
import { parseBigIntRial } from '@hivork/contracts';
import { parseResourceId, resolveBranchId, toStaffContext } from '../sales/sales.controller.helpers.js';

const idempotencyKeySchema = z.string().uuid();

@Controller('v1/checks')
@RequireAuth('staff')
export class ChecksController {
  constructor(
    private readonly registerReceivedCheck: RegisterReceivedCheckUseCase,
    private readonly registerPayableCheck: RegisterPayableCheckUseCase,
    private readonly markCheckBounced: MarkCheckBouncedUseCase,
    private readonly collectCheck: CollectCheckUseCase,
    private readonly transferCheck: TransferCheckUseCase,
    private readonly listChecks: ListChecksUseCase,
    private readonly getCheckTracking: GetCheckTrackingUseCase,
    private readonly addCheckTrackingNote: AddCheckTrackingNoteUseCase,
    private readonly uploadCheckImage: UploadCheckImageUseCase,
    private readonly getCheckImage: GetCheckImageUseCase,
  ) {}

  /** POST /api/v1/checks/received */
  @Post('received')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.create')
  @ApplyDataScope()
  async registerReceived(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = RegisterReceivedCheckBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.registerReceivedCheck.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        checkNumber: parsed.data.checkNumber,
        bankName: parsed.data.bankName,
        amountRial: parseBigIntRial(parsed.data.amountRial),
        dueDate: parsed.data.dueDate,
        drawerName: parsed.data.drawerName,
        bankBranchCode: parsed.data.bankBranchCode,
        sayadId: parsed.data.sayadId,
        installmentId: parsed.data.installmentId,
        paymentAttemptId: parsed.data.paymentAttemptId,
        note: parsed.data.note,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return RegisterReceivedCheckResponseSchema.parse(result);
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

  /** POST /api/v1/checks/payable */
  @Post('payable')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.create')
  @ApplyDataScope()
  async registerPayable(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = RegisterPayableCheckBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.registerPayableCheck.execute({
        tenantId: staff.tenantId,
        branchId,
        staffId: staff.id,
        checkNumber: parsed.data.checkNumber,
        bankName: parsed.data.bankName,
        amountRial: parseBigIntRial(parsed.data.amountRial),
        dueDate: parsed.data.dueDate,
        payeeName: parsed.data.payeeName,
        bankBranchCode: parsed.data.bankBranchCode,
        sayadId: parsed.data.sayadId,
        note: parsed.data.note,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return RegisterPayableCheckResponseSchema.parse(result);
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

  /** GET /api/v1/checks/:id/tracking */
  @Get(':id/tracking')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.read')
  @ApplyDataScope()
  async tracking(@CurrentStaff() staff: StaffContext, @Param('id') idParam: string) {
    const checkId = parseResourceId(idParam, 'Check id');

    try {
      const result = await this.getCheckTracking.execute({
        tenantId: staff.tenantId,
        checkId,
        staffContext: toStaffContext(staff),
      });

      return GetCheckTrackingResponseSchema.parse(result);
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

  /** POST /api/v1/checks/:id/tracking-notes */
  @Post(':id/tracking-notes')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.update')
  @ApplyDataScope()
  async addTrackingNote(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const checkId = parseResourceId(idParam, 'Check id');
    const parsed = AddCheckTrackingNoteBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.addCheckTrackingNote.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        checkId,
        body: parsed.data.body,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return AddCheckTrackingNoteResponseSchema.parse(result);
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

  /** POST /api/v1/checks/:id/image */
  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.update')
  @ApplyDataScope()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CHECK_IMAGE_ABSOLUTE_MAX_BYTES },
    }),
  )
  async uploadImage(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    const checkId = parseResourceId(idParam, 'Check id');

    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: 'FIELD_REQUIRED',
        message: 'Upload file is required.',
      });
    }

    try {
      const result = await this.uploadCheckImage.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        checkId,
        fileBuffer: file.buffer,
        originalFileName: file.originalname || 'scan',
        mimeType: file.mimetype,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return UploadCheckImageResponseSchema.parse(result);
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

  /** GET /api/v1/checks/:id/image */
  @Get(':id/image')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.read')
  @ApplyDataScope()
  async getImage(@CurrentStaff() staff: StaffContext, @Param('id') idParam: string) {
    const checkId = parseResourceId(idParam, 'Check id');

    try {
      const result = await this.getCheckImage.execute({
        tenantId: staff.tenantId,
        checkId,
        staffContext: toStaffContext(staff),
      });

      return GetCheckImageResponseSchema.parse(result);
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

  /** POST /api/v1/checks/:id/collect */
  @Post(':id/collect')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.collect')
  @ApplyDataScope()
  async collect(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const checkId = parseResourceId(idParam, 'Check id');
    const parsed = CollectCheckBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    if (idempotencyKeyHeader === undefined) {
      throw new BadRequestException({
        code: 'FIELD_REQUIRED',
        message: 'Idempotency-Key header is required.',
      });
    }

    const idempotencyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key must be a valid UUID.',
      });
    }

    try {
      const result = await this.collectCheck.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        checkId,
        collectedAt: parsed.data.collectedAt ? new Date(parsed.data.collectedAt) : undefined,
        bankDepositRef: parsed.data.bankDepositRef,
        confirmInstallment: parsed.data.confirmInstallment,
        idempotencyKey: idempotencyResult.data,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return CollectCheckResponseSchema.parse(result);
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

  /** POST /api/v1/checks/:id/transfer */
  @Post(':id/transfer')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.transfer')
  @ApplyDataScope()
  async transfer(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const checkId = parseResourceId(idParam, 'Check id');
    const parsed = TransferCheckBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.transferCheck.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        checkId,
        transferredTo: parsed.data.transferredTo,
        transferReason: parsed.data.transferReason,
        transferredAt: parsed.data.transferredAt
          ? new Date(parsed.data.transferredAt)
          : undefined,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return TransferCheckResponseSchema.parse(result);
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

  /** POST /api/v1/checks/:id/bounce */
  @Post(':id/bounce')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.bounce')
  @ApplyDataScope()
  async bounce(
    @CurrentStaff() staff: StaffContext,
    @Param('id') idParam: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const checkId = parseResourceId(idParam, 'Check id');
    const parsed = MarkCheckBouncedBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.markCheckBounced.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        checkId,
        bounceReason: parsed.data.bounceReason,
        bouncedAt: parsed.data.bouncedAt ? new Date(parsed.data.bouncedAt) : undefined,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return MarkCheckBouncedResponseSchema.parse(result);
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

  /** GET /api/v1/checks */
  @Get()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.check.read')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListChecksQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listChecks.execute({
        tenantId: staff.tenantId,
        staffContext: toStaffContext(staff),
        checkType: parsed.data.checkType,
        status: parsed.data.status,
        dueFrom: parsed.data.dueFrom,
        dueTo: parsed.data.dueTo,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        activeBranchId: staff.activeBranchId ?? undefined,
      });

      return ListChecksResponseSchema.parse(result);
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
