import type { ReactNode } from "react";

type Props = {
  title?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
  /** When true, children share one inset grouped card (lists). When false, grey page bg shows between stacked cards. */
  inset?: boolean;
  /** When false, inset card allows overflow (e.g. drag-and-drop lists). Defaults to true. */
  clipInset?: boolean;
};

export function GroupedSection({ title, footer, children, className = "", inset = true, clipInset = true }: Props) {
  return (
    <section className={`min-w-0 ${className}`}>
      {title ? <h2 className="ios-headline mb-2 px-1">{title}</h2> : null}
      {inset ? (
        <div className={`ios-card ${clipInset ? "overflow-hidden" : "overflow-visible"}`}>{children}</div>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
      {footer ? <p className="ios-footnote mt-2 px-1">{footer}</p> : null}
    </section>
  );
}
