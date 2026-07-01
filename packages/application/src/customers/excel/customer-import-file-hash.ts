import { createHash } from 'node:crypto';

export function hashCustomerImportFile(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
