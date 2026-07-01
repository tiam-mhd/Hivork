import { UseCase } from '../core/use-case.js';
import type {
  IStaffSavedFilterRepository,
  StaffSavedFilterRecord,
} from '../ports/staff-saved-filter.repository.port.js';

export type ListStaffSavedFiltersInput = {
  tenantId: string;
  staffId: string;
  resourceKey: string;
};

export type ListStaffSavedFiltersOutput = {
  items: StaffSavedFilterRecord[];
};

export class ListStaffSavedFiltersUseCase
  implements UseCase<ListStaffSavedFiltersInput, ListStaffSavedFiltersOutput>
{
  constructor(private readonly repository: IStaffSavedFilterRepository) {}

  async execute(input: ListStaffSavedFiltersInput): Promise<ListStaffSavedFiltersOutput> {
    const items = await this.repository.listActive(
      input.tenantId,
      input.staffId,
      input.resourceKey,
    );

    return { items };
  }
}
