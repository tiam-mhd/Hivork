import { UseCase } from '../core/use-case.js';
import type {
  IStaffSavedViewRepository,
  ListStaffSavedViewsResult,
} from '../ports/staff-saved-view.repository.port.js';

export type ListStaffSavedViewsInput = {
  tenantId: string;
  staffId: string;
  resourceKey: string;
  includeShared: boolean;
};

export type ListStaffSavedViewsOutput = ListStaffSavedViewsResult;

export class ListStaffSavedViewsUseCase
  implements UseCase<ListStaffSavedViewsInput, ListStaffSavedViewsOutput>
{
  constructor(private readonly repository: IStaffSavedViewRepository) {}

  async execute(input: ListStaffSavedViewsInput): Promise<ListStaffSavedViewsOutput> {
    return this.repository.listAccessible(
      input.tenantId,
      input.staffId,
      input.resourceKey,
      input.includeShared,
    );
  }
}
