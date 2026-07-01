export type RegisterTenantData = {
  name: string;
  slug: string;
  legalName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  ownerName: string;
  ownerUserId: string;
};

export type RegisterTenantResult = {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  staff: {
    id: string;
    tenantId: string;
    name: string;
    userId: string;
  };
};

export interface ITenantRegistrationRepository {
  isSlugTaken(slug: string): Promise<boolean>;
  register(data: RegisterTenantData): Promise<RegisterTenantResult>;
}
