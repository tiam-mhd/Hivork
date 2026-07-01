export interface IRegisterRateLimiter {
  checkRegisterRateLimit(clientIp: string): Promise<boolean>;
}
