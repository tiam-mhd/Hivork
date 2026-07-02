import {
  ApplicationError,
  CUSTOMER_DOCUMENT_ABSOLUTE_MAX_BYTES,
  DeleteCustomerDocumentUseCase,
  GetCustomerDocumentDownloadUseCase,
  ListCustomerDocumentsUseCase,
  UploadCustomerDocumentUseCase,
} from '@hivork/application';
import {
  CustomerDocumentDownloadResponseSchema,
  CustomerDocumentListResponseSchema,
  DeleteCustomerDocumentBodySchema,
  ListCustomerDocumentsQuerySchema,
  UploadCustomerDocumentBodySchema,
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
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { z } from 'zod';

import { ApplyDataScope } from '../common/decorators/apply-data-scope.decorator';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { RequireAuth } from '../common/decorators/require-auth.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { ModuleGuard } from '../common/guards/module.guard';
import type { StaffContext } from '../common/types/auth-context';
import { toCustomerDocumentResponse } from './customer-documents.response.js';

const customerIdParamSchema = z.string().uuid();
const documentIdParamSchema = z.string().uuid();

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
export class CustomerDocumentsController {
  constructor(
    private readonly uploadCustomerDocument: UploadCustomerDocumentUseCase,
    private readonly listCustomerDocuments: ListCustomerDocumentsUseCase,
    private readonly deleteCustomerDocument: DeleteCustomerDocumentUseCase,
    private readonly getCustomerDocumentDownload: GetCustomerDocumentDownloadUseCase,
  ) {}

  @Post(':customerId/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.document.upload')
  @ApplyDataScope()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CUSTOMER_DOCUMENT_ABSOLUTE_MAX_BYTES },
    }),
  )
  async upload(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
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

    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: 'FIELD_REQUIRED',
        message: 'Upload file is required.',
      });
    }

    const parsed = UploadCustomerDocumentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid upload fields.',
      });
    }

    try {
      const record = await this.uploadCustomerDocument.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        fileBuffer: file.buffer,
        originalFileName: file.originalname || 'upload',
        mimeType: file.mimetype,
        documentType: parsed.data.documentType,
        description: parsed.data.description,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: toCustomerDocumentResponse(record) };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':customerId/documents')
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

    const parsed = ListCustomerDocumentsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid query parameters.',
      });
    }

    try {
      const result = await this.listCustomerDocuments.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: idResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
        documentType: parsed.data.documentType,
      });

      return CustomerDocumentListResponseSchema.parse({
        data: result.items.map(toCustomerDocumentResponse),
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(':customerId/documents/:documentId/download')
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.view')
  @ApplyDataScope()
  async download(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @Param('documentId') documentId: string,
  ) {
    const customerIdResult = customerIdParamSchema.safeParse(customerId);
    const documentIdResult = documentIdParamSchema.safeParse(documentId);
    if (!customerIdResult.success || !documentIdResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer and document ids must be valid UUIDs.',
      });
    }

    try {
      const result = await this.getCustomerDocumentDownload.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: customerIdResult.data,
        documentId: documentIdResult.data,
        actorId: staff.id,
        staffContext: toStaffContext(staff),
      });

      return CustomerDocumentDownloadResponseSchema.parse({
        data: {
          url: result.url,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete(':customerId/documents/:documentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModuleGuard)
  @RequireModule('installments')
  @RequirePermission('installments.customer.document.delete')
  @ApplyDataScope()
  async remove(
    @CurrentStaff() staff: StaffContext,
    @Param('customerId') customerId: string,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const customerIdResult = customerIdParamSchema.safeParse(customerId);
    const documentIdResult = documentIdParamSchema.safeParse(documentId);
    if (!customerIdResult.success || !documentIdResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Customer and document ids must be valid UUIDs.',
      });
    }

    const parsed = DeleteCustomerDocumentBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body.',
      });
    }

    try {
      const result = await this.deleteCustomerDocument.execute({
        tenantId: staff.tenantId,
        tenantCustomerId: customerIdResult.data,
        documentId: documentIdResult.data,
        actorId: staff.id,
        deleteReason: parsed.data.deleteReason,
        staffContext: toStaffContext(staff),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        data: {
          id: result.id,
          deletedAt: result.deletedAt.toISOString(),
        },
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (isMulterFileSizeError(error)) {
      return new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'Upload file exceeds the allowed size.' },
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
