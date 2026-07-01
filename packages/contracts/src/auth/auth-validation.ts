import { z } from 'zod';

export function requireTenantSlugForStaffLogin(
  val: { actor: 'staff' | 'customer'; intent: 'login' | 'register'; tenantSlug?: string },
  ctx: z.RefinementCtx,
): void {
  if (val.actor === 'staff' && val.intent === 'login' && !val.tenantSlug) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tenantSlug required for staff login',
      path: ['tenantSlug'],
    });
  }
}
