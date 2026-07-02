import {
  ApplicationError,
  BulkTagCustomersUseCase,
  BulkUntagCustomersUseCase,
  buildCustomerImportTemplateBuffer,
  CreateTenantCustomerUseCase,
  CUSTOMER_IMPORT_MAX_FILE_BYTES,
  ExportTenantCustomersUseCase,
  type ExportTenantCustomersInput,
  type ExportTenantCustomersOutput,
  GetStaffPermissionsUseCase,
  GetTenantCustomerUseCase,
  GetCustomerTimelineUseCase,
  ListCustomerPaymentsUseCase,
  MergeTenantCustomersUseCase,
  TransferCustomerOwnershipUseCase,
  AdjustCustomerScoreUseCase,
  BlacklistTenantCustomerUseCase,
  UnblacklistTenantCustomerUseCase,
  ListCustomerContractsUseCase,
  ImportCustomersExcelUseCase,
  ListDeletedTenantCustomersUseCase,
  ListTenantCustomersUseCase,
  SoftDeleteTenantCustomerUseCase,
  RestoreTenantCustomerUseCase,
  ArchiveTenantCustomerUseCase,
  UnarchiveTenantCustomerUseCase,
  UpdateTenantCustomerUseCase,
} from '@hivork/application';
import {
  BulkTagCustomersSchema,
  BulkTagCustomersResponseSchema,
  BulkUntagCustomersSchema,
  CreateTenantCustomerSchema,
  CustomerListQuerySchema,
  ExportCustomersQuerySchema,
  ExportCustomersRequestSchema,
  GetTenantCustomerQuerySchema,
  ImportCustomersQuerySchema,
  ListCustomerTimelineQuerySchema,
  ListCustomerPaymentsQuerySchema,
  CustomerPaymentListResponseSchema,
  ListCustomerContractsQuerySchema,
  CustomerContractListResponseSchema,
  MergeCustomersSchema,
  MergeCustomersResponseSchema,
  TransferCustomerOwnershipSchema,
  AdjustCustomerScoreSchema,
  BlacklistCustomerSchema,
  UnblacklistCustomerSchema,
  ListDeletedCustomersQuerySchema,
  DeleteCustomerSchema,
  ArchiveCustomerSchema,
  UpdateTenantCustomerSchema,
  type ExportCustomersQueryDto,
  type ExportCustomersRequestDto,
} from '@hivork/contracts/customers';
import { RequireModule } from '@hivork/module-core';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../common/decorators/apply-data-scope.decorator';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { RequireAuth } from '../common/decorators/require-auth.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { ModuleGuard } from '../common/guards/module.guard';
import type { StaffContext } from '../common/types/auth-context';
import {
  toImportCustomersResponse,
  toTenantCustomerDetailResponse,
  toTenantCustomerListItemResponse,
  toTenantCustomerResponse,
} from './customers.response';
import { toCustomerPaymentResponse } from './customer-payments.response.js';
import { toCustomerContractResponse } from './customer-contracts.response.js';
import { AppConfigService } from '../config/app-config.service';

