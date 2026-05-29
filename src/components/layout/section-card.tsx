type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate/45 bg-white p-4 shadow-sm shadow-charcoal/15">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
