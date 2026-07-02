/** Read model returned by tenant persistence adapters (TASK-029+ may move to domain). */
export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  status: 'trial' | 'active' | 'suspended';
};

export type TenantDetailRecord = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  taxId: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'trial' | 'active' | 'suspended';
  timezone: string;
  locale: 'fa_IR' | 'en_US';
  enabledModules: string[];
  trialEndsAt: Date | null;
  onboardingCompletedAt: Date | null;
  metadata: unknown | null;
};

export interface ITenantRepository {
  findById(id: string): Promise<TenantRecord | null>;
  findDetailById(id: string): Promise<TenantDetailRecord | null>;
  findBySlug(slug: string): Promise<TenantRecord | null>;
}
