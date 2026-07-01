export interface IMfaEncryptionPort {
  encrypt(plain: string): string;
  decrypt(cipherText: string): string;
}
