import type { ReactNode } from "react";

type Props = {
  title?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
};

export function GroupedSection({ title, footer, children, className = "" }: Props) {
  return (
    <section className={`min-w-0 ${className}`}>
      {title ? (
        <h2 className="ios-headline mb-2 px-1">{title}</h2>
      ) : null}
      <div className="overflow-hidden rounded-xl bg-ios-surface shadow-sm shadow-black/[0.04]">{children}</div>
      {footer ? <p className="ios-footnote mt-2 px-4">{footer}</p> : null}
    </section>
  );
}
