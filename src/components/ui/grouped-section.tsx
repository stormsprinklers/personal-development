import type { ReactNode } from "react";

type Props = {
  title?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  /** When true, children share one inset grouped card (lists). When false, grey page bg shows between stacked cards. */
  inset?: boolean;
  /** When false, inset card allows overflow (e.g. drag-and-drop lists). Defaults to true. */
  clipInset?: boolean;
};

export function GroupedSection({
  title,
  footer,
  children,
  className = "",
  actions,
  inset = true,
  clipInset = true,
}: Props) {
  return (
    <section className={`min-w-0 ${className}`}>
      {title || actions ? (
        <div className="mb-2 flex items-start justify-between gap-2 px-1">
          {title ? <h2 className="ios-headline min-w-0 flex-1">{title}</h2> : <span className="flex-1" />}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {inset ? (
        <div className={`ios-card min-w-0 ${clipInset ? "overflow-hidden" : "overflow-x-hidden"}`}>{children}</div>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
      {footer ? <p className="ios-footnote mt-2 px-1">{footer}</p> : null}
    </section>
  );
}
