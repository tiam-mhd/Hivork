import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { IFileStoragePort, UploadFileInput } from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';

type SignedDownloadPayload = {
  key: string;
  exp: number;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

@Injectable()
export class LocalFileStorageService implements IFileStoragePort {
  private readonly rootPath: string;
  private readonly signingSecret: string;
  private readonly publicApiBaseUrl: string;

  constructor(options: {
    rootPath: string;
    signingSecret: string;
    publicApiBaseUrl: string;
  }) {
    this.rootPath = resolve(options.rootPath);
    this.signingSecret = options.signingSecret;
    this.publicApiBaseUrl = options.publicApiBaseUrl.replace(/\/$/, '');
  }

  async upload(input: UploadFileInput): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(input.key);

    try {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, input.body);
    } catch {
      throw new ApplicationError(
        'STORAGE_ERROR',
        'File could not be stored. Please try again later.',
        503,
      );
    }
  }

  async getSignedDownloadUrl(key: string, ttlSeconds: number): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const token = this.signToken({ key, exp });
    return `${this.publicApiBaseUrl}/api/v1/files/signed-download?token=${encodeURIComponent(token)}`;
  }

  async deleteObject(key: string): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(key);
    try {
      await rm(absolutePath, { force: true });
    } catch {
      // best-effort cleanup
    }
  }

  resolveAbsolutePath(key: string): string {
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolute = resolve(this.rootPath, normalized);
    if (!absolute.startsWith(this.rootPath)) {
      throw new ApplicationError('STORAGE_ERROR', 'Invalid storage key.', 503);
    }
    return absolute;
  }

  signToken(payload: SignedDownloadPayload): string {
    const body = encodeBase64Url(JSON.stringify(payload));
    const signature = createHmac('sha256', this.signingSecret).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  verifyToken(token: string): SignedDownloadPayload {
    const [body, signature] = token.split('.');
    if (!body || !signature) {
      throw new ApplicationError('INVALID_DOWNLOAD_TOKEN', 'Download link is invalid.', 401);
    }

    const expected = createHmac('sha256', this.signingSecret).update(body).digest('base64url');
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new ApplicationError('INVALID_DOWNLOAD_TOKEN', 'Download link is invalid.', 401);
    }

    let payload: SignedDownloadPayload;
    try {
      payload = JSON.parse(decodeBase64Url(body)) as SignedDownloadPayload;
    } catch {
      throw new ApplicationError('INVALID_DOWNLOAD_TOKEN', 'Download link is invalid.', 401);
    }

    if (!payload.key || typeof payload.exp !== 'number') {
      throw new ApplicationError('INVALID_DOWNLOAD_TOKEN', 'Download link is invalid.', 401);
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new ApplicationError('DOWNLOAD_EXPIRED', 'Download link has expired.', 410);
    }

    return payload;
  }

  createNonceToken(): string {
    return randomBytes(16).toString('hex');
  }
}
