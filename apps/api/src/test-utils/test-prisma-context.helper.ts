import { prismaRequestStorage } from '@hivork/infrastructure';

/** Bypass soft-delete / tenant filters while seeding integration-test fixtures. */
export function runTestSeed<T>(fn: () => Promise<T>): Promise<T> {
  return prismaRequestStorage.run(
    {
      tenantId: '',
      staffId: '',
      activeBranchId: null,
      primaryBranchId: null,
      effectiveBranchIds: [],
      bypassSoftDelete: true,
    },
    fn,
  );
}
