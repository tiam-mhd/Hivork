export type UserAuthRecord = {
  id: string;
  phone: string;
  name: string | null;
  status: 'active' | 'suspended';
  lastLoginAt: Date | null;
};

export type PhoneConflictKind = 'available' | 'same' | 'staff_user' | 'customer_only';

export interface IUserRepository {
  findByPhone(phone: string): Promise<UserAuthRecord | null>;
  findById(id: string): Promise<UserAuthRecord | null>;
  findOrCreateByPhone(phone: string, name?: string): Promise<UserAuthRecord>;
  updateLastLoginAt(userId: string): Promise<void>;
  recordUserLogin(userId: string, input: { ipAddress?: string; at: Date }): Promise<void>;
  updatePhone(userId: string, newPhone: string): Promise<void>;
  getPhoneConflict(newPhone: string, excludeUserId: string): Promise<PhoneConflictKind>;
  hasActiveStaffMembership(userId: string): Promise<boolean>;
  pseudonymizePhone(userId: string): Promise<void>;
}
