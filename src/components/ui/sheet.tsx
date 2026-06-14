"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sheet({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overscroll-contain bg-black/35 p-0 sm:items-center sm:p-3"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-surface ios-card safe-bottom flex h-[92dvh] max-h-dvh w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:h-auto sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-ios-fill" aria-hidden />
        </div>
        {title ? (
          <div className="shrink-0 border-b border-ios-separator/80 px-4 py-3">
            <h3 className="ios-headline text-center">{title}</h3>
          </div>
        ) : null}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-ios-separator/80 bg-ios-surface/95 px-4 py-3 safe-bottom">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
