"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "destructive";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "glass-button-tint text-white shadow-sm shadow-ios-tint/20",
  secondary: "glass-button text-ios-label",
  destructive: "glass-button ios-elevated border border-copper/30 bg-copper/10 text-copper",
};

export function GlassButton({ variant = "secondary", className = "", children, ...props }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
