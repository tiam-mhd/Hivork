export type PermissionOverrideInput = {
  permission: string;
  effect: 'grant' | 'deny';
  expiresAt?: Date | null;
};

export function partitionActiveOverrides(
  overrides: PermissionOverrideInput[],
  now: Date = new Date(),
): { grants: string[]; denies: string[] } {
  const grants: string[] = [];
  const denies: string[] = [];

  for (const override of overrides) {
    if (override.expiresAt && override.expiresAt <= now) {
      continue;
    }

    if (override.effect === 'grant') {
      grants.push(override.permission);
    } else {
      denies.push(override.permission);
    }
  }

  return { grants, denies };
}

export function resolveEffectivePermissions(input: {
  rolePermissions: string[];
  grants?: string[];
  denies?: string[];
  overrides?: PermissionOverrideInput[];
  now?: Date;
}): Set<string> {
  let grants = input.grants ?? [];
  let denies = input.denies ?? [];

  if (input.overrides) {
    const partitioned = partitionActiveOverrides(input.overrides, input.now);
    grants = partitioned.grants;
    denies = partitioned.denies;
  }

  const effective = new Set<string>([...input.rolePermissions, ...grants]);

  for (const denied of denies) {
    effective.delete(denied);
  }

  return effective;
}

export function hasPermission(effective: Set<string>, required: string): boolean {
  return effective.has(required);
}
