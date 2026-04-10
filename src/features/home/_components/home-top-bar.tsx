"use client";

import { memo, type RefObject } from "react";

type HomeTopBarProps = {
  theme: "dark" | "light";
  clock: string;
  isClockMenuOpen: boolean;
  clockMenuRef: RefObject<HTMLDivElement | null>;
  menuTimeLabel: string;
  menuDateLabel: string;
  onToggleClockMenu: () => void;
};

function HomeTopBarComponent({
  theme,
  clock,
  isClockMenuOpen,
  clockMenuRef,
  menuTimeLabel,
  menuDateLabel,
  onToggleClockMenu,
}: HomeTopBarProps) {
  return (
    <header
      className={`flex items-center justify-between border-b px-4 py-2 text-xs backdrop-blur-md sm:px-6 ${
        theme === "dark" ? "border-black/20 bg-black/30" : "border-black/10 bg-white/35"
      }`}
    >
      <span className="font-medium">popOS</span>
      <span>pop@desktop: ~</span>
      <div ref={clockMenuRef} className="relative">
        <button
          type="button"
          aria-label="Open clock menu"
          onClick={onToggleClockMenu}
          className={`cursor-pointer rounded-md px-2 py-1 font-medium transition-colors ${
            theme === "dark" ? "hover:bg-white/15" : "hover:bg-black/10"
          }`}
        >
          {clock}
        </button>
        {isClockMenuOpen ? (
          <div
            className={`absolute right-0 top-9 min-w-56 rounded-xl border p-3 text-right shadow-2xl backdrop-blur-md ${
              theme === "dark" ? "border-white/20 bg-[#1c2236]/95 text-white" : "border-black/15 bg-[#f4f0ff]/95 text-[#1d1830]"
            }`}
          >
            <p className={`text-[11px] uppercase tracking-wide ${theme === "dark" ? "text-white/60" : "text-[#5b5372]"}`}>system clock</p>
            <p className="mt-1 text-xl font-semibold">{menuTimeLabel}</p>
            <p className={`mt-1 text-xs capitalize ${theme === "dark" ? "text-white/75" : "text-[#4b4462]"}`}>{menuDateLabel}</p>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export const HomeTopBar = memo(HomeTopBarComponent);
