export type GlobalCustomerAuthRecord = {
  id: string;
  userId: string;
  phone: string;
  name: string | null;
  status: 'active' | 'suspended';
};

export type GlobalCustomerGender = 'male' | 'female' | 'other' | 'unspecified';
export type PreferredContactChannel = 'telegram' | 'bale' | 'sms' | 'phone';

export type GlobalCustomerDetailRecord = GlobalCustomerAuthRecord & {
  email: string | null;
  nationalId: string | null;
  birthDate: Date | null;
  gender: GlobalCustomerGender | null;
  address: string | null;
  preferredContactChannel: PreferredContactChannel | null;
  marketingOptIn: boolean;
  deletedAt: Date | null;
};

export type GlobalCustomerProfileInput = {
  name?: string | null;
  email?: string | null;
  nationalId?: string | null;
  birthDate?: Date | null;
  gender?: GlobalCustomerGender | null;
  address?: string | null;
  preferredContactChannel?: PreferredContactChannel | null;
  marketingOptIn?: boolean;
};

export interface IGlobalCustomerRepository {
  findByPhone(phone: string): Promise<GlobalCustomerAuthRecord | null>;
  findByUserId(userId: string): Promise<GlobalCustomerAuthRecord | null>;
  findById(id: string): Promise<GlobalCustomerAuthRecord | null>;
  findByPhoneIncludingDeleted(phone: string): Promise<GlobalCustomerDetailRecord | null>;
  create(userId: string, name?: string): Promise<GlobalCustomerAuthRecord>;
  createWithProfile(
    userId: string,
    profile: GlobalCustomerProfileInput,
  ): Promise<GlobalCustomerDetailRecord>;
  updateProfile(id: string, profile: GlobalCustomerProfileInput): Promise<GlobalCustomerDetailRecord>;
  restoreById(id: string): Promise<GlobalCustomerDetailRecord>;
}
