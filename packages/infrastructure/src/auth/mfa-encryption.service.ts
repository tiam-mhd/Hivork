import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { IMfaEncryptionPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class MfaEncryptionService implements IMfaEncryptionPort {
  private readonly key: Buffer;

  constructor(encryptionKeyBase64: string) {
    this.key = parseMfaEncryptionKey(encryptionKeyBase64);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid MFA ciphertext format');
    }

    const [ivB64, tagB64, dataB64] = parts as [string, string, string];
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}

export function parseMfaEncryptionKey(raw: string): Buffer {
  const key = Buffer.from(raw.trim(), 'base64');
  if (key.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)');
  }
  return key;
}
