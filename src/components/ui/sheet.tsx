"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/35 p-3 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-surface safe-bottom max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl shadow-black/20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-ios-fill" aria-hidden />
        </div>
        {title ? (
          <div className="border-b border-ios-separator/80 px-4 py-3">
            <h3 className="ios-headline text-center">{title}</h3>
          </div>
        ) : null}
        <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}
