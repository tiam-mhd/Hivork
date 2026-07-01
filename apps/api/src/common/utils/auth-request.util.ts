import type { Request } from 'express';

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

export function readBranchHeader(request: Request): string | null {
  const value = request.headers['x-branch-id'];
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return value.trim();
}
