"use client";

import { memo } from "react";

type DockApp = {
  id: string;
  icon: string;
  onClick: () => void;
};

type HomeDockProps = {
  dockApps: DockApp[];
  hoveredDockIndex: number | null;
  getDockIconScale: (iconIndex: number) => number;
  onHoverDockIndex: (value: number | null) => void;
  onOpenWithLoading: (openAction: () => void) => void;
};

function HomeDockComponent({
  dockApps,
  hoveredDockIndex,
  getDockIconScale,
  onHoverDockIndex,
  onOpenWithLoading,
}: HomeDockProps) {
  return (
    <footer className="flex items-center justify-center pb-4 pt-2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-black/35 px-3 py-2 shadow-xl backdrop-blur-md">
        {dockApps.map((app, index) => (
          <button
            type="button"
            key={app.id}
            aria-label={`Open ${app.id}`}
            onClick={() => {
              if (app.id === "music") {
                onOpenWithLoading(app.onClick);
                return;
              }
              app.onClick();
            }}
            onMouseEnter={() => onHoverDockIndex(index)}
            onMouseLeave={() => onHoverDockIndex(null)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-lg transition duration-200 hover:bg-white/20"
            style={{
              transform: `translateY(${hoveredDockIndex !== null && index === hoveredDockIndex ? "-2px" : "0px"}) scale(${getDockIconScale(index)})`,
            }}
          >
            {app.icon}
          </button>
        ))}
      </div>
    </footer>
  );
}

export const HomeDock = memo(HomeDockComponent);