const customerIdParamSchema = z.string().uuid();
const idempotencyKeySchema = z.string().uuid();

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
export class CustomersController {
  constructor(
    private readonly createTenantCustomer: CreateTenantCustomerUseCase,
    private readonly listTenantCustomers: ListTenantCustomersUseCase,
    private readonly exportTenantCustomers: ExportTenantCustomersUseCase,
    private readonly getTenantCustomer: GetTenantCustomerUseCase,
    private readonly getCustomerTimeline: GetCustomerTimelineUseCase,
    private readonly listCustomerPayments: ListCustomerPaymentsUseCase,
    private readonly listCustomerContracts: ListCustomerContractsUseCase,
    private readonly updateTenantCustomer: UpdateTenantCustomerUseCase,
    private readonly softDeleteTenantCustomer: SoftDeleteTenantCustomerUseCase,
    private readonly restoreTenantCustomer: RestoreTenantCustomerUseCase,
    private readonly archiveTenantCustomer: ArchiveTenantCustomerUseCase,
    private readonly unarchiveTenantCustomer: UnarchiveTenantCustomerUseCase,
    private readonly importCustomersExcel: ImportCustomersExcelUseCase,
    private readonly listDeletedCustomers: ListDeletedTenantCustomersUseCase,
    private readonly bulkTagCustomers: BulkTagCustomersUseCase,
    private readonly bulkUntagCustomers: BulkUntagCustomersUseCase,
    private readonly getStaffPermissions: GetStaffPermissionsUseCase,
    private readonly mergeTenantCustomers: MergeTenantCustomersUseCase,
    private readonly transferCustomerOwnership: TransferCustomerOwnershipUseCase,
    private readonly adjustCustomerScore: AdjustCustomerScoreUseCase,
    private readonly blacklistTenantCustomer: BlacklistTenantCustomerUseCase,
    private readonly unblacklistTenantCustomer: UnblacklistTenantCustomerUseCase,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.create')
  @ApplyDataScope()
  async create(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = CreateTenantCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const effective = await this.getStaffPermissions.execute({ staffId: staff.id });
      const canBlacklist = this.getStaffPermissions.hasPermission(
        effective,
        'installments.customer.blacklist',
      );

      const result = await this.createTenantCustomer.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        phone: parsed.data.phone,
        name: parsed.data.name,
        email: parsed.data.email,
        nationalId: parsed.data.nationalId,
        birthDate: parsed.data.birthDate,
        gender: parsed.data.gender,
        address: parsed.data.address,
        localCode: parsed.data.localCode,
        tags: parsed.data.tags,
        notes: parsed.data.notes,
        internalNotes: parsed.data.internalNotes,
        defaultBranchId: parsed.data.defaultBranchId,
        preferredContactChannel: parsed.data.preferredContactChannel,
        marketingOptIn: parsed.data.marketingOptIn,
        categoryId: parsed.data.categoryId,
        assignedStaffId: parsed.data.assignedStaffId,
        status: parsed.data.status,
        addresses: parsed.data.addresses,
        emergencyContacts: parsed.data.emergencyContacts,
        contactPhones: parsed.data.contactPhones,
        isBlacklisted: parsed.data.isBlacklisted,
        blacklistReason: parsed.data.blacklistReason,
        canBlacklist,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toTenantCustomerResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get()
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async list(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = CustomerListQuerySchema.safeParse(query);
    if (!parsed.success) {
      const filterInvalid = parsed.error.issues.some((issue) => issue.message === 'FILTER_INVALID');
      throw new BadRequestException({
        code: filterInvalid ? 'FILTER_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    const effective = await this.getStaffPermissions.execute({ staffId: staff.id });

    if (
      parsed.data.includeArchived &&
      !this.getStaffPermissions.hasPermission(effective, 'installments.customer.archive')
    ) {
      throw new HttpException(
        { code: 'PERMISSION_DENIED', message: 'Including archived customers is not permitted.' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      parsed.data.linkStatus === 'deleted' &&
      !this.getStaffPermissions.hasPermission(effective, 'installments.customer.restore')
    ) {
      throw new HttpException(
        { code: 'PERMISSION_DENIED', message: 'Listing deleted customers is not permitted.' },
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      const result = await this.listTenantCustomers.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        sort: parsed.data.sort,
        search: parsed.data.search,
        filter: parsed.data.filter,
        tags: parsed.data.tags,
        status: parsed.data.status,
        branchId: parsed.data.branchId,
        categoryId: parsed.data.categoryId,
        isBlacklisted: parsed.data.isBlacklisted,
        assignedStaffId: parsed.data.assignedStaffId,
        linkStatus: parsed.data.linkStatus,
        createdAtFrom: parsed.data.createdAtFrom ? new Date(parsed.data.createdAtFrom) : undefined,
        createdAtTo: parsed.data.createdAtTo ? new Date(parsed.data.createdAtTo) : undefined,
        lastPurchaseAtFrom: parsed.data.lastPurchaseAtFrom
          ? new Date(parsed.data.lastPurchaseAtFrom)
          : undefined,
        lastPurchaseAtTo: parsed.data.lastPurchaseAtTo
          ? new Date(parsed.data.lastPurchaseAtTo)
          : undefined,
        includeArchived: parsed.data.includeArchived,
        includeCount: parsed.data.includeCount,
        staffContext: toStaffContext(staff),
      });

      return {
        data: result.data.map(toTenantCustomerListItemResponse),
        meta: result.meta,
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('export')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.export')
  @ApplyDataScope()
  async exportCustomersGet(
    @CurrentStaff() staff: StaffContext,
    @Query() query: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const parsed = ExportCustomersQuerySchema.safeParse(query);
    if (!parsed.success) {
      const filterInvalid = parsed.error.issues.some(
        (issue: z.ZodIssue) =>
          issue.message === 'FILTER_INVALID' || issue.path.includes('filter'),
      );
      throw new BadRequestException({
        code: filterInvalid ? 'FILTER_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    await this.assertExportListPermissions(staff, parsed.data);

    try {
      const result = await this.exportTenantCustomers.execute(
        this.buildExportInput(staff, req, parsed.data),
      );
      this.sendExportResponse(res, result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('export')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.export')
  @ApplyDataScope()
  async exportCustomers(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const parsed = ExportCustomersRequestSchema.safeParse(body);
    if (!parsed.success) {
      const filterInvalid = parsed.error.issues.some((issue) => issue.path.includes('filter'));
      throw new BadRequestException({
        code: filterInvalid ? 'FILTER_INVALID' : 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    await this.assertExportListPermissions(staff, parsed.data);

    try {
      const result = await this.exportTenantCustomers.execute(
        this.buildExportInput(staff, req, parsed.data),
      );
      this.sendExportResponse(res, result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('bulk-tag')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.update')
  @ApplyDataScope()
  async bulkTag(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = BulkTagCustomersSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.bulkTagCustomers.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        ids: parsed.data.ids,
        tag: parsed.data.tag,
        staffContext: toStaffContext(staff),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return BulkTagCustomersResponseSchema.parse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('bulk-untag')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.update')
  @ApplyDataScope()
  async bulkUntag(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = BulkUntagCustomersSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.bulkUntagCustomers.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        ids: parsed.data.ids,
        tag: parsed.data.tag,
        staffContext: toStaffContext(staff),
        isUndo: parsed.data.isUndo,
        originalAction: parsed.data.originalAction,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return BulkTagCustomersResponseSchema.parse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('recycle')
  @RequirePermission('core.recycle.view')
  async listRecycle(@CurrentStaff() staff: StaffContext, @Query() query: unknown) {
    const parsed = ListDeletedCustomersQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listDeletedCustomers.execute({
        tenantId: staff.tenantId,
        limit: parsed.data.limit,
      });

      return {
        items: result.items.map((item) => ({
          id: item.id,
          localCode: item.localCode,
          deletedAt: item.deletedAt,
          deletedById: item.deletedById,
          deleteReason: item.deleteReason,
          customer: item.globalCustomer,
        })),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.merge')
  @ApplyDataScope()
  async mergeCustomers(
    @CurrentStaff() staff: StaffContext,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Req() request: Request,
  ) {
    const idempotencyKeyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyKeyResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header must be a valid UUID.',
      });
    }

    const parsed = MergeCustomersSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.mergeTenantCustomers.execute({
        tenantId: staff.tenantId,
        sourceTenantCustomerId: parsed.data.sourceTenantCustomerId,
        targetTenantCustomerId: parsed.data.targetTenantCustomerId,
        reason: parsed.data.reason,
        actorId: staff.id,
        idempotencyKey: idempotencyKeyResult.data,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return MergeCustomersResponseSchema.parse({
        data: toTenantCustomerDetailResponse(result.customer),
        meta: {
          mergedSalesCount: result.mergedSalesCount,
          mergedDocumentsCount: result.mergedDocumentsCount,
        },
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.import')
  @ApplyDataScope()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CUSTOMER_IMPORT_MAX_FILE_BYTES },
    }),
  )
  async importCustomers(
    @CurrentStaff() staff: StaffContext,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Headers('idempotency-key') idempotencyKeyHeader: string | undefined,
    @Query() query: unknown,
    @Req() request: Request,
  ) {
    const idempotencyKeyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyKeyResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header must be a valid UUID.',
      });
    }

    const parsedQuery = ImportCustomersQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid import query parameters.',
      });
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: 'FIELD_REQUIRED',
        message: 'Import file is required.',
      });
    }

    try {
      const result = await this.importCustomersExcel.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        idempotencyKey: idempotencyKeyResult.data,
        fileBuffer: file.buffer,
        defaultBranchId: staff.activeBranchId ?? undefined,
        includeErrorFile: parsedQuery.data.includeErrorFile,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toImportCustomersResponse(result) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get('import/template')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.import')
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await buildCustomerImportTemplateBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customer-import-template.xlsx"',
    );
    res.send(buffer);
  }

  @Get(':id/timeline')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async getTimeline(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const queryResult = ListCustomerTimelineQuerySchema.safeParse(query);
    if (!queryResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: queryResult.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      return await this.getCustomerTimeline.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        limit: queryResult.data.limit,
        cursor: queryResult.data.cursor,
        types: queryResult.data.types,
        occurredFrom: queryResult.data.occurredFrom,
        occurredTo: queryResult.data.occurredTo,
        staffContext: toStaffContext(staff),
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id/payments')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async listPayments(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const queryResult = ListCustomerPaymentsQuerySchema.safeParse(query);
    if (!queryResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: queryResult.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listCustomerPayments.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        limit: queryResult.data.limit,
        cursor: queryResult.data.cursor,
        status: queryResult.data.status,
        occurredFrom: queryResult.data.occurredFrom,
        occurredTo: queryResult.data.occurredTo,
        staffContext: toStaffContext(staff),
      });

      return CustomerPaymentListResponseSchema.parse({
        data: result.items.map(toCustomerPaymentResponse),
        summary: {
          totalPaidRial: result.summary.totalPaidRial.toString(),
          pendingCount: result.summary.pendingCount,
        },
        meta: result.meta,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id/contracts')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async listContracts(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const queryResult = ListCustomerContractsQuerySchema.safeParse(query);
    if (!queryResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: queryResult.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const result = await this.listCustomerContracts.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        limit: queryResult.data.limit,
        cursor: queryResult.data.cursor,
        status: queryResult.data.status,
        staffContext: toStaffContext(staff),
      });

      return CustomerContractListResponseSchema.parse({
        data: result.items.map(toCustomerContractResponse),
        meta: result.meta,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':id')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async getById(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const queryResult = GetTenantCustomerQuerySchema.safeParse(query);
    if (!queryResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: queryResult.error.issues[0]?.message ?? 'Invalid query parameters',
      });
    }

    try {
      const detail = await this.getTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        include: queryResult.data.include,
        staffContext: toStaffContext(staff),
      });

      return toTenantCustomerDetailResponse(detail);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.update')
  @ApplyDataScope()
  async update(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = UpdateTenantCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const effective = await this.getStaffPermissions.execute({ staffId: staff.id });
      const canBlacklist = this.getStaffPermissions.hasPermission(
        effective,
        'installments.customer.blacklist',
      );

      await this.updateTenantCustomer.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        tenantCustomerId: idResult.data,
        version: parsed.data.version,
        name: parsed.data.name,
        email: parsed.data.email,
        nationalId: parsed.data.nationalId,
        birthDate: parsed.data.birthDate,
        gender: parsed.data.gender,
        address: parsed.data.address,
        localCode: parsed.data.localCode,
        tags: parsed.data.tags,
        notes: parsed.data.notes,
        internalNotes: parsed.data.internalNotes,
        defaultBranchId: parsed.data.defaultBranchId,
        preferredContactChannel: parsed.data.preferredContactChannel,
        marketingOptIn: parsed.data.marketingOptIn,
        metadata: parsed.data.metadata,
        categoryId: parsed.data.categoryId,
        assignedStaffId: parsed.data.assignedStaffId,
        addresses: parsed.data.addresses,
        emergencyContacts: parsed.data.emergencyContacts,
        contactPhones: parsed.data.contactPhones,
        isBlacklisted: parsed.data.isBlacklisted,
        blacklistReason: parsed.data.blacklistReason,
        canBlacklist,
        canUpdateInternalNotes: true,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const detail = await this.getTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        staffContext: toStaffContext(staff),
      });

      return toTenantCustomerDetailResponse(detail);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.delete')
  @ApplyDataScope()
  async softDelete(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<void> {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = DeleteCustomerSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.softDeleteTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        deleteReason: parsed.data.deleteReason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.transfer')
  @ApplyDataScope()
  async transferOwnership(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = TransferCustomerOwnershipSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.transferCustomerOwnership.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        newStaffId: parsed.data.newStaffId,
        note: parsed.data.note,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toTenantCustomerDetailResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Patch(':id/score')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.score.adjust')
  @ApplyDataScope()
  async adjustScore(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = AdjustCustomerScoreSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.adjustCustomerScore.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        delta: parsed.data.delta,
        newScore: parsed.data.newScore,
        reason: parsed.data.reason,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toTenantCustomerDetailResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/blacklist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.blacklist')
  @ApplyDataScope()
  async blacklistCustomer(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = BlacklistCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.blacklistTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        reason: parsed.data.reason,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toTenantCustomerDetailResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/unblacklist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.blacklist')
  @ApplyDataScope()
  async unblacklistCustomer(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = UnblacklistCustomerSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      const result = await this.unblacklistTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return toTenantCustomerDetailResponse(result);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.archive')
  @ApplyDataScope()
  async archive(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = ArchiveCustomerSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.archiveTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const full = await this.getTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        staffContext: toStaffContext(staff),
      });

      return toTenantCustomerDetailResponse(full);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.archive')
  @ApplyDataScope()
  async unarchive(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    const parsed = ArchiveCustomerSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.unarchiveTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const full = await this.getTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        staffContext: toStaffContext(staff),
      });

      return toTenantCustomerDetailResponse(full);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.restore')
  async restore(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const idResult = customerIdParamSchema.safeParse(id);
    if (!idResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer id must be a valid UUID.',
      });
    }

    try {
      const result = await this.restoreTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const full = await this.getTenantCustomer.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        staffContext: toStaffContext(staff),
      });

      return {
        id: result.customer.id,
        restoredAt: result.restoredAt.toISOString(),
        customer: toTenantCustomerDetailResponse(full),
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private async assertExportListPermissions(
    staff: StaffContext,
    data: { includeArchived?: boolean; linkStatus?: string },
  ): Promise<void> {
    const effective = await this.getStaffPermissions.execute({ staffId: staff.id });

    if (
      data.includeArchived &&
      !this.getStaffPermissions.hasPermission(effective, 'installments.customer.archive')
    ) {
      throw new HttpException(
        { code: 'PERMISSION_DENIED', message: 'Including archived customers is not permitted.' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      data.linkStatus === 'deleted' &&
      !this.getStaffPermissions.hasPermission(effective, 'installments.customer.restore')
    ) {
      throw new HttpException(
        { code: 'PERMISSION_DENIED', message: 'Listing deleted customers is not permitted.' },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private buildExportInput(
    staff: StaffContext,
    req: Request,
    data: ExportCustomersQueryDto | ExportCustomersRequestDto,
  ): ExportTenantCustomersInput {
    const search = 'search' in data && data.search ? data.search : undefined;

    return {
      tenantId: staff.tenantId,
      actorId: staff.id,
      search,
      filter: data.filter,
      sort: data.sort,
      tags: data.tags,
      status: data.status,
      branchId: data.branchId,
      defaultBranchId: data.defaultBranchId,
      categoryId: data.categoryId,
      isBlacklisted: data.isBlacklisted,
      assignedStaffId: data.assignedStaffId,
      linkStatus: data.linkStatus,
      createdAtFrom: data.createdAtFrom ? new Date(data.createdAtFrom) : undefined,
      createdAtTo: data.createdAtTo ? new Date(data.createdAtTo) : undefined,
      lastPurchaseAtFrom: data.lastPurchaseAtFrom
        ? new Date(data.lastPurchaseAtFrom)
        : undefined,
      lastPurchaseAtTo: data.lastPurchaseAtTo ? new Date(data.lastPurchaseAtTo) : undefined,
      includeArchived: data.includeArchived,
      columns: data.columns,
      ids: data.ids,
      locale: data.locale,
      format: data.format,
      staffContext: toStaffContext(staff),
      maxRows: this.appConfig.exportMaxRows,
      pdfMaxRows: this.appConfig.pdfMaxRows,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      filterHashPayload: data,
    };
  }

  private sendExportResponse(res: Response, result: ExportTenantCustomersOutput): void {
    if (result.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Export-Row-Count', String(result.rowCount));
      res.send(result.buffer);
      return;
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Export-Row-Count', String(result.rowCount));
    result.stream.pipe(res);
  }

  private toHttpException(error: unknown): HttpException {
    if (isMulterFileSizeError(error)) {
      return new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Import file exceeds the 5MB limit.' },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    if (error instanceof ApplicationError) {
      return new HttpException(
        { code: error.code, message: error.message, details: error.details },
        error.httpStatus,
      );
    }

    throw error;
  }
}

function isMulterFileSizeError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'MulterError' &&
    'code' in error &&
    (error as { code?: string }).code === 'LIMIT_FILE_SIZE'
  );
}
