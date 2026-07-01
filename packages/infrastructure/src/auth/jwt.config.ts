export type JwtTokenConfig = {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  refreshSessionTtlSeconds: number;
  verifiedTtlSeconds: number;
  mfaPendingTtlSeconds?: number;
  changePasswordTtlSeconds?: number;
  resetTtlSeconds?: number;
};

export function parseJwtTtl(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid JWT TTL format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3_600;
    case 'd':
      return amount * 86_400;
    default:
      throw new Error(`Invalid JWT TTL unit: ${unit}`);
  }
}
