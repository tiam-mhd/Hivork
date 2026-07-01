import { hasPermission, resolveEffectivePermissions } from '@hivork/domain';

import { UseCase } from '../core/use-case.js';
import type { IStaffPermissionsCache } from '../ports/staff-permissions-cache.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';

export type GetStaffPermissionsInput = {
  staffId: string;
};

export type GetStaffPermissionsOutput = Set<string>;

export class GetStaffPermissionsUseCase
  implements UseCase<GetStaffPermissionsInput, GetStaffPermissionsOutput>
{
  constructor(
    private readonly repository: IStaffPermissionsRepository,
    private readonly cache: IStaffPermissionsCache | null = null,
    private readonly cacheTtlSeconds = 300,
  ) {}

  async execute(input: GetStaffPermissionsInput): Promise<GetStaffPermissionsOutput> {
    if (this.cache) {
      const cached = await this.cache.get(input.staffId);
      if (cached) {
        return new Set(cached);
      }
    }

    const sources = await this.repository.findPermissionSourcesByStaffId(input.staffId);
    const effective = resolveEffectivePermissions(sources);

    if (this.cache) {
      await this.cache.set(input.staffId, [...effective], this.cacheTtlSeconds);
    }

    return effective;
  }

  hasPermission(effective: Set<string>, required: string): boolean {
    return hasPermission(effective, required);
  }
}
