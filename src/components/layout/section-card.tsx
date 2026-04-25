type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-sky-200/70 bg-white p-4 shadow-sm shadow-sky-100/40">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-sky-900/55">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
