import { GroupedSection } from "@/components/ui/grouped-section";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Top-right controls (e.g. section reorder arrows). */
  actions?: React.ReactNode;
  /** Use false when section contains multiple separate cards (grey bg visible between them). */
  inset?: boolean;
  /** Set false for drag-and-drop lists inside an inset card. */
  clipInset?: boolean;
};

export function SectionCard({ title, children, actions, inset = true, clipInset = true }: SectionCardProps) {
  return (
    <GroupedSection title={title} actions={actions} inset={inset} clipInset={clipInset}>
      {children}
    </GroupedSection>
  );
}
