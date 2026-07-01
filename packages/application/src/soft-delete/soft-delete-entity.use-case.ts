import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  ISoftDeletableRepository,
  SoftDeletableRecord,
} from '../ports/soft-deletable.repository.port.js';

export type SoftDeleteEntityInput = {
  tenantId: string;
  entityId: string;
  actorId: string;
  deleteReason?: string;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteEntityOutput = {
  id: string;
  deletedAt: Date;
};

export type EntityDeletableGuard = (
  entityId: string,
  tenantId: string,
) => Promise<void>;

export class SoftDeleteEntityUseCase<TRecord extends SoftDeletableRecord = SoftDeletableRecord>
  implements UseCase<SoftDeleteEntityInput, SoftDeleteEntityOutput>
{
  constructor(
    private readonly repository: ISoftDeletableRepository<TRecord>,
    private readonly audit: AuditService,
    private readonly entityType: string,
    private readonly assertDeletable?: EntityDeletableGuard,
  ) {}

  async execute(input: SoftDeleteEntityInput): Promise<SoftDeleteEntityOutput> {
    if (this.assertDeletable) {
      await this.assertDeletable(input.entityId, input.tenantId);
    }

    const active = await this.repository.findActiveById(input.entityId, input.tenantId);
    if (!active) {
      const deleted = await this.repository.findDeletedById(input.entityId, input.tenantId);
      if (deleted) {
        throw new ApplicationError('ALREADY_DELETED', 'Entity is already deleted.', 409);
      }

      throw new ApplicationError('NOT_FOUND', 'Entity not found.', 404);
    }

    const updated = await this.repository.softDelete({
      id: input.entityId,
      tenantId: input.tenantId,
      deletedById: input.actorId,
      deleteReason: input.deleteReason,
    });

    if (!updated.deletedAt) {
      throw new ApplicationError('ALREADY_DELETED', 'Entity is already deleted.', 409);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'entity.soft_delete',
      entityType: this.entityType,
      entityId: input.entityId,
      oldValue: { deletedAt: null },
      newValue: {
        deletedAt: updated.deletedAt,
        deletedById: updated.deletedById,
        deleteReason: updated.deleteReason,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { id: updated.id, deletedAt: updated.deletedAt };
  }
}
