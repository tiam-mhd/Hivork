import {
  ApplicationError,
  ArchiveContractUseCase,
  ChangeSaleStatusUseCase,
  CloseContractUseCase,
  CopyContractUseCase,
  CreateContractAttachmentUseCase,
  ExtendContractUseCase,
  GetContractVersionUseCase,
  ListContractAttachmentsUseCase,
  ListContractVersionsUseCase,
  RestoreSaleUseCase,
  SoftDeleteContractAttachmentUseCase,
  SoftDeleteSaleUseCase,
  TerminateContractUseCase,
  UnarchiveContractUseCase,
} from '@hivork/application';
import {
  ArchiveContractSchema,
  ChangeSaleStatusSchema,
  CloseContractSchema,
  CopyContractSchema,
  CreateContractAttachmentSchema,
  DeleteContractAttachmentBodySchema,
  ExtendContractSchema,
  ListContractVersionsQuerySchema,
  SoftDeleteSaleSchema,
  TerminateContractSchema,
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
  Post,
  Query,
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
  parseSaleId,
  readExpectedVersion,
  resolveBranchId,
  toStaffContext,
  versionNumberParamSchema,
} from './sales.controller.helpers.js';
import { toSaleEnterpriseDetailResponse } from './sales.response.js';

/** Enterprise contract lifecycle API — IFP-064. */
@Controller('v1/sales')
@RequireAuth('staff')
export class SalesEnterpriseController {
  constructor(
    private readonly extendContract: ExtendContractUseCase,
    private readonly copyContract: CopyContractUseCase,
    private readonly terminateContract: TerminateContractUseCase,
    private readonly closeContract: CloseContractUseCase,
    private readonly archiveContract: ArchiveContractUseCase,
    private readonly unarchiveContract: UnarchiveContractUseCase,
    private readonly changeSaleStatus: ChangeSaleStatusUseCase,
    private readonly listContractVersions: ListContractVersionsUseCase,
    private readonly getContractVersion: GetContractVersionUseCase,
    private readonly listContractAttachments: ListContractAttachmentsUseCase,
    private readonly createContractAttachment: CreateContractAttachmentUseCase,
    private readonly softDeleteContractAttachment: SoftDeleteContractAttachmentUseCase,
    private readonly softDeleteSale: SoftDeleteSaleUseCase,
    private readonly restoreSale: RestoreSaleUseCase,
  ) {}

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.extend')
  @ApplyDataScope()
  async extend(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = ExtendContractSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const result = await this.extendContract.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        newLastDueDate: parsed.data.newLastDueDate,
        additionalInstallmentCount: parsed.data.additionalInstallmentCount,
        reason: parsed.data.reason,
        regenerateSchedule: parsed.data.regenerateSchedule,
        expectedVersion: readExpectedVersion(request),
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/copy')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.copy')
  @ApplyDataScope()
  async copy(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const sourceSaleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = CopyContractSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const result = await this.copyContract.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        sourceSaleId,
        tenantCustomerId: parsed.data.tenantCustomerId,
        branchIdTarget: parsed.data.branchId,
        contractDate: parsed.data.contractDate,
        firstDueDate: parsed.data.firstDueDate,
        copyAttachments: parsed.data.copyAttachments,
        copyGuarantors: parsed.data.copyGuarantors,
        reason: parsed.data.reason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        data: {
          newSaleId: result.newSaleId,
          contractNumber: result.contractNumber,
          sale: toSaleEnterpriseDetailResponse(result.sale),
        },
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.terminate')
  @ApplyDataScope()
  async terminate(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = TerminateContractSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const result = await this.terminateContract.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        reason: parsed.data.reason,
        effectiveDate: parsed.data.effectiveDate,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.close')
  @ApplyDataScope()
  async close(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = CloseContractSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const result = await this.closeContract.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        reason: parsed.data.reason,
        waiveRemaining: parsed.data.waiveRemaining,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.archive')
  @ApplyDataScope()
  async archive(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = ArchiveContractSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const result = await this.archiveContract.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        reason: parsed.data.reason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.archive')
  @ApplyDataScope()
  async unarchive(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);

    try {
      const result = await this.unarchiveContract.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.change_status')
  @ApplyDataScope()
  async changeStatus(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = ChangeSaleStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const result = await this.changeSaleStatus.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        targetStatus: parsed.data.targetStatus,
        reason: parsed.data.reason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id/versions')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.view')
  @ApplyDataScope()
  async listVersions(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    const saleId = parseSaleId(id);
    const parsed = ListContractVersionsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.listContractVersions.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        saleId,
        limit: parsed.data.limit,
        staffContext: toStaffContext(staff),
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id/versions/:versionNumber')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.view')
  @ApplyDataScope()
  async getVersion(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    const saleId = parseSaleId(id);
    const parsedVersion = versionNumberParamSchema.safeParse(versionNumber);
    if (!parsedVersion.success) {
      throw validationError('Version number must be a positive integer.');
    }

    try {
      const data = await this.getContractVersion.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        saleId,
        versionNumber: parsedVersion.data,
        staffContext: toStaffContext(staff),
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id/attachments')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.view')
  @ApplyDataScope()
  async listAttachments(@CurrentStaff() staff: StaffContext, @Param('id') id: string) {
    const saleId = parseSaleId(id);

    try {
      const data = await this.listContractAttachments.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        saleId,
        staffContext: toStaffContext(staff),
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit')
  @ApplyDataScope()
  async createAttachment(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = CreateContractAttachmentSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.createContractAttachment.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        fileId: parsed.data.fileId,
        attachmentType: parsed.data.attachmentType,
        label: parsed.data.label,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder,
        staffContext: toStaffContext(staff),
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit')
  @ApplyDataScope()
  async deleteAttachment(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const parsedAttachmentId = parseSaleId(attachmentId);
    const branchId = resolveBranchId(staff, request);
    const parsed = DeleteContractAttachmentBodySchema.safeParse(body ?? {});

    try {
      const data = await this.softDeleteContractAttachment.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
        attachmentId: parsedAttachmentId,
        reason: parsed.success ? parsed.data.deleteReason : undefined,
        staffContext: toStaffContext(staff),
      });

      return { data };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.sale.edit')
  @ApplyDataScope()
  async softDelete(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const saleId = parseSaleId(id);
    const branchId = resolveBranchId(staff, request);
    const parsed = SoftDeleteSaleSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0]?.message);
    }

    try {
      const data = await this.softDeleteSale.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        branchId,
        saleId,
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

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('core.data.restore')
  @ApplyDataScope()
  async restore(@CurrentStaff() staff: StaffContext, @Param('id') id: string, @Req() request: Request) {
    const saleId = parseSaleId(id);

    try {
      const result = await this.restoreSale.execute({
        tenantId: staff.tenantId,
        staffId: staff.id,
        saleId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toSaleEnterpriseDetailResponse(result) };
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
