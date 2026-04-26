type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-sky-200/70 bg-white p-4 shadow-sm shadow-sky-100/40">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
