import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type {
  ISoftDeletableRepository,
  SoftDeletableRecord,
} from '../ports/soft-deletable.repository.port.js';

export type ListDeletedEntitiesInput = {
  tenantId: string;
  limit?: number;
};

export type ListDeletedEntitiesOutput<TRecord extends SoftDeletableRecord = SoftDeletableRecord> = {
  items: TRecord[];
};

export class ListDeletedEntitiesUseCase<TRecord extends SoftDeletableRecord = SoftDeletableRecord>
  implements UseCase<ListDeletedEntitiesInput, ListDeletedEntitiesOutput<TRecord>>
{
  constructor(private readonly repository: ISoftDeletableRepository<TRecord>) {}

  async execute(input: ListDeletedEntitiesInput): Promise<ListDeletedEntitiesOutput<TRecord>> {
    const limit = input.limit ?? 50;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const items = await this.repository.listDeleted(input.tenantId, limit);
    return { items };
  }
}
