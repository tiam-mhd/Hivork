import { randomUUID } from 'node:crypto';

import { DomainError } from '../errors/domain.error.js';
import { MAX_CONTRACT_COLLATERALS_PER_SALE } from './contract-collateral.constants.js';
import type {
  CollateralStatus,
  CollateralType,
  ContractCollateralProps,
  CreateContractCollateralInput,
} from './contract-collateral.types.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_REGISTRATION_NUMBER_LENGTH = 64;

const COLLATERAL_TYPES = new Set<CollateralType>([
  'CHEQUE',
  'PROMISSORY_NOTE',
  'GOLD',
  'VEHICLE',
  'PROPERTY',
  'CASH_DEPOSIT',
  'OTHER',
]);

const PLEDGED: CollateralStatus = 'PLEDGED';
const RELEASED: CollateralStatus = 'RELEASED';
const FORFEITED: CollateralStatus = 'FORFEITED';

export class ContractCollateral {
  private constructor(private props: ContractCollateralProps) {}

  static assertEstimatedValue(estimatedValueRial: bigint): void {
    if (estimatedValueRial <= 0n) {
      throw new DomainError('AMOUNT_INVALID');
    }
  }

  static assertLimit(activeCount: number): void {
    if (activeCount >= MAX_CONTRACT_COLLATERALS_PER_SALE) {
      throw new DomainError('COLLATERAL_LIMIT_EXCEEDED');
    }
  }

  static create(input: CreateContractCollateralInput): ContractCollateral {
    ContractCollateral.assertCollateralType(input.collateralType);
    ContractCollateral.assertEstimatedValue(input.estimatedValueRial);

    const now = new Date();

    return new ContractCollateral({
      id: randomUUID(),
      tenantId: input.tenantId,
      saleId: input.saleId,
      collateralType: input.collateralType,
      title: normalizeTitle(input.title),
      description: normalizeDescription(input.description),
      estimatedValueRial: input.estimatedValueRial,
      documentFileId: input.documentFileId?.trim() || null,
      registrationNumber: normalizeRegistrationNumber(input.registrationNumber),
      issuedAt: input.issuedAt ?? null,
      status: PLEDGED,
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

  static reconstitute(props: ContractCollateralProps): ContractCollateral {
    return new ContractCollateral(props);
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

  get status(): CollateralStatus {
    return this.props.status;
  }

  get title(): string {
    return this.props.title;
  }

  get estimatedValueRial(): bigint {
    return this.props.estimatedValueRial;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  toProps(): ContractCollateralProps {
    return { ...this.props };
  }

  update(props: {
    collateralType?: CollateralType;
    title?: string;
    description?: string | null;
    estimatedValueRial?: bigint;
    documentFileId?: string | null;
    registrationNumber?: string | null;
    issuedAt?: Date | null;
    sortOrder?: number;
    updatedById: string;
  }): void {
    this.assertActive();
    this.assertMutableStatus();

    if (props.collateralType !== undefined) {
      ContractCollateral.assertCollateralType(props.collateralType);
      this.props.collateralType = props.collateralType;
    }

    if (props.title !== undefined) {
      this.props.title = normalizeTitle(props.title);
    }

    if (props.description !== undefined) {
      this.props.description = normalizeDescription(props.description);
    }

    if (props.estimatedValueRial !== undefined) {
      ContractCollateral.assertEstimatedValue(props.estimatedValueRial);
      this.props.estimatedValueRial = props.estimatedValueRial;
    }

    if (props.documentFileId !== undefined) {
      this.props.documentFileId = props.documentFileId?.trim() || null;
    }

    if (props.registrationNumber !== undefined) {
      this.props.registrationNumber = normalizeRegistrationNumber(props.registrationNumber);
    }

    if (props.issuedAt !== undefined) {
      this.props.issuedAt = props.issuedAt;
    }

    if (props.sortOrder !== undefined) {
      this.props.sortOrder = props.sortOrder;
    }

    this.props.updatedById = props.updatedById;
    this.props.updatedAt = new Date();
  }

  release(updatedById: string): void {
    this.assertActive();
    this.assertStatus(PLEDGED, 'INVALID_COLLATERAL_STATUS');

    this.props.status = RELEASED;
    this.props.updatedById = updatedById;
    this.props.updatedAt = new Date();
  }

  forfeit(updatedById: string): void {
    this.assertActive();
    this.assertStatus(PLEDGED, 'INVALID_COLLATERAL_STATUS');

    this.props.status = FORFEITED;
    this.props.updatedById = updatedById;
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
      throw new DomainError('COLLATERAL_DELETED');
    }
  }

  private assertMutableStatus(): void {
    if (this.props.status !== PLEDGED) {
      throw new DomainError('INVALID_COLLATERAL_STATUS');
    }
  }

  private assertStatus(expected: CollateralStatus, code: string): void {
    if (this.props.status !== expected) {
      throw new DomainError(code);
    }
  }

  private static assertCollateralType(value: CollateralType): void {
    if (!COLLATERAL_TYPES.has(value)) {
      throw new DomainError('INVALID_COLLATERAL_TYPE');
    }
  }
}

function normalizeTitle(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError('FIELD_REQUIRED');
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }
  return trimmed;
}

function normalizeDescription(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }

  return trimmed;
}

function normalizeRegistrationNumber(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_REGISTRATION_NUMBER_LENGTH) {
    throw new DomainError('FIELD_TOO_LONG');
  }

  return trimmed;
}
