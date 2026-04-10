import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

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
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [positionBeforeMaximize, setPositionBeforeMaximize] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [size, setSize] = useState<{ width: number | null; height: number | null }>({ width: null, height: null });
  const [sizeBeforeMaximize, setSizeBeforeMaximize] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });
  const [maximizeFromRect, setMaximizeFromRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const dragData = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeData = useRef<{
    direction: ResizeDirection;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open || isMaximized || !windowRef.current) {
      return;
    }
    const rect = windowRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(0, (window.innerWidth - rect.width) / 2),
      y: Math.max(0, (window.innerHeight - rect.height) / 2),
    });
  }, [open, isMaximized]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (resizeData.current && event.buttons === 1) {
        const deltaX = event.clientX - resizeData.current.startX;
        const deltaY = event.clientY - resizeData.current.startY;
        const hasWest = resizeData.current.direction.includes("w");
        const hasEast = resizeData.current.direction.includes("e");
        const hasNorth = resizeData.current.direction.includes("n");
        const hasSouth = resizeData.current.direction.includes("s");
        let nextWidth = resizeData.current.baseWidth;
        let nextHeight = resizeData.current.baseHeight;
        let nextX = resizeData.current.baseX;
        let nextY = resizeData.current.baseY;
        if (hasEast) {
          nextWidth = Math.max(1, resizeData.current.baseWidth + deltaX);
        }
        if (hasWest) {
          nextWidth = Math.max(1, resizeData.current.baseWidth - deltaX);
          nextX = resizeData.current.baseX + (resizeData.current.baseWidth - nextWidth);
        }
        if (hasSouth) {
          nextHeight = Math.max(1, resizeData.current.baseHeight + deltaY);
        }
        if (hasNorth) {
          nextHeight = Math.max(1, resizeData.current.baseHeight - deltaY);
          nextY = resizeData.current.baseY + (resizeData.current.baseHeight - nextHeight);
        }
        setSize({ width: nextWidth, height: nextHeight });
        setPosition({ x: nextX, y: nextY });
        return;
      }
      if (resizeData.current && event.buttons !== 1) {
        document.body.classList.remove("disable-text-selection");
        resizeData.current = null;
      }
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
      resizeData.current = null;
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

  useEffect(() => {
    if (!isMaximized || !maximizeFromRect) {
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setMaximizeFromRect(null);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isMaximized, maximizeFromRect]);

  const toggleMaximized = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setPosition(positionBeforeMaximize);
      setSize(sizeBeforeMaximize);
      return;
    }
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setMaximizeFromRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    setPositionBeforeMaximize(position);
    setSizeBeforeMaximize(size);
    setIsMaximized(true);
    resizeData.current = null;
    dragData.current = null;
  };
  const beginDragFromMaximized = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const restoredWidth = Math.max(420, sizeBeforeMaximize.width ?? Math.min(980, Math.floor(viewportWidth * 0.78)));
    const restoredHeight = Math.max(240, sizeBeforeMaximize.height ?? Math.min(760, Math.floor(viewportHeight * 0.78)));
    const cursorRatio = Math.max(0, Math.min(1, event.clientX / Math.max(1, viewportWidth)));
    const nextX = Math.max(0, Math.min(viewportWidth - restoredWidth, event.clientX - restoredWidth * cursorRatio));
    const nextY = Math.max(0, Math.min(viewportHeight - restoredHeight, event.clientY - 18));
    setIsMaximized(false);
    setSize({ width: restoredWidth, height: restoredHeight });
    setPosition({ x: nextX, y: nextY });
    dragData.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: nextX,
      baseY: nextY,
    };
    document.body.classList.add("disable-text-selection");
  };
  const beginResize = (direction: ResizeDirection, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isMaximized || !windowRef.current) {
      return;
    }
    event.stopPropagation();
    const rect = windowRef.current.getBoundingClientRect();
    resizeData.current = {
      direction,
      startX: event.clientX,
      startY: event.clientY,
      baseX: position.x,
      baseY: position.y,
      baseWidth: rect.width,
      baseHeight: rect.height,
    };
    document.body.classList.add("disable-text-selection");
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 p-0"
      style={{ zIndex }}
    >
      <div
        ref={windowRef}
        className={`app-window-shell pointer-events-auto ${isMaximized ? "window-maximized" : "window-resizable"} ${closing ? "window-close" : "window-open"} flex flex-col ${className}`}
        style={{
          transform: isMaximized ? "none" : `translate(${position.x}px, ${position.y}px)`,
          width: !isMaximized && size.width !== null ? `${size.width}px` : undefined,
          height: !isMaximized && size.height !== null ? `${size.height}px` : undefined,
          position: isMaximized ? "fixed" : "absolute",
          inset: isMaximized ? "0" : undefined,
          left: !isMaximized ? "0" : undefined,
          top: !isMaximized ? "0" : undefined,
          margin: isMaximized ? 0 : undefined,
          zIndex: isMaximized ? 70 : undefined,
          ...(isMaximized && maximizeFromRect
            ? {
                inset: "auto",
                left: `${maximizeFromRect.left}px`,
                top: `${maximizeFromRect.top}px`,
                width: `${maximizeFromRect.width}px`,
                height: `${maximizeFromRect.height}px`,
              }
            : {}),
          transition: "transform 180ms ease, width 180ms ease, height 180ms ease, left 180ms ease, top 180ms ease",
        }}
        onMouseDown={() => onFocus?.()}
      >
        <div
          className="flex cursor-move items-center justify-between border-b border-white/15 bg-[#222634] px-3 py-2 text-xs text-white"
          onDoubleClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button")) {
              return;
            }
            toggleMaximized();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            const target = event.target as HTMLElement;
            if (target.closest("button")) {
              return;
            }
            if (isMaximized) {
              beginDragFromMaximized(event);
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
            <Button size="sm" variant="subtle" className="cursor-pointer" onClick={toggleMaximized}>
              ⛶ {fullLabel}
            </Button>
            <Button size="sm" variant="subtle" className="cursor-pointer" onClick={onClose}>
              {closeLabel}
            </Button>
          </div>
        </div>
        {children}
        {!isMaximized ? (
          <>
            <div className="absolute left-0 top-0 bottom-0 z-30 w-2 cursor-w-resize" onPointerDown={(event) => beginResize("w", event)} />
            <div className="absolute right-0 top-0 bottom-0 z-30 w-2 cursor-e-resize" onPointerDown={(event) => beginResize("e", event)} />
            <div className="absolute top-0 left-0 right-0 z-30 h-2 cursor-n-resize" onPointerDown={(event) => beginResize("n", event)} />
            <div className="absolute bottom-0 left-0 right-0 z-30 h-2 cursor-s-resize" onPointerDown={(event) => beginResize("s", event)} />
            <div className="absolute left-0 top-0 z-40 h-3 w-3 cursor-nw-resize" onPointerDown={(event) => beginResize("nw", event)} />
            <div className="absolute right-0 top-0 z-40 h-3 w-3 cursor-ne-resize" onPointerDown={(event) => beginResize("ne", event)} />
            <div className="absolute left-0 bottom-0 z-40 h-3 w-3 cursor-sw-resize" onPointerDown={(event) => beginResize("sw", event)} />
            <div className="absolute right-0 bottom-0 z-40 h-3 w-3 cursor-se-resize" onPointerDown={(event) => beginResize("se", event)} />
          </>
        ) : null}
      </div>
    </div>
  );
}
