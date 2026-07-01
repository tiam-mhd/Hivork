export interface IPermissionRegistry {
  resolvePermissionIds(codes: string[]): Promise<Map<string, string>>;
}
