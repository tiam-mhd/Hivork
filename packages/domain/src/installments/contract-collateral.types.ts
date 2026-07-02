export type CollateralType =
  | 'CHEQUE'
  | 'PROMISSORY_NOTE'
  | 'GOLD'
  | 'VEHICLE'
  | 'PROPERTY'
  | 'CASH_DEPOSIT'
  | 'OTHER';

export type CollateralStatus = 'PLEDGED' | 'RELEASED' | 'FORFEITED';

export type ContractCollateralProps = {
  id: string;
  tenantId: string;
  saleId: string;
  collateralType: CollateralType;
  title: string;
  description: string | null;
  estimatedValueRial: bigint;
  documentFileId: string | null;
  registrationNumber: string | null;
  issuedAt: Date | null;
  status: CollateralStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
};

export type CreateContractCollateralInput = {
  tenantId: string;
  saleId: string;
  collateralType: CollateralType;
  title: string;
  description?: string | null;
  estimatedValueRial: bigint;
  documentFileId?: string | null;
  registrationNumber?: string | null;
  issuedAt?: Date | null;
  sortOrder?: number;
  createdById: string;
  metadata?: Record<string, unknown>;
};
