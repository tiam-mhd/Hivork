'use client';

type DataTableEmptyProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function DataTableEmpty({ title, description, action }: DataTableEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
