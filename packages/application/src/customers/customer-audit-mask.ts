const SENSITIVE_KEYS = new Set([
  'nationalId',
  'email',
  'internalNotes',
  'notes',
  'blacklistReason',
]);

function maskNationalId(value: string): string {
  if (value.length < 4) {
    return '****';
  }
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

function maskEmail(value: string): string {
  const at = value.indexOf('@');
  if (at <= 1) {
    return '***@***';
  }
  return `${value[0]}***${value.slice(at)}`;
}

export function maskCustomerAuditValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (key === 'nationalId' && typeof value === 'string') {
    return maskNationalId(value);
  }

  if (key === 'email' && typeof value === 'string') {
    return maskEmail(value);
  }

  if (SENSITIVE_KEYS.has(key) && typeof value === 'string') {
    return '[redacted]';
  }

  return value;
}

export function maskCustomerAuditRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    masked[key] = maskCustomerAuditValue(key, value);
  }
  return masked;
}
