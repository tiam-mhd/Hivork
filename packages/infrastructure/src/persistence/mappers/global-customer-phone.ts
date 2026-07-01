export const globalCustomerWithPhoneSelect = {
  id: true,
  name: true,
  email: true,
  nationalId: true,
  birthDate: true,
  gender: true,
  address: true,
  status: true,
  user: { select: { phone: true } },
} as const;

export const globalCustomerListSelect = {
  id: true,
  name: true,
  user: { select: { phone: true } },
} as const;

export function resolveGlobalCustomerPhone(globalCustomer: {
  user: { phone: string };
}): string {
  return globalCustomer.user.phone;
}
