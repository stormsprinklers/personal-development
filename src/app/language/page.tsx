import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { starterPrompts } from "@/lib/mock-data";

export default function LanguagePage() {
  return (
    <AppShell
      title="Language Practice"
      description="Develop vocabulary, listening, writing, and speaking confidence."
    >
      <SectionCard
        title="Practice Session Template"
        subtitle="A simple structure for consistent language practice."
      >
        <ul className="grid gap-2 text-sm text-zinc-700">
          {starterPrompts.language.map((item) => (
            <li key={item} className="rounded-lg border border-zinc-200 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </AppShell>
  );
}
