import type { PrintSnapshotPayloadDto } from '@hivork/contracts/core';

import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { IPrintSnapshotStore } from '../ports/print-snapshot-store.port.js';

export type GetPrintSnapshotInput = {
  token: string;
  tenantId: string;
  staffId: string;
};

export type GetPrintSnapshotOutput = PrintSnapshotPayloadDto;

export class GetPrintSnapshotUseCase
  implements UseCase<GetPrintSnapshotInput, GetPrintSnapshotOutput>
{
  constructor(private readonly snapshotStore: IPrintSnapshotStore) {}

  async execute(input: GetPrintSnapshotInput): Promise<GetPrintSnapshotOutput> {
    const record = await this.snapshotStore.get(input.token);

    if (!record) {
      throw new ApplicationError(
        'PRINT_TOKEN_EXPIRED',
        'Print preview has expired. Generate a new print preview.',
        410,
      );
    }

    if (record.tenantId !== input.tenantId || record.staffId !== input.staffId) {
      throw new ApplicationError(
        'PRINT_TOKEN_EXPIRED',
        'Print preview has expired. Generate a new print preview.',
        410,
      );
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new ApplicationError(
        'PRINT_TOKEN_EXPIRED',
        'Print preview has expired. Generate a new print preview.',
        410,
      );
    }

    return record.payload;
  }
}
