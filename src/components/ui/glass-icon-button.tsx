"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
};

export function GlassIconButton({ children, label, className = "", ...props }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`glass-button inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ios-label shadow-sm ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
