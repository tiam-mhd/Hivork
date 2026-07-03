'use client';

type InstallmentSectionPlaceholderProps = {
  title: string;
  description: string;
};

export function InstallmentSectionPlaceholder({
  title,
  description,
}: InstallmentSectionPlaceholderProps) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card/40 p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
