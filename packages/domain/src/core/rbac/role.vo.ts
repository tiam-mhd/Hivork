import { DomainError } from '../../errors/domain.error.js';
import { assertCanRestore, assertNotDeleted, softDeleteState } from './soft-deletable.vo.js';

export class Role {
  constructor(
    readonly id: string,
    readonly tenantId: string | null,
    readonly isTemplate: boolean,
    private _name: string,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  get name(): string {
    return this._name;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  rename(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new DomainError('INVALID_ROLE_NAME');
    }
    this._name = trimmed;
  }

  softDelete(deletedById: string): void {
    if (this.isTemplate) {
      throw new DomainError('DELETE_FORBIDDEN');
    }
    assertNotDeleted(this._deletedAt);
    const state = softDeleteState(deletedById);
    this._deletedAt = state.deletedAt;
    this._deletedById = state.deletedById;
  }

  restore(): void {
    assertCanRestore(this._deletedAt);
    this._deletedAt = null;
    this._deletedById = null;
  }
}
