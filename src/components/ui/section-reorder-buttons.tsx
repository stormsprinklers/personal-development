"use client";

import type { ReactNode } from "react";

type Props = {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="glass-button flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-ios-secondary disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function SectionReorderButtons({ onMoveUp, onMoveDown, canMoveUp, canMoveDown }: Props) {
  return (
    <div className="flex items-center gap-1" data-no-tab-swipe="">
      <ArrowButton label="Move section up" disabled={!canMoveUp} onClick={onMoveUp}>
        ↑
      </ArrowButton>
      <ArrowButton label="Move section down" disabled={!canMoveDown} onClick={onMoveDown}>
        ↓
      </ArrowButton>
    </div>
  );
}
