import type Redis from 'ioredis';

export type DemoShopSession = {
  accessToken: string;
  ownerPhone: string;
};

export async function loginDemoShopOwner(
  redis: Redis,
  request: (path: string, init?: RequestInit & { token?: string }) => Promise<{
    response: Response;
    body: unknown;
  }>,
): Promise<DemoShopSession> {
  const ownerPhone = process.env.SEED_OWNER_PHONE ?? '09120000000';

  await request('/v1/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({
      phone: ownerPhone,
      actor: 'staff',
      intent: 'login',
      tenantSlug: 'demo-shop',
    }),
  });

  const otpRecord = await redis.get(`otp:staff:${ownerPhone}`);
  if (!otpRecord) {
    throw new Error(`OTP not found for demo-shop owner ${ownerPhone}`);
  }

  const code = JSON.parse(otpRecord).code as string;
  const verify = await request('/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      phone: ownerPhone,
      code,
      actor: 'staff',
      intent: 'login',
      tenantSlug: 'demo-shop',
    }),
  });

  if (verify.response.status !== 200) {
    throw new Error(`demo-shop login failed: ${JSON.stringify(verify.body)}`);
  }

  return {
    accessToken: (verify.body as { accessToken: string }).accessToken,
    ownerPhone,
  };
}
