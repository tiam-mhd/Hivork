import { randomUUID } from 'node:crypto';

import { DomainError } from '../../errors/domain.error.js';

export type PreferredContactChannel = 'telegram' | 'bale' | 'sms' | 'phone';
export type TenantCustomerStatus = 'active' | 'archived' | 'blacklisted';

export type TenantCustomerLinkProps = {
  localCode?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  defaultBranchId?: string | null;
  tags?: string[];
  marketingOptIn?: boolean;
  preferredContactChannel?: PreferredContactChannel | null;
  categoryId?: string | null;
  assignedStaffId?: string | null;
};

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;
const MAX_LOCAL_CODE_LENGTH = 50;
const MAX_NOTES_LENGTH = 1000;
const MAX_BLACKLIST_REASON_LENGTH = 500;

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
    private _categoryId: string | null = null,
    private _status: TenantCustomerStatus = 'active',
    private _isBlacklisted: boolean = false,
    private _blacklistReason: string | null = null,
    private _blacklistedAt: Date | null = null,
    private _blacklistedById: string | null = null,
    private _archivedAt: Date | null = null,
    private _archivedById: string | null = null,
    private _assignedStaffId: string | null = null,
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
      null,
      null,
      null,
      props.categoryId ?? null,
      'active',
      false,
      null,
      null,
      null,
      null,
      null,
      props.assignedStaffId ?? null,
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
    categoryId?: string | null;
    status?: TenantCustomerStatus;
    isBlacklisted?: boolean;
    blacklistReason?: string | null;
    blacklistedAt?: Date | null;
    blacklistedById?: string | null;
    archivedAt?: Date | null;
    archivedById?: string | null;
    assignedStaffId?: string | null;
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
      props.categoryId ?? null,
      props.status ?? 'active',
      props.isBlacklisted ?? false,
      props.blacklistReason ?? null,
      props.blacklistedAt ?? null,
      props.blacklistedById ?? null,
      props.archivedAt ?? null,
      props.archivedById ?? null,
      props.assignedStaffId ?? null,
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

  get categoryId(): string | null {
    return this._categoryId;
  }

  get status(): TenantCustomerStatus {
    return this._status;
  }

  get isBlacklisted(): boolean {
    return this._isBlacklisted;
  }

  get blacklistReason(): string | null {
    return this._blacklistReason;
  }

  get blacklistedAt(): Date | null {
    return this._blacklistedAt;
  }

  get blacklistedById(): string | null {
    return this._blacklistedById;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  get archivedById(): string | null {
    return this._archivedById;
  }

  get assignedStaffId(): string | null {
    return this._assignedStaffId;
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

  get isArchived(): boolean {
    return this._archivedAt !== null;
  }

  get isActiveForDefaultListing(): boolean {
    return !this.isDeleted && this._status === 'active';
  }

  updateProfile(props: Partial<TenantCustomerLinkProps>): void {
    this.assertNotDeleted();
    if (this.isArchived) {
      throw new DomainError('CUSTOMER_ARCHIVED');
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
    if (props.categoryId !== undefined) {
      this._categoryId = props.categoryId;
    }
    if (props.assignedStaffId !== undefined) {
      this._assignedStaffId = props.assignedStaffId;
    }
  }

  archive(archivedById: string): void {
    this.assertNotDeleted();
    if (this.isArchived) {
      throw new DomainError('ALREADY_ARCHIVED');
    }
    const now = new Date();
    this._archivedAt = now;
    this._archivedById = archivedById;
    if (!this._isBlacklisted) {
      this._status = 'archived';
    }
  }

  unarchive(): void {
    if (!this.isArchived) {
      throw new DomainError('NOT_ARCHIVED');
    }
    this._archivedAt = null;
    this._archivedById = null;
    this._status = this._isBlacklisted ? 'blacklisted' : 'active';
  }

  blacklist(reason: string, blacklistedById: string | null): void {
    this.assertNotDeleted();
    const normalizedReason = normalizeRequiredText(reason, MAX_BLACKLIST_REASON_LENGTH);
    const now = new Date();
    this._isBlacklisted = true;
    this._blacklistReason = normalizedReason;
    this._blacklistedAt = now;
    this._blacklistedById = blacklistedById;
    this._status = 'blacklisted';
  }

  removeBlacklist(): void {
    if (!this._isBlacklisted) {
      throw new DomainError('NOT_BLACKLISTED');
    }
    this._isBlacklisted = false;
    this._blacklistReason = null;
    this._blacklistedAt = null;
    this._blacklistedById = null;
    this._status = this.isArchived ? 'archived' : 'active';
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

  private assertNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainError('CUSTOMER_DELETED');
    }
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

function normalizeRequiredText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
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
