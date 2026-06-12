import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** When false, skip bottom hairline (use on last row). */
  hairline?: boolean;
};

export function GroupedRow({ children, className = "", hairline = true }: Props) {
  return (
    <div
      className={`min-w-0 bg-ios-surface px-4 py-3 ${hairline ? "ios-hairline ios-hairline-last" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
