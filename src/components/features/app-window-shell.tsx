import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type AppWindowShellProps = {
  open: boolean;
  closing: boolean;
  title: string;
  fullLabel: string;
  closeLabel: string;
  className: string;
  titleContent?: ReactNode;
  headerContent?: ReactNode;
  zIndex?: number;
  children: ReactNode;
  onFocus?: () => void;
  onClose: () => void;
};

export function AppWindowShell({
  open,
  closing,
  title,
  fullLabel,
  closeLabel,
  className,
  titleContent,
  headerContent,
  zIndex = 20,
  children,
  onFocus,
  onClose,
}: AppWindowShellProps) {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [isExitingFullscreen, setIsExitingFullscreen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragData = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragData.current || event.buttons !== 1) {
        document.body.classList.remove("disable-text-selection");
        dragData.current = null;
        return;
      }
      const deltaX = event.clientX - dragData.current.startX;
      const deltaY = event.clientY - dragData.current.startY;
      setPosition({
        x: dragData.current.baseX + deltaX,
        y: dragData.current.baseY + deltaY,
      });
    };

    const onPointerUp = () => {
      document.body.classList.remove("disable-text-selection");
      dragData.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      document.body.classList.remove("disable-text-selection");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!windowRef.current) {
      return;
    }
    if (!document.fullscreenElement) {
      await windowRef.current.requestFullscreen();
      return;
    }
    setIsExitingFullscreen(true);
    window.setTimeout(async () => {
      await document.exitFullscreen();
      setIsExitingFullscreen(false);
    }, 160);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      <div
        ref={windowRef}
        className={`app-window-shell pointer-events-auto ${isExitingFullscreen ? "fullscreen-exit" : ""} ${closing ? "window-close" : "window-open"} flex flex-col ${className}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onMouseDown={() => onFocus?.()}
      >
        <div
          className="flex cursor-move items-center justify-between border-b border-white/15 bg-[#222634] px-3 py-2 text-xs text-white"
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            const target = event.target as HTMLElement;
            if (target.closest("button")) {
              return;
            }
            dragData.current = {
              startX: event.clientX,
              startY: event.clientY,
              baseX: position.x,
              baseY: position.y,
            };
            document.body.classList.add("disable-text-selection");
          }}
        >
          <div className="flex items-center gap-2">
            {titleContent ?? <span>{title}</span>}
            {headerContent}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="subtle" className="cursor-pointer" onClick={toggleFullscreen}>
              ⛶ {fullLabel}
            </Button>
            <Button size="sm" variant="subtle" className="cursor-pointer" onClick={onClose}>
              {closeLabel}
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
