/** In-memory auth registry — access token must not be persisted (TASK-101). */

let accessToken: string | null = null;
let activeBranchId: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getActiveBranchId(): string | null {
  return activeBranchId;
}

export function setActiveBranchId(branchId: string | null): void {
  activeBranchId = branchId;
}

export function clearAuthRegistry(): void {
  accessToken = null;
  activeBranchId = null;
}
