import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  ISoftDeletableRepository,
  SoftDeletableRecord,
} from '../ports/soft-deletable.repository.port.js';

export type RestoreEntityInput = {
  tenantId: string;
  entityId: string;
  actorId: string;
  ip?: string;
  userAgent?: string;
};

export type RestoreEntityOutput = {
  id: string;
  restoredAt: Date;
};

export class RestoreEntityUseCase<TRecord extends SoftDeletableRecord = SoftDeletableRecord>
  implements UseCase<RestoreEntityInput, RestoreEntityOutput>
{
  constructor(
    private readonly repository: ISoftDeletableRepository<TRecord>,
    private readonly audit: AuditService,
    private readonly entityType: string,
  ) {}

  async execute(input: RestoreEntityInput): Promise<RestoreEntityOutput> {
    const deleted = await this.repository.findDeletedById(input.entityId, input.tenantId);
    if (!deleted) {
      const active = await this.repository.findActiveById(input.entityId, input.tenantId);
      if (active) {
        throw new ApplicationError('NOT_DELETED', 'Entity is not deleted.', 409);
      }

      throw new ApplicationError('NOT_FOUND', 'Entity not found.', 404);
    }

    const restored = await this.repository.restore({
      id: input.entityId,
      tenantId: input.tenantId,
      restoredById: input.actorId,
    });

    const restoredAt = new Date();

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'entity.restore',
      entityType: this.entityType,
      entityId: input.entityId,
      oldValue: {
        deletedAt: deleted.deletedAt,
        deletedById: deleted.deletedById,
        deleteReason: deleted.deleteReason,
      },
      newValue: { deletedAt: null },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { id: restored.id, restoredAt };
  }
}
