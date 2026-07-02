import { z } from 'zod';

import { customerValidationMessages } from './customer-validation-messages.js';

const IRAN_LATITUDE_MIN = 25;
const IRAN_LATITUDE_MAX = 40;
const IRAN_LONGITUDE_MIN = 44;
const IRAN_LONGITUDE_MAX = 64;

function isWithinIranBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= IRAN_LATITUDE_MIN &&
    latitude <= IRAN_LATITUDE_MAX &&
    longitude >= IRAN_LONGITUDE_MIN &&
    longitude <= IRAN_LONGITUDE_MAX
  );
}

function coordinatesArePaired(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  const hasLat = latitude !== null && latitude !== undefined;
  const hasLng = longitude !== null && longitude !== undefined;
  return hasLat === hasLng;
}

type AddressLike = {
  isPrimary?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};
type EmergencyContactLike = { isPrimary?: boolean };
type ContactPhoneLike = { phone: string };

export function refineAddressCoordinates(address: AddressLike, ctx: z.RefinementCtx, pathPrefix: (string | number)[]): void {
  const { latitude, longitude } = address;

  if (!coordinatesArePaired(latitude, longitude)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: customerValidationMessages.coordinatesUnpaired,
      path: [...pathPrefix, 'latitude'],
    });
    return;
  }

  if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
    if (!isWithinIranBounds(latitude, longitude)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: customerValidationMessages.coordinateOutOfIran,
        path: [...pathPrefix, 'latitude'],
      });
    }
  }
}

export function refineSinglePrimaryAddress<T extends { addresses?: AddressLike[] }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (!data.addresses?.length) {
    return;
  }

  const primaryCount = data.addresses.filter((item) => item.isPrimary === true).length;
  if (primaryCount > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: customerValidationMessages.multiplePrimaryAddresses,
      path: ['addresses'],
    });
  }

  data.addresses.forEach((address, index) => {
    refineAddressCoordinates(address, ctx, ['addresses', index]);
  });
}

export function refineSinglePrimaryEmergencyContact<T extends { emergencyContacts?: EmergencyContactLike[] }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (!data.emergencyContacts?.length) {
    return;
  }

  const primaryCount = data.emergencyContacts.filter((item) => item.isPrimary === true).length;
  if (primaryCount > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: customerValidationMessages.multiplePrimaryEmergencyContacts,
      path: ['emergencyContacts'],
    });
  }
}

export function refineContactPhones<T extends { contactPhones?: ContactPhoneLike[]; phone?: string }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (!data.contactPhones?.length) {
    return;
  }

  const phones = data.contactPhones.map((item) => item.phone);
  if (new Set(phones).size !== phones.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: customerValidationMessages.duplicateSecondaryPhone,
      path: ['contactPhones'],
    });
  }

  if (data.phone) {
    const primary = data.phone;
    if (phones.some((phone) => phone === primary)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: customerValidationMessages.secondaryEqualsPrimary,
        path: ['contactPhones'],
      });
    }
  }
}

export function refineBlacklistFields<T extends { isBlacklisted?: boolean; blacklistReason?: string | null }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (data.isBlacklisted && !data.blacklistReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: customerValidationMessages.blacklistReasonRequired,
      path: ['blacklistReason'],
    });
  }
}
