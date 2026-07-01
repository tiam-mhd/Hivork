import { createHash } from 'node:crypto';

import { ApplicationError } from '../../errors/application.error.js';
import type { IOtpStore, OtpPurpose } from '../../ports/otp.port.js';
import type {
  IPhoneChangeSessionStore,
  PhoneChangeSession,
} from '../ports/phone-change-session.port.js';

export const CHANGE_PHONE_OTP_MAX_ATTEMPTS = 5;

export type ChangePhoneStaffContext = {
  staffId: string;
  tenantId: string;
  userId: string;
  actorStaffId: string;
};

export async function loadPhoneChangeSession(
  sessionStore: IPhoneChangeSessionStore,
  changeSessionId: string,
  context: ChangePhoneStaffContext,
): Promise<PhoneChangeSession> {
  const session = await sessionStore.get(changeSessionId);
  if (!session || session.expiresAt <= new Date()) {
    throw new ApplicationError(
      'AUTH_PHONE_CHANGE_EXPIRED',
      'Phone change session expired. Please start again.',
      401,
    );
  }

  if (session.staffId !== context.staffId || session.userId !== context.userId) {
    throw new ApplicationError(
      'AUTH_PHONE_CHANGE_EXPIRED',
      'Phone change session expired. Please start again.',
      401,
    );
  }

  return session;
}

export async function assertChangePhoneOtpValid(
  otpStore: IOtpStore,
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> {
  const record = await otpStore.get({
    actor: 'staff',
    phone,
    purpose,
  });

  if (!record) {
    throw new ApplicationError('AUTH_OTP_EXPIRED', 'OTP expired or not found.', 400);
  }

  if (record.code !== code) {
    const attempts = record.attempts + 1;
    if (attempts >= CHANGE_PHONE_OTP_MAX_ATTEMPTS) {
      await otpStore.delete({ actor: 'staff', phone, purpose });
      throw new ApplicationError(
        'AUTH_OTP_TOO_MANY_ATTEMPTS',
        'Too many invalid OTP attempts.',
        429,
      );
    }

    await otpStore.update({
      actor: 'staff',
      phone,
      purpose,
      record: { ...record, attempts },
    });
    throw new ApplicationError('AUTH_OTP_INVALID', 'Invalid OTP code.', 400);
  }
}

export async function invalidateStaffOtpsForPhone(
  otpStore: IOtpStore,
  phone: string,
): Promise<void> {
  const purposes: OtpPurpose[] = [
    'login',
    'password_reset',
    'phone_change_current',
    'phone_change_new',
    'mfa_step_up',
  ];

  await Promise.all(
    purposes.map((purpose) =>
      otpStore.delete({ actor: 'staff', phone, purpose }).catch(() => undefined),
    ),
  );
}

export function hashPhoneForAudit(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').slice(0, 16);
}
