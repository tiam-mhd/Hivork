export const DEFAULT_BRANCH_NAME = 'شعبه اصلی';
export const STARTER_PLAN_CODE = 'starter';
export const TRIAL_DAYS = 14;

export const CORE_SETTING_DEFAULTS = [
  { module: 'core', key: 'timezone', value: 'Asia/Tehran' },
  { module: 'core', key: 'display_currency', value: 'toman' },
  { module: 'core', key: 'default_branch_required', value: true },
] as const;
