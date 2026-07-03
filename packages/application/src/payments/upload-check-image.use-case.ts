import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { IFileStoragePort } from '../ports/file-storage.port.js';
import type { IStoredFileRepository } from '../ports/stored-file.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertCheckBranchAccess } from './check-access.js';
import {
  ALLOWED_CHECK_IMAGE_MIMES,
  CHECK_IMAGE_MAX_BYTES,
  buildCheckImageStorageKey,
} from './check-image.constants.js';

export type UploadCheckImageInput = {
  tenantId: string;
  staffId: string;
  checkId: string;
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type UploadCheckImageResult = {
  imageFileId: string;
  mimeType: string;
  sizeBytes: string;
};

export class UploadCheckImageUseCase
  implements UseCase<UploadCheckImageInput, UploadCheckImageResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly storedFiles: IStoredFileRepository,
    private readonly storage: IFileStoragePort,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UploadCheckImageInput): Promise<UploadCheckImageResult> {
    const check = await this.checks.findById(input.tenantId, input.checkId);
    if (!check) {
      throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
    }

    await assertCheckBranchAccess(
      this.branches,
      input.tenantId,
      check.branchId,
      input.staffContext,
    );

    const mimeType = input.mimeType.trim().toLowerCase();
    if (!(ALLOWED_CHECK_IMAGE_MIMES as readonly string[]).includes(mimeType)) {
      throw new ApplicationError(
        'INVALID_FILE_TYPE',
        'Only JPEG, PNG, and PDF files are allowed.',
        400,
      );
    }

    const sizeBytes = BigInt(input.fileBuffer.byteLength);
    if (sizeBytes > CHECK_IMAGE_MAX_BYTES) {
      throw new ApplicationError(
        'FILE_TOO_LARGE',
        `File exceeds the maximum size of ${CHECK_IMAGE_MAX_BYTES} bytes.`,
        413,
      );
    }

    const fileId = randomUUID();
    const storageKey = buildCheckImageStorageKey(input.tenantId, input.checkId, mimeType);

    try {
      await this.storage.upload({
        key: storageKey,
        body: input.fileBuffer,
        mimeType,
        sizeBytes,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError(
        'STORAGE_ERROR',
        'File could not be stored. Please try again later.',
        503,
      );
    }

    try {
      return await this.unitOfWork.transaction(async (tx) => {
        await this.storedFiles.create(
          {
            id: fileId,
            tenantId: input.tenantId,
            storageKey,
            originalName: input.originalFileName,
            mimeType,
            sizeBytes,
            category: 'check_scan',
            createdById: input.staffId,
          },
          tx,
        );

        const updateResult = await this.checks.updateImageFile(
          {
            tenantId: input.tenantId,
            id: check.id,
            expectedVersion: check.version,
            imageFileId: fileId,
            updatedById: input.staffId,
          },
          tx,
        );

        if (updateResult.outcome === 'not_found') {
          throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
        }

        if (updateResult.outcome === 'version_conflict') {
          throw new ApplicationError(
            'VERSION_CONFLICT',
            'Check was updated by another request.',
            409,
          );
        }

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'check.tracking.image',
            entityType: 'check',
            entityId: input.checkId,
            newValue: {
              imageFileId: fileId,
              mimeType,
              sizeBytes: sizeBytes.toString(),
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return {
          imageFileId: fileId,
          mimeType,
          sizeBytes: sizeBytes.toString(),
        };
      });
    } catch (error) {
      await this.storage.deleteObject(storageKey);
      throw error;
    }
  }
}
