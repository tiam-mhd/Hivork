import {
  ApplicationError,
  CreateTenantCustomerUseCase,
  CUSTOMER_IMPORT_MAX_FILE_BYTES,
  ExportTenantCustomersUseCase,
  GetTenantCustomerUseCase,
  ImportCustomersExcelUseCase,
  ListDeletedTenantCustomersUseCase,
  ListTenantCustomersUseCase,
  RestoreEntityUseCase,
  SoftDeleteEntityUseCase,
  UpdateTenantCustomerUseCase,
} from '@hivork/application';
import {
  CreateTenantCustomerSchema,
  CustomerListQuerySchema,
  ExportCustomersRequestSchema,
  GetTenantCustomerQuerySchema,
  ListDeletedCustomersQuerySchema,
  SoftDeleteCustomerBodySchema,
  UpdateTenantCustomerSchema,
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
    private readonly updateTenantCustomer: UpdateTenantCustomerUseCase,
    private readonly importCustomersExcel: ImportCustomersExcelUseCase,
    private readonly softDeleteCustomer: SoftDeleteEntityUseCase,
    private readonly restoreCustomer: RestoreEntityUseCase,
    private readonly listDeletedCustomers: ListDeletedTenantCustomersUseCase,
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
        defaultBranchId: parsed.data.defaultBranchId,
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

    try {
      const result = await this.exportTenantCustomers.execute({
        tenantId: staff.tenantId,
        actorId: staff.id,
        search: parsed.data.search,
        filter: parsed.data.filter,
        sort: parsed.data.sort,
        tags: parsed.data.tags,
        status: parsed.data.status,
        defaultBranchId: parsed.data.defaultBranchId,
        columns: parsed.data.columns,
        ids: parsed.data.ids,
        locale: parsed.data.locale,
        format: parsed.data.format,
        staffContext: toStaffContext(staff),
        maxRows: this.appConfig.exportMaxRows,
        pdfMaxRows: this.appConfig.pdfMaxRows,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        filterHashPayload: parsed.data,
      });

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
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      );

      if (result.rowCount === 0) {
        res.setHeader('X-Export-Row-Count', '0');
      } else {
        res.setHeader('X-Export-Row-Count', String(result.rowCount));
      }

      result.stream.pipe(res);
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
    @Req() request: Request,
  ) {
    const idempotencyKeyResult = idempotencyKeySchema.safeParse(idempotencyKeyHeader);
    if (!idempotencyKeyResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header must be a valid UUID.',
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
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toImportCustomersResponse(result) };
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
  @RequirePermission('core.customer.delete')
  async softDelete(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<void> {
    const parsed = SoftDeleteCustomerBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      });
    }

    try {
      await this.softDeleteCustomer.execute({
        tenantId: staff.tenantId,
        entityId: id,
        actorId: staff.id,
        deleteReason: parsed.data.deleteReason,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('core.customer.restore')
  async restore(
    @CurrentStaff() staff: StaffContext,
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    try {
      return await this.restoreCustomer.execute({
        tenantId: staff.tenantId,
        entityId: id,
        actorId: staff.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (isMulterFileSizeError(error)) {
      return new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Import file exceeds the 5MB limit.',
      });
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
