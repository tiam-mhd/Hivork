export const QUICK_ACTION_PERMISSIONS = {
  sale: 'installments.sale.create',
  customer: 'installments.customer.create',
} as const;

export function resolveQuickActionVisibility(hasPermission: (permission: string) => boolean) {
  const showSale = hasPermission(QUICK_ACTION_PERMISSIONS.sale);
  const showCustomer = hasPermission(QUICK_ACTION_PERMISSIONS.customer);
  return {
    showSale,
    showCustomer,
    showAny: showSale || showCustomer,
  };
}
