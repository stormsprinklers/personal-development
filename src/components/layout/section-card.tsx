import { GroupedSection } from "@/components/ui/grouped-section";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return <GroupedSection title={title}>{children}</GroupedSection>;
}
