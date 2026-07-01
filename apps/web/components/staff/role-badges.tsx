'use client';

type RoleBadgeProps = {
  code: string;
  name: string;
};

export function RoleBadge({ code, name }: RoleBadgeProps) {
  const isOwner = code === 'owner';

  return (
    <span
      className={
        isOwner
          ? 'inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white'
          : 'inline-flex items-center rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-xs font-medium text-neutral-700'
      }
    >
      {name}
    </span>
  );
}

type RoleBadgesProps = {
  roles: Array<{ code: string; name: string }>;
};

export function RoleBadges({ roles }: RoleBadgesProps) {
  if (roles.length === 0) {
    return <span className="text-neutral-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <RoleBadge key={role.code} code={role.code} name={role.name} />
      ))}
    </div>
  );
}

type BranchChipsProps = {
  labels: string[];
  allBranchesLabel?: string;
};

export function BranchChips({ labels, allBranchesLabel = 'همه شعب' }: BranchChipsProps) {
  if (labels.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
        {allBranchesLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
