export type GuarantorRelationship = 'PARENT' | 'SPOUSE' | 'SIBLING' | 'EMPLOYER' | 'OTHER';

export type ContractGuarantorIdentityInput = {
  tenantCustomerId?: string | null;
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
};

export type ContractGuarantorProps = {
  id: string;
  tenantId: string;
  saleId: string;
  tenantCustomerId: string | null;
  fullName: string | null;
  nationalId: string | null;
  phone: string | null;
  relationship: GuarantorRelationship;
  note: string | null;
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

export type CreateContractGuarantorInput = {
  tenantId: string;
  saleId: string;
  tenantCustomerId?: string | null;
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  relationship: GuarantorRelationship;
  note?: string | null;
  sortOrder?: number;
  createdById: string;
  metadata?: Record<string, unknown>;
};
