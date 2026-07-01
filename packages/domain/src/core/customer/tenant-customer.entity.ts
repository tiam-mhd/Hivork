import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

export type PreferredContactChannel = 'telegram' | 'bale' | 'sms' | 'phone';

export type TenantCustomerLinkProps = {
  localCode?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  tags?: string[];
  marketingOptIn?: boolean;
  preferredContactChannel?: PreferredContactChannel | null;
};

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;
const MAX_LOCAL_CODE_LENGTH = 50;
const MAX_NOTES_LENGTH = 1000;

export class TenantCustomer {
  constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly globalCustomerId: string,
    private _localCode: string | null,
    private _notes: string | null,
    private _internalNotes: string | null,
    private _defaultBranchId: string | null,
    private _tags: string[],
    private _marketingOptIn: boolean,
    private _preferredContactChannel: PreferredContactChannel | null,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
    private _deleteReason: string | null = null,
  ) {}

  static link(
    tenantId: string,
    globalCustomerId: string,
    props: TenantCustomerLinkProps = {},
  ): TenantCustomer {
    return new TenantCustomer(
      randomUUID(),
      tenantId,
      globalCustomerId,
      normalizeOptionalText(props.localCode, MAX_LOCAL_CODE_LENGTH),
      normalizeOptionalText(props.notes, MAX_NOTES_LENGTH),
      normalizeOptionalText(props.internalNotes, MAX_NOTES_LENGTH),
      props.defaultBranchId ?? null,
      normalizeTags(props.tags ?? []),
      props.marketingOptIn ?? false,
      props.preferredContactChannel ?? null,
    );
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    globalCustomerId: string;
    localCode: string | null;
    notes: string | null;
    internalNotes: string | null;
    defaultBranchId: string | null;
    tags: string[];
    marketingOptIn: boolean;
    preferredContactChannel: PreferredContactChannel | null;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): TenantCustomer {
    return new TenantCustomer(
      props.id,
      props.tenantId,
      props.globalCustomerId,
      props.localCode,
      props.notes,
      props.internalNotes,
      props.defaultBranchId,
      [...props.tags],
      props.marketingOptIn,
      props.preferredContactChannel,
      props.deletedAt,
      props.deletedById,
      props.deleteReason,
    );
  }

  get localCode(): string | null {
    return this._localCode;
  }

  get notes(): string | null {
    return this._notes;
  }

  get internalNotes(): string | null {
    return this._internalNotes;
  }

  get defaultBranchId(): string | null {
    return this._defaultBranchId;
  }

  get tags(): readonly string[] {
    return this._tags;
  }

  get marketingOptIn(): boolean {
    return this._marketingOptIn;
  }

  get preferredContactChannel(): PreferredContactChannel | null {
    return this._preferredContactChannel;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get deletedById(): string | null {
    return this._deletedById;
  }

  get deleteReason(): string | null {
    return this._deleteReason;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  updateProfile(props: Partial<TenantCustomerLinkProps>): void {
    if (this.isDeleted) {
      throw new DomainError('CUSTOMER_DELETED');
    }

    if (props.localCode !== undefined) {
      this._localCode = normalizeOptionalText(props.localCode, MAX_LOCAL_CODE_LENGTH);
    }
    if (props.notes !== undefined) {
      this._notes = normalizeOptionalText(props.notes, MAX_NOTES_LENGTH);
    }
    if (props.internalNotes !== undefined) {
      this._internalNotes = normalizeOptionalText(props.internalNotes, MAX_NOTES_LENGTH);
    }
    if (props.defaultBranchId !== undefined) {
      this._defaultBranchId = props.defaultBranchId;
    }
    if (props.tags !== undefined) {
      this._tags = normalizeTags(props.tags);
    }
    if (props.marketingOptIn !== undefined) {
      this._marketingOptIn = props.marketingOptIn;
    }
    if (props.preferredContactChannel !== undefined) {
      this._preferredContactChannel = props.preferredContactChannel;
    }
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this._deletedAt !== null) {
      throw new DomainError('ALREADY_DELETED');
    }
    this._deletedAt = new Date();
    this._deletedById = deletedById;
    this._deleteReason = reason?.trim() || null;
  }

  restore(): void {
    if (this._deletedAt === null) {
      throw new DomainError('NOT_DELETED');
    }
    this._deletedAt = null;
    this._deletedById = null;
    this._deleteReason = null;
  }
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeTags(tags: string[]): string[] {
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (normalized.length > MAX_TAGS) {
    throw new DomainError('TOO_MANY_TAGS');
  }
  for (const tag of normalized) {
    if (tag.length > MAX_TAG_LENGTH) {
      throw new DomainError('TAG_TOO_LONG');
    }
  }
  return normalized;
}
