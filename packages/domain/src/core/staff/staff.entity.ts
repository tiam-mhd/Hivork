import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';
import type { DataScope } from '../rbac/data-scope.vo.js';

export type { DataScope };
export type StaffStatus = 'active' | 'suspended';

export class Staff {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly userId: string,
    private _name: string,
    private _status: StaffStatus,
    private _dataScope: DataScope,
    private _assignedBranchIds: string[],
    private _primaryBranchId: string | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    userId: string;
    name: string;
    dataScope?: DataScope;
    assignedBranchIds?: string[];
    primaryBranchId?: string | null;
  }): Staff {
    return new Staff(
      randomUUID(),
      props.tenantId,
      props.userId,
      props.name.trim(),
      'active',
      props.dataScope ?? 'all',
      [...(props.assignedBranchIds ?? [])],
      props.primaryBranchId ?? null,
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    userId: string;
    name: string;
    status: StaffStatus;
    dataScope: DataScope;
    assignedBranchIds: string[];
    primaryBranchId: string | null;
    deletedAt: Date | null;
    deletedById: string | null;
  }): Staff {
    return new Staff(
      props.id,
      props.tenantId,
      props.userId,
      props.name,
      props.status,
      props.dataScope,
      [...props.assignedBranchIds],
      props.primaryBranchId,
      props.deletedAt,
      props.deletedById,
    );
  }

  get name(): string {
    return this._name;
  }
  get status(): StaffStatus {
    return this._status;
  }

  get dataScope(): DataScope {
    return this._dataScope;
  }

  get assignedBranchIds(): readonly string[] {
    return this._assignedBranchIds;
  }

  get primaryBranchId(): string | null {
    return this._primaryBranchId;
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

  get canAuthenticate(): boolean {
    return this._status === 'active' && !this.isDeleted;
  }

  suspend(): void {
    if (this._status === 'suspended') {
      throw new DomainError('ALREADY_SUSPENDED');
    }
    this._status = 'suspended';
  }

  assignBranches(branchIds: string[]): void {
    const unique = [...new Set(branchIds)];
    if (unique.length !== branchIds.length) {
      throw new DomainError('DUPLICATE_BRANCH_IDS');
    }
    this._assignedBranchIds = unique;
  }

  setPrimaryBranch(branchId: string | null): void {
    if (branchId !== null && !this.canAccessBranch(branchId)) {
      throw new DomainError('BRANCH_NOT_ALLOWED');
    }
    this._primaryBranchId = branchId;
  }

  canAccessBranch(branchId: string): boolean {
    if (this._assignedBranchIds.length === 0) {
      return true;
    }
    return this._assignedBranchIds.includes(branchId);
  }

  effectiveBranchIds(activeBranchId?: string | null): string[] {
    if (this._dataScope !== 'branch') {
      return [];
    }

    if (activeBranchId) {
      if (!this.canAccessBranch(activeBranchId)) {
        throw new DomainError('BRANCH_NOT_ALLOWED');
      }
      return [activeBranchId];
    }

    return [...this._assignedBranchIds];
  }

  softDelete(deletedById: string, _reason?: string): void {
    if (this._deletedAt !== null) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
  }

  restore(): void {
    if (this._deletedAt === null) {
      throw new DomainError('NOT_DELETED');
    }
    this._deletedAt = null;
    this._deletedById = null;
  }
}
