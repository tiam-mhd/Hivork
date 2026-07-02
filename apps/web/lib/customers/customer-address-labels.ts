export type CustomerAddressLabel = 'home' | 'work' | 'billing' | 'other';

export const CUSTOMER_ADDRESS_LABEL_OPTIONS: Array<{
  value: CustomerAddressLabel;
  label: string;
}> = [
  { value: 'home', label: 'منزل' },
  { value: 'work', label: 'محل کار' },
  { value: 'billing', label: 'صورتحساب' },
  { value: 'other', label: 'سایر' },
];

export function customerAddressLabelText(label: CustomerAddressLabel): string {
  return CUSTOMER_ADDRESS_LABEL_OPTIONS.find((item) => item.value === label)?.label ?? label;
}
