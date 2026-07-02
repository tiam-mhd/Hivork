import { randomUUID } from 'node:crypto';

import { normalizePhone } from '../core/shared/phone.js';
import { DomainError } from '../errors/domain.error.js';
import { MAX_CONTRACT_GUARANTORS_PER_SALE } from './contract-guarantor.constants.js';
import type {
  ContractGuarantorIdentityInput,
  ContractGuarantorProps,
  CreateContractGuarantorInput,
  GuarantorRelationship,
} from './contract-guarantor.types.js';

const MAX_NAME_LENGTH = 120;
const MAX_NATIONAL_ID_LENGTH = 10;
const MAX_NOTE_LENGTH = 500;

const GUARANTOR_RELATIONSHIPS = new Set<GuarantorRelationship>([
  'PARENT',
  'SPOUSE',
  'SIBLING',
  'EMPLOYER',
  'OTHER',
]);

export class ContractGuarantor {
  private constructor(private props: ContractGuarantorProps) {}

  static assertIdentity(identity: ContractGuarantorIdentityInput): void {
    const tenantCustomerId = identity.tenantCustomerId?.trim();
    if (tenantCustomerId) {
      return;
    }

    const fullName = identity.fullName?.trim();
    const phone = identity.phone?.trim();

    if (!fullName || !phone) {
      throw new DomainError('GUARANTOR_IDENTITY_REQUIRED');
    }
  }

  static assertLimit(activeCount: number): void {
    if (activeCount >= MAX_CONTRACT_GUARANTORS_PER_SALE) {
      throw new DomainError('GUARANTOR_LIMIT_EXCEEDED');
    }
  }

  static create(input: CreateContractGuarantorInput): ContractGuarantor {
    ContractGuarantor.assertIdentity(input);
    ContractGuarantor.assertRelationship(input.relationship);

    const tenantCustomerId = input.tenantCustomerId?.trim() ?? null;
    const now = new Date();

    let fullName: string | null = null;
    let nationalId: string | null = null;
    let phone: string | null = null;

    if (tenantCustomerId) {
      if (input.fullName?.trim() || input.phone?.trim() || input.nationalId?.trim()) {
        throw new DomainError('GUARANTOR_EXTERNAL_FIELDS_NOT_ALLOWED');
      }
    } else {
      fullName = normalizeFullName(input.fullName!);
      phone = normalizePhone(input.phone!);
      nationalId = normalizeNationalId(input.nationalId);
    }

    return new ContractGuarantor({
      id: randomUUID(),
      tenantId: input.tenantId,
      saleId: input.saleId,
      tenantCustomerId,
      fullName,
      nationalId,
      phone,
      relationship: input.relationship,
      note: normalizeNote(input.note),
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
      createdById: input.createdById,
      updatedById: input.createdById,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      metadata: input.metadata ?? null,
    });
  }

  static reconstitute(props: ContractGuarantorProps): ContractGuarantor {
    return new ContractGuarantor(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get saleId(): string {
    return this.props.saleId;
  }

  get tenantCustomerId(): string | null {
    return this.props.tenantCustomerId;
  }

  get fullName(): string | null {
    return this.props.fullName;
  }

  get nationalId(): string | null {
    return this.props.nationalId;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get relationship(): GuarantorRelationship {
    return this.props.relationship;
  }

  get note(): string | null {
    return this.props.note;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  toProps(): ContractGuarantorProps {
    return { ...this.props };
  }

  update(props: {
    tenantCustomerId?: string | null;
    fullName?: string | null;
    nationalId?: string | null;
    phone?: string | null;
    relationship?: GuarantorRelationship;
    note?: string | null;
    sortOrder?: number;
    updatedById: string;
  }): void {
    this.assertActive();

    const nextIdentity: ContractGuarantorIdentityInput = {
      tenantCustomerId:
        props.tenantCustomerId !== undefined
          ? props.tenantCustomerId
          : this.props.tenantCustomerId,
      fullName: props.fullName !== undefined ? props.fullName : this.props.fullName,
      nationalId: props.nationalId !== undefined ? props.nationalId : this.props.nationalId,
      phone: props.phone !== undefined ? props.phone : this.props.phone,
    };

    ContractGuarantor.assertIdentity(nextIdentity);

    const tenantCustomerId = nextIdentity.tenantCustomerId?.trim() ?? null;

    if (tenantCustomerId) {
      if (
        props.fullName?.trim() ||
        props.phone?.trim() ||
        props.nationalId?.trim()
      ) {
        throw new DomainError('GUARANTOR_EXTERNAL_FIELDS_NOT_ALLOWED');
      }

      this.props.tenantCustomerId = tenantCustomerId;
      this.props.fullName = null;
      this.props.nationalId = null;
      this.props.phone = null;
    } else {
      this.props.tenantCustomerId = null;
      if (props.fullName !== undefined) {
        this.props.fullName =
          props.fullName === null ? null : normalizeFullName(props.fullName);
      }
      if (props.phone !== undefined) {
        this.props.phone = props.phone === null ? null : normalizePhone(props.phone);
      }
      if (props.nationalId !== undefined) {
        this.props.nationalId = normalizeNationalId(props.nationalId);
      }
    }

    if (props.relationship !== undefined) {
      ContractGuarantor.assertRelationship(props.relationship);
      this.props.relationship = props.relationship;
    }

    if (props.note !== undefined) {
      this.props.note = normalizeNote(props.note);
    }

    if (props.sortOrder !== undefined) {
      this.props.sortOrder = props.sortOrder;
    }

    this.props.updatedById = props.updatedById;
    this.props.updatedAt = new Date();
  }

  softDelete(deletedById: string, reason?: string): void {
    if (this.isDeleted) {
      throw new DomainError('ALREADY_DELETED');
    }

    this.props.deletedAt = new Date();
    this.props.deletedById = deletedById;
    this.props.deleteReason = reason?.trim() || null;
    this.props.updatedById = deletedById;
    this.props.updatedAt = new Date();
  }

  private assertActive(): void {
    if (this.isDeleted) {
      throw new DomainError('GUARANTOR_DELETED');
    }
  }

  private static assertRelationship(value: GuarantorRelationship): void {
    if (!GUARANTOR_RELATIONSHIPS.has(value)) {
      throw new DomainError('INVALID_GUARANTOR_RELATIONSHIP');
    }
  }
}

function normalizeFullName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeNationalId(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_NATIONAL_ID_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }

  return trimmed;
}

function normalizeNote(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }

  return trimmed;
}
