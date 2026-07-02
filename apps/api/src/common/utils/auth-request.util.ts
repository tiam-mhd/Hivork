import type { Request } from 'express';

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

/** Bearer header or `access_token` query (SSE / WebSocket cannot set Authorization). */
export function extractAccessToken(request: Request): string | null {
  const bearer = extractBearerToken(request);
  if (bearer) {
    return bearer;
  }
  const queryToken = request.query.access_token;
  if (typeof queryToken === 'string' && queryToken.trim() !== '') {
    return queryToken.trim();
  }
  return null;
}

export function readBranchHeader(request: Request): string | null {
  const value = request.headers['x-branch-id'];
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return value.trim();
}
