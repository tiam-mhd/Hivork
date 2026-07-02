import type { ContractAttachmentRecord } from '../../ports/contract-attachment.repository.port.js';
import type { ContractCollateralRecord } from '../../ports/contract-collateral.repository.port.js';
import type { ContractGuarantorRecord } from '../../ports/contract-guarantor.repository.port.js';
import type {
  ContractVersionChangeType,
  ContractVersionRecord,
} from '../../ports/contract-version.repository.port.js';

const CHANGE_TYPE_TO_DTO: Record<ContractVersionChangeType, string> = {
  CREATE: 'create',
  UPDATE: 'update',
  EXTEND: 'extend',
  COPY_SOURCE: 'copy_source',
  TERMINATE: 'terminate',
  CLOSE: 'close',
  FINANCIAL_RECALC: 'financial_recalc',
};

const ATTACHMENT_TYPE_TO_DTO: Record<ContractAttachmentRecord['attachmentType'], string> = {
  CONTRACT_SCAN: 'contract_scan',
  SIGNED_CONTRACT: 'signed_contract',
  IDENTITY_DOC: 'identity_doc',
  COLLATERAL_DOC: 'collateral_doc',
  OTHER: 'other',
};

const GUARANTOR_RELATIONSHIP_TO_DTO: Record<ContractGuarantorRecord['relationship'], string> = {
  PARENT: 'parent',
  SPOUSE: 'spouse',
  SIBLING: 'sibling',
  EMPLOYER: 'employer',
  OTHER: 'other',
};

const COLLATERAL_TYPE_TO_DTO: Record<ContractCollateralRecord['collateralType'], string> = {
  CHEQUE: 'cheque',
  PROMISSORY_NOTE: 'promissory_note',
  GOLD: 'gold',
  VEHICLE: 'vehicle',
  PROPERTY: 'property',
  CASH_DEPOSIT: 'cash_deposit',
  OTHER: 'other',
};

const COLLATERAL_STATUS_TO_DTO: Record<ContractCollateralRecord['status'], string> = {
  PLEDGED: 'pledged',
  RELEASED: 'released',
  FORFEITED: 'forfeited',
};

export const GUARANTOR_RELATIONSHIP_FROM_DTO = {
  parent: 'PARENT',
  spouse: 'SPOUSE',
  sibling: 'SIBLING',
  employer: 'EMPLOYER',
  other: 'OTHER',
} as const;

export const COLLATERAL_TYPE_FROM_DTO = {
  cheque: 'CHEQUE',
  promissory_note: 'PROMISSORY_NOTE',
  gold: 'GOLD',
  vehicle: 'VEHICLE',
  property: 'PROPERTY',
  cash_deposit: 'CASH_DEPOSIT',
  other: 'OTHER',
} as const;

export function mapContractVersionToDto(version: ContractVersionRecord) {
  return {
    id: version.id,
    saleId: version.saleId,
    versionNumber: version.versionNumber,
    changeType: CHANGE_TYPE_TO_DTO[version.changeType],
    changeReason: version.changeReason,
    createdAt: version.createdAt.toISOString(),
    createdById: version.createdById,
  };
}

export function mapContractVersionDetailToDto(version: ContractVersionRecord) {
  return {
    ...mapContractVersionToDto(version),
    snapshot: version.snapshot,
  };
}

export function mapContractAttachmentToDto(attachment: ContractAttachmentRecord) {
  return {
    id: attachment.id,
    saleId: attachment.saleId,
    fileId: attachment.fileId,
    attachmentType: ATTACHMENT_TYPE_TO_DTO[attachment.attachmentType],
    label: attachment.label,
    description: attachment.description,
    sortOrder: attachment.sortOrder,
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
    version: attachment.version,
    createdById: attachment.createdById,
  };
}

export function mapContractGuarantorToDto(guarantor: ContractGuarantorRecord) {
  return {
    id: guarantor.id,
    saleId: guarantor.saleId,
    tenantCustomerId: guarantor.tenantCustomerId,
    fullName: guarantor.fullName,
    nationalId: guarantor.nationalId,
    phone: guarantor.phone,
    relationship: GUARANTOR_RELATIONSHIP_TO_DTO[guarantor.relationship],
    note: guarantor.note,
    sortOrder: guarantor.sortOrder,
    createdAt: guarantor.createdAt.toISOString(),
    updatedAt: guarantor.updatedAt.toISOString(),
    version: guarantor.version,
    createdById: guarantor.createdById,
  };
}

export function mapContractCollateralToDto(collateral: ContractCollateralRecord) {
  return {
    id: collateral.id,
    saleId: collateral.saleId,
    collateralType: COLLATERAL_TYPE_TO_DTO[collateral.collateralType],
    title: collateral.title,
    description: collateral.description,
    estimatedValueRial: collateral.estimatedValueRial.toString(),
    documentFileId: collateral.documentFileId,
    registrationNumber: collateral.registrationNumber,
    issuedAt: collateral.issuedAt
      ? collateral.issuedAt.toISOString().slice(0, 10)
      : null,
    status: COLLATERAL_STATUS_TO_DTO[collateral.status],
    sortOrder: collateral.sortOrder,
    createdAt: collateral.createdAt.toISOString(),
    updatedAt: collateral.updatedAt.toISOString(),
    version: collateral.version,
    createdById: collateral.createdById,
  };
}

export const ENTERPRISE_STATUS_TO_PRISMA = {
  active: 'ACTIVE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  terminated: 'TERMINATED',
  closed: 'CLOSED',
  archived: 'ARCHIVED',
} as const;

export type EnterpriseSaleStatusDto = keyof typeof ENTERPRISE_STATUS_TO_PRISMA;
