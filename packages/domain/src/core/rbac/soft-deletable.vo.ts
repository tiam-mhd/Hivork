import { DomainError } from '../../errors/domain.error.js';

export type SoftDeleteState = {
  deletedAt: Date;
  deletedById: string;
};

export function assertNotDeleted(deletedAt: Date | null): void {
  if (deletedAt !== null) {
    throw new DomainError('ALREADY_DELETED');
  }
}

export function assertCanRestore(deletedAt: Date | null): void {
  if (deletedAt === null) {
    throw new DomainError('NOT_DELETED');
  }
}

export function softDeleteState(deletedById: string): SoftDeleteState {
  return {
    deletedAt: new Date(),
    deletedById,
  };
}
