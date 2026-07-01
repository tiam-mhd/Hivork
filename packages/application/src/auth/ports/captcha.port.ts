export type CaptchaVerifyResult =
  | { success: true }
  | { success: false; errorCodes: string[] };

export interface ICaptchaVerifier {
  verify(token: string, remoteIp?: string): Promise<CaptchaVerifyResult>;
}
