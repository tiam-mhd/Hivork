export interface IApiKeyRateLimiterPort {
  checkAndRecord(apiKeyId: string): Promise<boolean>;
}
