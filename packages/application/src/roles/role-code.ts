export const SYSTEM_ROLE_CODES = new Set(['owner', 'manager', 'cashier', 'viewer']);

const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

export function normalizeRoleCode(code: string): string {
  return code.trim().toLowerCase();
}

export function assertValidRoleCode(code: string): void {
  if (!ROLE_CODE_PATTERN.test(code) || code.length < 2 || code.length > 50) {
    throw new Error('INVALID_ROLE_CODE');
  }
}

export function isReservedSystemRoleCode(code: string): boolean {
  return SYSTEM_ROLE_CODES.has(code);
}
