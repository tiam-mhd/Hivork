import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import {
  FILE_SIGNED_DOWNLOAD_TTL_SECONDS,
  type IFileStoragePort,
} from '../ports/file-storage.port.js';
import type { IStoredFileRepository } from '../ports/stored-file.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertCheckBranchAccess } from './check-access.js';

export type GetCheckImageInput = {
  tenantId: string;
  checkId: string;
  staffContext: DataScopeStaffContext;
};

export type GetCheckImageResult = {
  url: string;
  expiresAt: string;
  mimeType: string;
  imageFileId: string;
};

export class GetCheckImageUseCase implements UseCase<GetCheckImageInput, GetCheckImageResult> {
  constructor(
    private readonly checks: ICheckRepository,
    private readonly storedFiles: IStoredFileRepository,
    private readonly storage: IFileStoragePort,
    private readonly branches: IBranchReader,
  ) {}

  async execute(input: GetCheckImageInput): Promise<GetCheckImageResult> {
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

    if (!check.imageFileId) {
      throw new ApplicationError('CHECK_IMAGE_NOT_FOUND', 'Check image was not found.', 404);
    }

    const storedFile = await this.storedFiles.findById(input.tenantId, check.imageFileId);
    if (!storedFile) {
      throw new ApplicationError('CHECK_IMAGE_NOT_FOUND', 'Check image was not found.', 404);
    }

    const expiresAt = new Date(Date.now() + FILE_SIGNED_DOWNLOAD_TTL_SECONDS * 1000);
    const url = await this.storage.getSignedDownloadUrl(
      storedFile.storageKey,
      FILE_SIGNED_DOWNLOAD_TTL_SECONDS,
    );

    return {
      url,
      expiresAt: expiresAt.toISOString(),
      mimeType: storedFile.mimeType,
      imageFileId: storedFile.id,
    };
  }
}
