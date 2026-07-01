import { describe, expect, it, vi } from 'vitest';

import { PrismaTenantRepository } from './tenant.repository.js';

describe('PrismaTenantRepository', () => {
  it('returns null when tenant is not found', async () => {
    const prisma = {
      tenant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const repository = new PrismaTenantRepository(prisma as never);

    await expect(repository.findById('tenant-id')).resolves.toBeNull();
    await expect(repository.findBySlug('demo')).resolves.toBeNull();
  });
});
