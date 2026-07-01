import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

export type TenantStatus = 'trial' | 'active' | 'suspended';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const SLUG_MIN = 3;
const SLUG_MAX = 50;

export class Tenant {
  constructor(
    readonly id: string,
    private _name: string,
    readonly slug: string,
    private _status: TenantStatus,
    readonly planId: string,
    readonly enabledModules: string[],
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  static create(props: {
    name: string;
    slug: string;
    planId: string;
    modules: string[];
  }): Tenant {
    validateSlug(props.slug);
    validateModules(props.modules);

    return new Tenant(
      randomUUID(),
      props.name.trim(),
      props.slug,
      'trial',
      props.planId,
      [...props.modules],
    );
  }

  static reconstitute(props: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    planId: string;
    enabledModules: string[];
    deletedAt: Date | null;
    deletedById: string | null;
  }): Tenant {
    return new Tenant(
      props.id,
      props.name,
      props.slug,
      props.status,
      props.planId,
      [...props.enabledModules],
      props.deletedAt,
      props.deletedById,
    );
  }

  get name(): string {
    return this._name;
  }

  get status(): TenantStatus {
    return this._status;
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

  suspend(_reason?: string): void {
    if (this._status === 'suspended') {
      throw new DomainError('ALREADY_SUSPENDED');
    }
    this._status = 'suspended';
  }

  activate(): void {
    if (this._status === 'active') {
      throw new DomainError('ALREADY_ACTIVE');
    }
    this._status = 'active';
  }

  hasModule(code: string): boolean {
    return this.enabledModules.includes(code);
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

function validateSlug(slug: string): void {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX || !SLUG_PATTERN.test(slug)) {
    throw new DomainError('INVALID_SLUG');
  }
}

function validateModules(modules: string[]): void {
  if (modules.length === 0) {
    throw new DomainError('MODULES_REQUIRED');
  }
}
