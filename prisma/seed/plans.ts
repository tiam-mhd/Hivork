export const SEED_PLANS = [
  {
    code: 'starter',
    name: 'استارتر',
    modules: ['installments'],
    maxCustomers: 500,
    maxStaff: 5,
    maxBranches: 2,
    priceRial: 0n,
  },
  {
    code: 'pro',
    name: 'حرفه‌ای',
    modules: ['installments'],
    maxCustomers: 5_000,
    maxStaff: 25,
    maxBranches: 10,
    priceRial: 500_000_000n,
  },
  {
    code: 'enterprise',
    name: 'سازمانی',
    modules: ['installments'],
    maxCustomers: 999_999,
    maxStaff: 999,
    maxBranches: 999,
    priceRial: 2_000_000_000n,
  },
] as const;

export const CORE_SETTING_DEFAULTS = [
  { module: 'core', key: 'timezone', value: 'Asia/Tehran' },
  { module: 'core', key: 'display_currency', value: 'toman' },
  { module: 'core', key: 'default_branch_required', value: true },
] as const;
