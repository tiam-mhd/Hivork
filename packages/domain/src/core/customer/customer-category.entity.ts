import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

const MAX_NAME_LENGTH = 120;
const MAX_SLUG_LENGTH = 80;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CustomerCategory {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    private _name: string,
    private _slug: string,
    private _color: string | null,
    private _sortOrder: number,
    private _isDefault: boolean,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static create(props: {
    tenantId: string;
    name: string;
    slug: string;
    color?: string | null;
    sortOrder?: number;
    isDefault?: boolean;
  }): CustomerCategory {
    return new CustomerCategory(
      randomUUID(),
      props.tenantId,
      normalizeName(props.name),
      normalizeSlug(props.slug),
      normalizeColor(props.color),
      props.sortOrder ?? 0,
      props.isDefault ?? false,
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    color: string | null;
    sortOrder: number;
    isDefault: boolean;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): CustomerCategory {
    return new CustomerCategory(
      props.id,
      props.tenantId,
      props.name,
      props.slug,
      props.color,
      props.sortOrder,
      props.isDefault,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get color(): string | null {
    return this._color;
  }

  get sortOrder(): number {
    return this._sortOrder;
  }

  get isDefault(): boolean {
    return this._isDefault;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get deleteReason(): string | null {
    return this._deleteReason;
  }

  rename(name: string): void {
    this.assertActive();
    this._name = normalizeName(name);
  }

  updateDisplay(props: {
    color?: string | null;
    sortOrder?: number;
    isDefault?: boolean;
  }): void {
    this.assertActive();
    if (props.color !== undefined) {
      this._color = normalizeColor(props.color);
    }
    if (props.sortOrder !== undefined) {
      this._sortOrder = props.sortOrder;
    }
    if (props.isDefault !== undefined) {
      this._isDefault = props.isDefault;
    }
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._deleteReason = reason?.trim() || null;
  }

  private assertActive(): void {
    if (this.isDeleted) {
      throw new DomainError('CATEGORY_DELETED');
    }
  }
}

function normalizeName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('CATEGORY_NAME_REQUIRED');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeSlug(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(trimmed)) {
    throw new DomainError('INVALID_CATEGORY_SLUG');
  }
  return trimmed;
}

function normalizeColor(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    throw new DomainError('INVALID_CATEGORY_COLOR');
  }
  return trimmed;
}
