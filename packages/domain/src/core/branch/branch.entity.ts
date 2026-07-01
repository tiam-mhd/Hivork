import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

const DEFAULT_BRANCH_NAME = 'شعبه اصلی';
const NAME_MIN_LENGTH = 2;

export class Branch {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    private _name: string,
    private _address: string | null,
    readonly isDefault: boolean,
    private _isActive: boolean,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    name: string;
    address?: string | null;
    isDefault?: boolean;
  }): Branch {
    validateName(props.name);
    return new Branch(
      randomUUID(),
      props.tenantId,
      props.name.trim(),
      props.address ?? null,
      props.isDefault ?? false,
      true,
    );
  }

  static createDefault(tenantId: string): Branch {
    return new Branch(
      randomUUID(),
      tenantId,
      DEFAULT_BRANCH_NAME,
      null,
      true,
      true,
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    name: string;
    address: string | null;
    isDefault: boolean;
    isActive: boolean;
    deletedAt: Date | null;
    deletedById: string | null;
  }): Branch {
    return new Branch(
      props.id,
      props.tenantId,
      props.name,
      props.address,
      props.isDefault,
      props.isActive,
      props.deletedAt,
      props.deletedById,
    );
  }

  get name(): string {
    return this._name;
  }

  get address(): string | null {
    return this._address;
  }

  get isActive(): boolean {
    return this._isActive;
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
    validateName(name);
    this._name = name.trim();
  }

  deactivate(): void {
    if (this.isDefault) {
      throw new DomainError('CANNOT_DEACTIVATE_DEFAULT_BRANCH');
    }
    this._isActive = false;
  }

  softDelete(deletedById: string, _reason?: string): void {
    if (this.isDefault) {
      throw new DomainError('DELETE_FORBIDDEN');
    }
    if (this._deletedAt !== null) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._isActive = false;
  }

  restore(): void {
    if (this._deletedAt === null) {
      throw new DomainError('NOT_DELETED');
    }
    this._deletedAt = null;
    this._deletedById = null;
    this._isActive = true;
  }
}

function validateName(name: string): void {
  if (name.trim().length < NAME_MIN_LENGTH) {
    throw new DomainError('INVALID_BRANCH_NAME');
  }
}
