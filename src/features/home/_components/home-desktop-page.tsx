"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import { FileIconCard } from "@/components/features/file-icon-card";
import { HomeDock } from "@/features/home/_components/home-dock";
import { HomeTopBar } from "@/features/home/_components/home-top-bar";
import { useHomePageController } from "@/features/home/use-home-page-controller";
import type { ExplorerPath } from "@/features/home/types";

const MailerWindow = dynamic(() => import("@/components/features/mailer-window").then((mod) => mod.MailerWindow));
const PdfViewerWindow = dynamic(() => import("@/components/features/pdf-viewer-window").then((mod) => mod.PdfViewerWindow));
const SpotifyWindow = dynamic(() => import("@/components/features/spotify-window").then((mod) => mod.SpotifyWindow));
const TerminalWindow = dynamic(() => import("@/components/features/terminal-window").then((mod) => mod.TerminalWindow));
const TextEditorWindow = dynamic(() => import("@/components/features/text-editor-window").then((mod) => mod.TextEditorWindow));

type HomeDesktopPageProps = {
  initialExplorerPath?: ExplorerPath | null;
};
type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function HomeDesktopPage({ initialExplorerPath = null }: HomeDesktopPageProps) {
  const DESKTOP_ICON_WIDTH = 80;
  const DESKTOP_ICON_HEIGHT = 84;
  const EXPLORER_MIN_WIDTH = 560;
  const EXPLORER_MIN_HEIGHT = 430;
  const EXPLORER_COMPACT_BREAKPOINT = 760;
  const [explorerOffset, setExplorerOffset] = useState({ x: 0, y: 0 });
  const [explorerOffsetBeforeMaximize, setExplorerOffsetBeforeMaximize] = useState({ x: 0, y: 0 });
  const [explorerSize, setExplorerSize] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });
  const [explorerSizeBeforeMaximize, setExplorerSizeBeforeMaximize] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });
  const [explorerMaximizeFromRect, setExplorerMaximizeFromRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [isExplorerMaximized, setIsExplorerMaximized] = useState(false);
  const [isExplorerCompact, setIsExplorerCompact] = useState(false);
  const [isExplorerPlacesMenuOpen, setIsExplorerPlacesMenuOpen] = useState(false);
  const [settingsOffset, setSettingsOffset] = useState({ x: 0, y: 0 });
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isWindowHeaderDragging, setIsWindowHeaderDragging] = useState(false);
  const [selectedDesktopAppIds, setSelectedDesktopAppIds] = useState<string[]>([]);
  const [selectedExplorerItems, setSelectedExplorerItems] = useState<string[]>([]);
  const [desktopSelectionBox, setDesktopSelectionBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [explorerSelectionBox, setExplorerSelectionBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [isHomeTreeOpen, setIsHomeTreeOpen] = useState(false);
  const [isHomeTreeMounted, setIsHomeTreeMounted] = useState(false);
  const [isProjectsTreeOpen, setIsProjectsTreeOpen] = useState(false);
  const [hoveredDockIndex, setHoveredDockIndex] = useState<number | null>(null);
  const [isClockMenuOpen, setIsClockMenuOpen] = useState(false);
  const explorerDrag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const explorerResize = useRef<{
    direction: ResizeDirection;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);
  const settingsDrag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const clockMenuRef = useRef<HTMLDivElement | null>(null);
  const explorerContentRef = useRef<HTMLDivElement | null>(null);
  const desktopSelectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const explorerSelectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const ignoreNextExplorerClickRef = useRef(false);
  const clearIgnoreExplorerClickTimerRef = useRef<number | null>(null);
  const didExplorerMarqueeSelectRef = useRef(false);

  const { actions, helpers, refs, state } = useHomePageController(initialExplorerPath);
  const isHydrated = useSyncExternalStore(
    () => {
      return () => undefined;
    },
    () => true,
    () => false,
  );
  const {
    activePlace,
    clock,
    contextMenu,
    desktopApps,
    draggingId,
    editorContent,
    editorFileId,
    editorFileNameDraft,
    explorerButton,
    explorerContent,
    explorerFrame,
    explorerHeader,
    explorerItemActive,
    explorerItemHover,
    explorerMuted,
    explorerSidebar,
    explorerText,
    githubError,
    githubLoading,
    githubRepos,
    homeTextFiles,
    historyIndex,
    homeView,
    isBooting,
    awaitingBootReveal,
    bootTextFadeOut,
    isDarkTheme,
    isExplorerClosing,
    isExplorerOpen,
    isMailerClosing,
    isMailerOpen,
    isPdfClosing,
    isPdfOpen,
    isSpotifyClosing,
    isSpotifyOpen,
    isTerminalClosing,
    isTerminalOpen,
    isPathFocused,
    isSettingsClosing,
    isSettingsOpen,
    isTextEditorClosing,
    isTextEditorOpen,
    language,
    mailBody,
    mailSender,
    mailSubject,
    pathInput,
    pathSuggestions,
    placeHistory,
    openExplorerPaths,
    progress,
    saveStatusLabel,
    selectedAppId,
    selectedExplorerItem,
    showUnsavedDialog,
    t,
    textFiles,
    textFolderFiles,
    trashFiles,
    theme,
    typedBootLines,
    canShowNewTextButton,
    canEmptyTrash,
    windowZIndices,
  } = state;
  const {
    closeExplorer,
    closeMailer,
    closePdf,
    closeSpotify,
    closeSettings,
    closeTerminal,
    closeTextEditor,
    createTextFile,
    deleteExplorerItems,
    emptyTrash,
    discardAndCloseEditor,
    goForward,
    handleExplorerBack,
    closeExplorerTab,
    openNestedPath,
    openNestedPathInCurrentExplorer,
    openMailer,
    openPdf,
    openPathFromInput,
    openPlace,
    openPlaceInCurrentExplorer,
    openSpotify,
    openTerminal,
    openTextEditor,
    ensureGithubReposLoaded,
    saveAndCloseEditor,
    saveTextFile,
    sendMail,
    setContextMenu,
    beginDesktopDrag,
    setEditorContent,
    setEditorFileNameDraft,
    setIsPathFocused,
    setLanguage,
    setMailBody,
    setMailSender,
    setMailSubject,
    setPathInput,
    setSelectedAppId,
    setSelectedExplorerItem,
    setShowUnsavedDialog,
    setTheme,
    bringWindowToFront,
    completeBoot,
  } = actions;
  const { desktopAreaRef, explorerRef, dragOffset } = refs;
  const { dockApps } = helpers;
  const dateLocale = language === "hr" ? "hr-HR" : "en-US";
  const now = new Date();
  const menuDateLabel = now.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const menuTimeLabel = now.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const textDesktopIcon = desktopApps.find((app) => app.id === "text")?.icon ?? "📝";
  const getDockIconScale = (iconIndex: number) => {
    if (hoveredDockIndex === null) {
      return 1;
    }
    if (iconIndex === hoveredDockIndex) {
      return 1.2;
    }
    if (Math.abs(iconIndex - hoveredDockIndex) === 1) {
      return 1.1;
    }
    return 1;
  };
  const formatExplorerTabLabel = (path: string) => {
    return path
      .split("/")
      .map((part) => {
        if (!part) {
          return part;
        }
        return `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`;
      })
      .join("/");
  };
  const getNormalizedRect = (startX: number, startY: number, endX: number, endY: number) => {
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    return { left, top, width, height };
  };
  const intersects = (
    first: { left: number; top: number; right: number; bottom: number },
    second: { left: number; top: number; right: number; bottom: number },
  ) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
  const openWithLoading = (openAction: () => void) => {
    setIsAppLoading(true);
    window.setTimeout(() => {
      openAction();
      setIsAppLoading(false);
    }, 520);
  };
  const handleExplorerClose = () => {
    closeExplorer();
    window.setTimeout(() => {
      setIsHomeTreeOpen(false);
      setIsHomeTreeMounted(false);
      setIsProjectsTreeOpen(false);
    }, 190);
  };
  const toggleExplorerMaximized = () => {
    if (isExplorerMaximized) {
      setIsExplorerMaximized(false);
      setExplorerOffset(explorerOffsetBeforeMaximize);
      setExplorerSize(explorerSizeBeforeMaximize);
      return;
    }
    if (explorerRef.current) {
      const rect = explorerRef.current.getBoundingClientRect();
      setExplorerMaximizeFromRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    setExplorerOffsetBeforeMaximize(explorerOffset);
    setExplorerSizeBeforeMaximize(explorerSize);
    setIsExplorerMaximized(true);
    explorerDrag.current = null;
    explorerResize.current = null;
    setIsWindowHeaderDragging(false);
  };
  useEffect(() => {
    if (!isExplorerMaximized || !explorerMaximizeFromRect) {
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setExplorerMaximizeFromRect(null);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [explorerMaximizeFromRect, isExplorerMaximized]);

  useEffect(() => {
    if (!isExplorerOpen || isExplorerMaximized || !explorerRef.current) {
      return;
    }
    const rect = explorerRef.current.getBoundingClientRect();
    setExplorerOffset({
      x: Math.max(0, (window.innerWidth - rect.width) / 2),
      y: Math.max(0, (window.innerHeight - rect.height) / 2),
    });
  }, [isExplorerOpen, isExplorerMaximized, explorerRef]);

  useEffect(() => {
    if (!isExplorerOpen || !explorerRef.current) {
      return;
    }
    const updateCompactMode = () => {
      if (!explorerRef.current) {
        return;
      }
      const width = explorerRef.current.getBoundingClientRect().width;
      const compact = width < EXPLORER_COMPACT_BREAKPOINT;
      setIsExplorerCompact(compact);
      if (!compact) {
        setIsExplorerPlacesMenuOpen(false);
      }
    };
    updateCompactMode();
    const observer = new ResizeObserver(updateCompactMode);
    observer.observe(explorerRef.current);
    return () => observer.disconnect();
  }, [isExplorerOpen, EXPLORER_COMPACT_BREAKPOINT, explorerRef]);

  const beginExplorerResize = (direction: ResizeDirection, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isExplorerMaximized || !explorerRef.current) {
      return;
    }
    event.stopPropagation();
    const rect = explorerRef.current.getBoundingClientRect();
    explorerResize.current = {
      direction,
      startX: event.clientX,
      startY: event.clientY,
      baseX: explorerOffset.x,
      baseY: explorerOffset.y,
      baseWidth: rect.width,
      baseHeight: rect.height,
    };
    setIsWindowHeaderDragging(true);
  };
  const beginExplorerDragFromMaximized = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const restoredWidth = Math.max(
      EXPLORER_MIN_WIDTH,
      explorerSizeBeforeMaximize.width ?? Math.min(1100, Math.floor(viewportWidth * 0.82)),
    );
    const restoredHeight = Math.max(
      EXPLORER_MIN_HEIGHT,
      explorerSizeBeforeMaximize.height ?? Math.min(760, Math.floor(viewportHeight * 0.82)),
    );
    const cursorRatio = Math.max(0, Math.min(1, event.clientX / Math.max(1, viewportWidth)));
    const nextX = Math.max(0, Math.min(viewportWidth - restoredWidth, event.clientX - restoredWidth * cursorRatio));
    const nextY = Math.max(0, Math.min(viewportHeight - restoredHeight, event.clientY - 18));
    setIsExplorerMaximized(false);
    setExplorerSize({ width: restoredWidth, height: restoredHeight });
    setExplorerOffset({ x: nextX, y: nextY });
    explorerDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: nextX,
      baseY: nextY,
    };
    setIsWindowHeaderDragging(true);
  };

  useEffect(() => {
    if (activePlace === "home") {
      const openTimer = window.setTimeout(() => {
        setIsHomeTreeMounted(true);
        window.setTimeout(() => setIsHomeTreeOpen(true), 10);
      }, 0);
      return () => window.clearTimeout(openTimer);
    }
    const closeTimer = window.setTimeout(() => {
      setIsHomeTreeOpen(false);
      setIsProjectsTreeOpen(false);
    }, 0);
    const timer = window.setTimeout(() => {
      setIsHomeTreeMounted(false);
    }, 190);
    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(timer);
    };
  }, [activePlace]);
  useEffect(() => {
    if (!isExplorerOpen || activePlace !== "home") {
      return;
    }
    const id = window.setTimeout(() => {
      setIsHomeTreeMounted(true);
      setIsHomeTreeOpen(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [activePlace, isExplorerOpen]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (desktopSelectionStartRef.current && desktopAreaRef.current) {
        const desktopBounds = desktopAreaRef.current.getBoundingClientRect();
        const currentX = event.clientX - desktopBounds.left;
        const currentY = event.clientY - desktopBounds.top;
        const nextBox = getNormalizedRect(desktopSelectionStartRef.current.x, desktopSelectionStartRef.current.y, currentX, currentY);
        setDesktopSelectionBox(nextBox);
        const selectionRect = {
          left: nextBox.left,
          top: nextBox.top,
          right: nextBox.left + nextBox.width,
          bottom: nextBox.top + nextBox.height,
        };
        const nextSelected = desktopApps
          .filter((app) =>
            intersects(selectionRect, {
              left: app.x,
              top: app.y,
              right: app.x + DESKTOP_ICON_WIDTH,
              bottom: app.y + DESKTOP_ICON_HEIGHT,
            }),
          )
          .map((app) => app.id);
        setSelectedDesktopAppIds(nextSelected);
        setSelectedAppId(nextSelected[0] ?? null);
      }
      if (explorerSelectionStartRef.current && explorerContentRef.current) {
        const bounds = explorerContentRef.current.getBoundingClientRect();
        const nextBox = getNormalizedRect(
          explorerSelectionStartRef.current.x,
          explorerSelectionStartRef.current.y,
          event.clientX,
          event.clientY,
        );
        setExplorerSelectionBox({
          left: nextBox.left - bounds.left,
          top: nextBox.top - bounds.top,
          width: nextBox.width,
          height: nextBox.height,
        });
        const selectionRect = {
          left: nextBox.left,
          top: nextBox.top,
          right: nextBox.left + nextBox.width,
          bottom: nextBox.top + nextBox.height,
        };
        const cards = Array.from(explorerContentRef.current.querySelectorAll<HTMLButtonElement>('button[data-file-card="true"]'));
        const nextSelected = cards
          .filter((card) => {
            const cardRect = card.getBoundingClientRect();
            return intersects(selectionRect, {
              left: cardRect.left,
              top: cardRect.top,
              right: cardRect.right,
              bottom: cardRect.bottom,
            });
          })
          .map((card) => card.dataset.itemId)
          .filter((itemId): itemId is string => Boolean(itemId));
        setSelectedExplorerItems(nextSelected);
        setSelectedExplorerItem(nextSelected[0] ?? null);
        if (nextBox.width > 4 || nextBox.height > 4) {
          didExplorerMarqueeSelectRef.current = true;
        }
      }
      if (explorerDrag.current && event.buttons === 1) {
        const deltaX = event.clientX - explorerDrag.current.startX;
        const deltaY = event.clientY - explorerDrag.current.startY;
        setExplorerOffset({
          x: explorerDrag.current.baseX + deltaX,
          y: explorerDrag.current.baseY + deltaY,
        });
      } else if (explorerDrag.current && event.buttons !== 1) {
        explorerDrag.current = null;
        setIsWindowHeaderDragging(false);
      }
      if (explorerResize.current && event.buttons === 1) {
        const deltaX = event.clientX - explorerResize.current.startX;
        const deltaY = event.clientY - explorerResize.current.startY;
        const hasWest = explorerResize.current.direction.includes("w");
        const hasEast = explorerResize.current.direction.includes("e");
        const hasNorth = explorerResize.current.direction.includes("n");
        const hasSouth = explorerResize.current.direction.includes("s");
        let nextWidth = explorerResize.current.baseWidth;
        let nextHeight = explorerResize.current.baseHeight;
        let nextX = explorerResize.current.baseX;
        let nextY = explorerResize.current.baseY;
        if (hasEast) {
          nextWidth = Math.max(EXPLORER_MIN_WIDTH, explorerResize.current.baseWidth + deltaX);
        }
        if (hasWest) {
          nextWidth = Math.max(EXPLORER_MIN_WIDTH, explorerResize.current.baseWidth - deltaX);
          nextX = explorerResize.current.baseX + (explorerResize.current.baseWidth - nextWidth);
        }
        if (hasSouth) {
          nextHeight = Math.max(EXPLORER_MIN_HEIGHT, explorerResize.current.baseHeight + deltaY);
        }
        if (hasNorth) {
          nextHeight = Math.max(EXPLORER_MIN_HEIGHT, explorerResize.current.baseHeight - deltaY);
          nextY = explorerResize.current.baseY + (explorerResize.current.baseHeight - nextHeight);
        }
        setExplorerSize({ width: nextWidth, height: nextHeight });
        setExplorerOffset({ x: nextX, y: nextY });
      } else if (explorerResize.current && event.buttons !== 1) {
        explorerResize.current = null;
        setIsWindowHeaderDragging(false);
      }
      if (settingsDrag.current && event.buttons === 1) {
        const deltaX = event.clientX - settingsDrag.current.startX;
        const deltaY = event.clientY - settingsDrag.current.startY;
        setSettingsOffset({
          x: settingsDrag.current.baseX + deltaX,
          y: settingsDrag.current.baseY + deltaY,
        });
      } else if (settingsDrag.current && event.buttons !== 1) {
        settingsDrag.current = null;
        setIsWindowHeaderDragging(false);
      }
    };

    const onPointerUp = () => {
      if (didExplorerMarqueeSelectRef.current) {
        ignoreNextExplorerClickRef.current = true;
        if (clearIgnoreExplorerClickTimerRef.current !== null) {
          window.clearTimeout(clearIgnoreExplorerClickTimerRef.current);
        }
        clearIgnoreExplorerClickTimerRef.current = window.setTimeout(() => {
          ignoreNextExplorerClickRef.current = false;
          clearIgnoreExplorerClickTimerRef.current = null;
        }, 180);
      }
      didExplorerMarqueeSelectRef.current = false;
      desktopSelectionStartRef.current = null;
      explorerSelectionStartRef.current = null;
      setDesktopSelectionBox(null);
      setExplorerSelectionBox(null);
      explorerDrag.current = null;
      explorerResize.current = null;
      settingsDrag.current = null;
      setIsWindowHeaderDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [DESKTOP_ICON_HEIGHT, DESKTOP_ICON_WIDTH, EXPLORER_MIN_HEIGHT, EXPLORER_MIN_WIDTH, desktopApps, desktopAreaRef, setSelectedAppId, setSelectedExplorerItem]);

  useEffect(() => {
    return () => {
      if (clearIgnoreExplorerClickTimerRef.current !== null) {
        window.clearTimeout(clearIgnoreExplorerClickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isExplorerOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      const itemsToDelete = selectedExplorerItems.length > 0 ? selectedExplorerItems : selectedExplorerItem ? [selectedExplorerItem] : [];
      if (itemsToDelete.length === 0) {
        return;
      }
      deleteExplorerItems(itemsToDelete);
      setSelectedExplorerItems([]);
      setSelectedExplorerItem(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteExplorerItems, isExplorerOpen, selectedExplorerItem, selectedExplorerItems, setSelectedExplorerItem]);

  useEffect(() => {
    if (isExplorerOpen || selectedDesktopAppIds.length === 0) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      toast.warning(t.blockedDeleteBody);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExplorerOpen, selectedDesktopAppIds.length, t.blockedDeleteBody]);

  useEffect(() => {
    if (!isClockMenuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (clockMenuRef.current?.contains(target)) {
        return;
      }
      setIsClockMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isClockMenuOpen]);

  useEffect(() => {
    if (!awaitingBootReveal) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeBoot();
    }
  }, [awaitingBootReveal, completeBoot]);
  const shouldDisableSelection =
    draggingId !== null || desktopSelectionBox !== null || explorerSelectionBox !== null || isWindowHeaderDragging;

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${theme === "dark" ? "bg-[#25104f] text-white" : "bg-[#d5c9ef] text-[#1d1630]"} ${
        isAppLoading ? "app-loading-cursor" : ""
      } ${shouldDisableSelection ? "disable-text-selection" : ""}`}
    >
      <div
        className={`absolute inset-0 ${
          theme === "dark"
            ? "bg-[radial-gradient(circle_at_20%_20%,#7d3fd6_0%,#522273_30%,#341f65_50%,#261a57_70%,#1f1645_100%)]"
            : "bg-[radial-gradient(circle_at_20%_20%,#f5d4ff_0%,#d7b8ff_35%,#ba9df1_65%,#9578d8_100%)]"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          theme === "dark"
            ? "bg-[linear-gradient(to_top,rgba(32,22,84,0.95)_0%,rgba(69,31,118,0.55)_45%,rgba(120,45,149,0.35)_70%,rgba(202,88,180,0.28)_100%)]"
            : "bg-[linear-gradient(to_top,rgba(166,139,232,0.45)_0%,rgba(226,185,246,0.28)_50%,rgba(255,235,255,0.18)_100%)]"
        }`}
      />
      <div className={`absolute bottom-0 left-0 right-0 h-56 ${theme === "dark" ? "bg-[linear-gradient(to_top,rgba(16,10,36,0.9),transparent)]" : "bg-[linear-gradient(to_top,rgba(113,88,179,0.35),transparent)]"}`} />

      {isBooting ? (
        <div className="pointer-events-auto fixed inset-0 z-[60]">
          {!awaitingBootReveal ? <div className="absolute inset-0 bg-black" /> : null}
          {awaitingBootReveal ? (
            <div className="absolute inset-0 overflow-hidden bg-transparent">
              <div className="boot-reveal-top-cap absolute left-0 right-0 top-0 h-1/2 bg-black" />
              <div
                className="boot-reveal-bottom-cap absolute bottom-0 left-0 right-0 h-1/2 bg-black"
                onAnimationEnd={(event) => {
                  if (event.animationName === "boot-reveal-shrink-cap" && awaitingBootReveal) {
                    completeBoot();
                  }
                }}
              />
            </div>
          ) : null}
          {!awaitingBootReveal ? (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center px-6 py-10 transition-opacity duration-500 ease-out sm:px-10 ${
                bootTextFadeOut ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              <div className="w-full max-w-xl">
                <p className="mb-4 text-center text-xs text-white/50">popOS boot sequence…</p>
                <div className="space-y-1 text-center font-mono text-sm text-[#7dffb3]">
                  {typedBootLines.map((line, index) => {
                    const lineCount = typedBootLines.length;
                    const brightness =
                      lineCount <= 1 ? 1 : 0.22 + (index / Math.max(1, lineCount - 1)) * 0.78;
                    return (
                      <p
                        key={index}
                        className="boot-line mx-auto max-w-full"
                        style={{ opacity: brightness }}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
                <div className="mx-auto mt-8 h-1.5 w-full max-w-md overflow-hidden rounded bg-white/15">
                  <div
                    className="h-full rounded bg-gradient-to-r from-[#ff7ad9] via-[#d47bff] to-[#6cb7ff] transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-white/60">{Math.round(progress)}%</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <main className="relative z-10 grid min-h-screen grid-rows-[auto_1fr_auto]">
        <HomeTopBar
          theme={theme}
          clock={clock}
          isClockMenuOpen={isClockMenuOpen}
          clockMenuRef={clockMenuRef}
          menuTimeLabel={menuTimeLabel}
          menuDateLabel={menuDateLabel}
          onToggleClockMenu={() => setIsClockMenuOpen((prev) => !prev)}
        />

        <section
          ref={desktopAreaRef}
          className="relative p-4 sm:p-8"
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            const target = event.target as HTMLElement;
            if (target.closest("button") || target.closest(".explorer-window") || target.closest(".app-window-shell")) {
              return;
            }
            setSelectedDesktopAppIds([]);
            setSelectedAppId(null);
            setContextMenu(null);
            const bounds = event.currentTarget.getBoundingClientRect();
            desktopSelectionStartRef.current = {
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            };
            setDesktopSelectionBox({
              left: event.clientX - bounds.left,
              top: event.clientY - bounds.top,
              width: 0,
              height: 0,
            });
          }}
        >
          <div className="absolute inset-0 z-10">
            {desktopApps.map((app) => (
              <button
                type="button"
                key={app.id}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.ctrlKey || event.metaKey) {
                    setSelectedDesktopAppIds((prev) => {
                      if (prev.includes(app.id)) {
                        const next = prev.filter((id) => id !== app.id);
                        setSelectedAppId(next[0] ?? null);
                        return next;
                      }
                      const next = [...prev, app.id];
                      setSelectedAppId(next[0] ?? null);
                      return next;
                    });
                    return;
                  }
                  setSelectedDesktopAppIds([app.id]);
                  setSelectedAppId(app.id);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (app.id === "home" || app.id === "computer" || app.id === "trash" || app.id === "text" || app.id === "images") {
                    openPlace(app.id);
                  }
                  if (app.id === "spotify") {
                    openWithLoading(openSpotify);
                  }
                  if (app.id === "mailer") {
                    openWithLoading(openMailer);
                  }
                  if (app.id === "terminal") {
                    openTerminal();
                  }
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  if (event.ctrlKey || event.metaKey) {
                    return;
                  }
                  const keepMultiSelection =
                    selectedDesktopAppIds.length > 1 && selectedDesktopAppIds.includes(app.id);
                  if (!keepMultiSelection) {
                    setSelectedDesktopAppIds([app.id]);
                    setSelectedAppId(app.id);
                  }
                  const targetBounds = event.currentTarget.getBoundingClientRect();
                  dragOffset.current = {
                    x: event.clientX - targetBounds.left,
                    y: event.clientY - targetBounds.top,
                  };
                  const groupIds = keepMultiSelection ? selectedDesktopAppIds : [app.id];
                  const origins = Object.fromEntries(
                    desktopApps.filter((a) => groupIds.includes(a.id)).map((a) => [a.id, { x: a.x, y: a.y }]),
                  );
                  beginDesktopDrag(app.id, groupIds, origins);
                }}
                className={`absolute flex w-20 cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs ${
                  draggingId !== null && selectedDesktopAppIds.includes(app.id)
                    ? "cursor-grabbing"
                    : "transition-[left,top,background-color,border-color] duration-200 ease-out"
                } ${
                  selectedDesktopAppIds.includes(app.id) || (selectedDesktopAppIds.length === 0 && selectedAppId === app.id)
                    ? "border-white/70 bg-white/25"
                    : "border-transparent hover:border-white/30 hover:bg-white/10"
                } ${app.x < 0 || app.y < 0 ? "invisible" : ""}`}
                style={{ left: Math.max(0, app.x), top: Math.max(0, app.y) }}
              >
                {app.id === "trash" ? (
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-md bg-black/25 text-xl">
                    <span className={`absolute top-1 text-base transition-opacity duration-200 ${isHydrated && trashFiles.length > 0 ? "opacity-100" : "opacity-0"}`}>
                      📄
                    </span>
                    <span className="relative z-10">🗑️</span>
                  </span>
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-black/25 text-xl">{app.icon}</span>
                )}
                <span>{app.name}</span>
              </button>
            ))}
            {desktopSelectionBox ? (
              <div
                className="pointer-events-none absolute rounded border border-sky-300/90 bg-sky-300/20"
                style={{
                  left: desktopSelectionBox.left,
                  top: desktopSelectionBox.top,
                  width: desktopSelectionBox.width,
                  height: desktopSelectionBox.height,
                }}
              />
            ) : null}
          </div>

          {isExplorerOpen ? (
            <div
              className={`pointer-events-none absolute inset-0 ${isExplorerMaximized ? "p-0" : "p-4 sm:p-10"}`}
              style={{ zIndex: windowZIndices.explorer }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                ref={explorerRef}
                className={`explorer-window pointer-events-auto relative ${isExplorerMaximized ? "window-maximized" : "window-resizable"} ${isExplorerClosing ? "window-close" : "window-open"} ${explorerFrame} flex h-[76vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md`}
                style={{
                  transform: isExplorerMaximized ? "none" : `translate(${explorerOffset.x}px, ${explorerOffset.y}px)`,
                  width: !isExplorerMaximized && explorerSize.width !== null ? `${explorerSize.width}px` : undefined,
                  height: !isExplorerMaximized && explorerSize.height !== null ? `${explorerSize.height}px` : undefined,
                  minWidth: !isExplorerMaximized ? `${EXPLORER_MIN_WIDTH}px` : undefined,
                  minHeight: !isExplorerMaximized ? `${EXPLORER_MIN_HEIGHT}px` : undefined,
                  position: isExplorerMaximized ? "fixed" : "absolute",
                  inset: isExplorerMaximized ? "0" : undefined,
                  left: !isExplorerMaximized ? "0" : undefined,
                  top: !isExplorerMaximized ? "0" : undefined,
                  margin: isExplorerMaximized ? 0 : undefined,
                  zIndex: isExplorerMaximized ? 70 : undefined,
                  ...(isExplorerMaximized && explorerMaximizeFromRect
                    ? {
                        inset: "auto",
                        left: `${explorerMaximizeFromRect.left}px`,
                        top: `${explorerMaximizeFromRect.top}px`,
                        width: `${explorerMaximizeFromRect.width}px`,
                        height: `${explorerMaximizeFromRect.height}px`,
                      }
                    : {}),
                  transition: "transform 180ms ease, width 180ms ease, height 180ms ease, left 180ms ease, top 180ms ease",
                }}
                onMouseDown={() => bringWindowToFront("explorer")}
              >
                <div
                  className={`flex cursor-move items-center justify-between border-b px-3 py-2 text-xs ${explorerHeader} ${explorerText}`}
                  onDoubleClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button") || target.closest("input")) {
                      return;
                    }
                    toggleExplorerMaximized();
                  }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }
                    const target = event.target as HTMLElement;
                    if (target.closest("button") || target.closest("input")) {
                      return;
                    }
                    if (isExplorerMaximized) {
                      beginExplorerDragFromMaximized(event);
                      return;
                    }
                    explorerDrag.current = {
                      startX: event.clientX,
                      startY: event.clientY,
                      baseX: explorerOffset.x,
                      baseY: explorerOffset.y,
                    };
                    setIsWindowHeaderDragging(true);
                  }}
                >
                  <div className="flex items-center gap-1">
                    {isExplorerCompact ? (
                      <button
                        type="button"
                        onClick={() => setIsExplorerPlacesMenuOpen((prev) => !prev)}
                        className={`cursor-pointer rounded px-2 py-1 ${explorerButton}`}
                      >
                        ☰
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleExplorerBack}
                      disabled={historyIndex <= 0}
                      className={`cursor-pointer rounded px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${explorerButton}`}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={goForward}
                      disabled={historyIndex >= placeHistory.length - 1}
                      className={`cursor-pointer rounded px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${explorerButton}`}
                    >
                      →
                    </button>
                    <button type="button" onClick={() => openPlaceInCurrentExplorer("home")} className={`cursor-pointer rounded px-2 py-1 ${explorerButton}`}>
                      ⌂
                    </button>
                    <div className="relative ml-2">
                      <input
                        value={pathInput}
                        onFocus={() => setIsPathFocused(true)}
                        onBlur={() => window.setTimeout(() => setIsPathFocused(false), 120)}
                        onChange={(event) => setPathInput(event.target.value.toLowerCase())}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            openPathFromInput();
                          }
                        }}
                        className={`w-28 rounded px-2 py-1 outline-none ring-1 ring-transparent sm:w-44 ${isDarkTheme ? "bg-white/10 text-white focus:ring-white/40" : "bg-black/10 text-[#1d1830] focus:ring-black/30"}`}
                      />
                      {isPathFocused ? (
                        <div className={`absolute top-8 z-10 w-full rounded border p-1 ${isDarkTheme ? "border-white/20 bg-[#1c2030]" : "border-black/15 bg-[#ece8f8]"}`}>
                          {pathSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => openNestedPathInCurrentExplorer(suggestion)}
                              className={`block w-full cursor-pointer rounded px-2 py-1 text-left transition-colors duration-200 ${isDarkTheme ? "text-white/90 hover:bg-white/10" : "text-[#1d1830] hover:bg-black/10"}`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {openExplorerPaths.length > 1 ? (
                      <div className="ml-2 hidden items-center gap-1 md:flex">
                        {openExplorerPaths.map((path) => (
                          <div
                            key={path}
                            className={`flex items-center rounded-md border border-transparent transition-all duration-200 ease-out ${pathInput === path ? `${explorerItemActive} border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]` : explorerItemHover}`}
                          >
                            <button
                              type="button"
                              onClick={() => openNestedPath(path)}
                              className="cursor-pointer px-3 py-1.5 text-xs transition-colors duration-200"
                            >
                              {formatExplorerTabLabel(path)}
                            </button>
                            <button
                              type="button"
                              onClick={() => closeExplorerTab(path)}
                              className="cursor-pointer px-2 py-1.5 text-[10px] opacity-80 transition-all duration-200 hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleExplorerMaximized} className={`cursor-pointer rounded px-2 py-1 ${explorerButton}`}>
                      ⛶ {t.full}
                    </button>
                    <button
                      type="button"
                      onClick={handleExplorerClose}
                      className={`cursor-pointer rounded px-2 py-1 ${explorerButton}`}
                    >
                      ✕ {t.close}
                    </button>
                  </div>
                </div>
                {!isExplorerMaximized ? (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 z-30 w-2 cursor-w-resize" onPointerDown={(event) => beginExplorerResize("w", event)} />
                    <div className="absolute right-0 top-0 bottom-0 z-30 w-2 cursor-e-resize" onPointerDown={(event) => beginExplorerResize("e", event)} />
                    <div className="absolute top-0 left-0 right-0 z-30 h-2 cursor-n-resize" onPointerDown={(event) => beginExplorerResize("n", event)} />
                    <div className="absolute bottom-0 left-0 right-0 z-30 h-2 cursor-s-resize" onPointerDown={(event) => beginExplorerResize("s", event)} />
                    <div className="absolute left-0 top-0 z-40 h-3 w-3 cursor-nw-resize" onPointerDown={(event) => beginExplorerResize("nw", event)} />
                    <div className="absolute right-0 top-0 z-40 h-3 w-3 cursor-ne-resize" onPointerDown={(event) => beginExplorerResize("ne", event)} />
                    <div className="absolute left-0 bottom-0 z-40 h-3 w-3 cursor-sw-resize" onPointerDown={(event) => beginExplorerResize("sw", event)} />
                    <div className="absolute right-0 bottom-0 z-40 h-3 w-3 cursor-se-resize" onPointerDown={(event) => beginExplorerResize("se", event)} />
                  </>
                ) : null}

                <div className="relative flex flex-1 min-h-0">
                  {isExplorerCompact && isExplorerPlacesMenuOpen ? (
                    <button
                      type="button"
                      aria-label="Close places menu"
                      onClick={() => setIsExplorerPlacesMenuOpen(false)}
                      className="absolute inset-0 z-10 cursor-default bg-black/30"
                    />
                  ) : null}
                  <aside
                    className={`z-20 w-[220px] shrink-0 overflow-y-auto border-r p-3 text-sm transition-transform duration-200 ${explorerSidebar} ${
                      isExplorerCompact ? `absolute inset-y-0 left-0 ${isExplorerPlacesMenuOpen ? "translate-x-0" : "-translate-x-full"}` : "relative translate-x-0"
                    }`}
                  >
                    <p className={`mb-2 text-xs uppercase tracking-wide ${explorerMuted}`}>{t.places}</p>
                    <ul className={`grid grid-cols-3 gap-1 md:grid-cols-1 md:space-y-1 ${explorerText}`}>
                      <li>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsHomeTreeMounted(true);
                              setIsHomeTreeOpen((prev) => !prev);
                            }}
                            className={`cursor-pointer rounded px-1 py-1 ${explorerItemHover}`}
                          >
                            {isHomeTreeOpen ? "▾" : "▸"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openPlaceInCurrentExplorer("home")}
                            className={`w-full cursor-pointer rounded px-2 py-1 text-left transition-colors duration-200 ${activePlace === "home" ? explorerItemActive : explorerItemHover}`}
                          >
                            🏠 {t.home}
                          </button>
                        </div>
                        {isHomeTreeMounted ? (
                          <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200 ${isHomeTreeOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsHomeTreeMounted(true);
                                  setIsProjectsTreeOpen((prev) => {
                                    const next = !prev;
                                    if (next) {
                                      void ensureGithubReposLoaded();
                                    }
                                    return next;
                                  });
                                }}
                                className={`cursor-pointer rounded px-1 py-1 ${explorerItemHover}`}
                              >
                                {isProjectsTreeOpen ? "▾" : "▸"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openNestedPathInCurrentExplorer("home/projects")}
                                className={`w-full cursor-pointer rounded px-2 py-1 text-left transition-colors duration-200 ${homeView === "projects" ? explorerItemActive : explorerItemHover}`}
                              >
                                📁 {t.projectsFolder}
                              </button>
                            </div>
                            {isProjectsTreeOpen ? (
                              <div className="ml-4 space-y-1">
                                {githubRepos.map((repo) => (
                                  <button
                                    key={`tree-${repo.name}`}
                                    type="button"
                                    onClick={() => window.open(repo.url, "_blank", "noopener,noreferrer")}
                                    className={`w-full cursor-pointer rounded px-2 py-1 text-left text-xs transition-colors duration-200 ${explorerItemHover}`}
                                  >
                                    🐙 {repo.name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => openPlaceInCurrentExplorer("computer")}
                          className={`w-full cursor-pointer rounded px-2 py-1 text-left transition-colors duration-200 ${activePlace === "computer" ? explorerItemActive : explorerItemHover}`}
                        >
                          🖥️ {t.computer}
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => openPlaceInCurrentExplorer("text")}
                          className={`w-full cursor-pointer rounded px-2 py-1 text-left transition-colors duration-200 ${activePlace === "text" ? explorerItemActive : explorerItemHover}`}
                        >
                          {textDesktopIcon} {t.textFolder}
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => openPlaceInCurrentExplorer("images")}
                          className={`w-full cursor-pointer rounded px-2 py-1 text-left transition-colors duration-200 ${activePlace === "images" ? explorerItemActive : explorerItemHover}`}
                        >
                          🖼️ {t.imagesFolder}
                        </button>
                      </li>
                    </ul>
                  </aside>

                  <div
                    ref={explorerContentRef}
                    className={`relative min-h-0 flex-1 overflow-auto p-4 ${explorerContent}`}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }
                      const target = event.target as HTMLElement;
                      if (target.closest('button[data-file-card="true"]')) {
                        return;
                      }
                      setSelectedExplorerItems([]);
                      setSelectedExplorerItem(null);
                      const bounds = event.currentTarget.getBoundingClientRect();
                      explorerSelectionStartRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                      setExplorerSelectionBox({
                        left: event.clientX - bounds.left,
                        top: event.clientY - bounds.top,
                        width: 0,
                        height: 0,
                      });
                    }}
                    onClick={() => {
                      if (ignoreNextExplorerClickRef.current) {
                        ignoreNextExplorerClickRef.current = false;
                        return;
                      }
                      setSelectedExplorerItems([]);
                      setSelectedExplorerItem(null);
                      setContextMenu(null);
                    }}
                  >
                    {activePlace === "home" ? (
                      <>
                        {homeView === "root" ? (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <FileIconCard
                                itemId="home-cv"
                                label="cv.pdf"
                                icon="📕"
                                dark={isDarkTheme}
                                selected={selectedExplorerItems.includes("home-cv") || (selectedExplorerItems.length === 0 && selectedExplorerItem === "home-cv")}
                                onSelect={() => {
                                  if (ignoreNextExplorerClickRef.current) {
                                    return;
                                  }
                                  setSelectedExplorerItems(["home-cv"]);
                                  setSelectedExplorerItem("home-cv");
                                }}
                                onOpen={openPdf}
                              />
                              {homeTextFiles.map((file) => (
                                <FileIconCard
                                  itemId={file.id}
                                  key={file.id}
                                  label={file.name}
                                  icon="📄"
                                  dark={isDarkTheme}
                                  selected={selectedExplorerItems.includes(file.id) || (selectedExplorerItems.length === 0 && selectedExplorerItem === file.id)}
                                  onSelect={() => {
                                    if (ignoreNextExplorerClickRef.current) {
                                      return;
                                    }
                                    setSelectedExplorerItems([file.id]);
                                    setSelectedExplorerItem(file.id);
                                  }}
                                  onOpen={() => openTextEditor(file.id)}
                                />
                              ))}
                              <FileIconCard
                                itemId="home-projects"
                                label={t.projectsFolder}
                                icon="📁"
                                dark={isDarkTheme}
                                selected={selectedExplorerItems.includes("home-projects") || (selectedExplorerItems.length === 0 && selectedExplorerItem === "home-projects")}
                                onSelect={() => {
                                  if (ignoreNextExplorerClickRef.current) {
                                    return;
                                  }
                                  setSelectedExplorerItems(["home-projects"]);
                                  setSelectedExplorerItem("home-projects");
                                }}
                                onOpen={() => {
                                  setSelectedExplorerItems(["home-projects"]);
                                  setSelectedExplorerItem("home-projects");
                                  openNestedPathInCurrentExplorer("home/projects");
                                }}
                              />
                            </div>

                            {selectedExplorerItems.length <= 1 && (selectedExplorerItem === "home-cv" || homeTextFiles.some((file) => file.id === selectedExplorerItem)) ? (
                              <div className={`mt-5 rounded-lg border p-4 text-sm ${isDarkTheme ? "border-white/15 bg-black/20 text-white/85" : "border-black/10 bg-black/8 text-[#201b36]"}`}>
                                <p className={`mb-2 text-xs uppercase tracking-wide ${explorerMuted}`}>{t.preview}</p>
                                {selectedExplorerItem === "home-cv" ? (
                                  <p>cv.pdf - read only, double click za otvaranje.</p>
                                ) : (
                                  <p>{(homeTextFiles.find((file) => file.id === selectedExplorerItem)?.content || "...").slice(0, 180)}</p>
                                )}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <div className="mb-3 flex items-center justify-between">
                              <p className={`text-sm font-medium ${explorerText}`}>{t.projectsTitle}</p>
                            </div>
                            {githubLoading ? <p className={explorerMuted}>Loading repositories...</p> : null}
                            {githubError ? <p className="text-sm text-red-300">{githubError}</p> : null}
                            {!githubLoading && !githubError && githubRepos.length === 0 ? (
                              <p className={explorerMuted}>No repositories found.</p>
                            ) : null}
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              {githubRepos.map((project) => (
                                <FileIconCard
                                  itemId={`repo-${project.name}`}
                                  key={project.name}
                                  label={project.name}
                                  icon="🐙"
                                  dark={isDarkTheme}
                                  selected={
                                    selectedExplorerItems.includes(`repo-${project.name}`) ||
                                    (selectedExplorerItems.length === 0 && selectedExplorerItem === `repo-${project.name}`)
                                  }
                                  onSelect={() => {
                                    if (ignoreNextExplorerClickRef.current) {
                                      return;
                                    }
                                    setSelectedExplorerItems([`repo-${project.name}`]);
                                    setSelectedExplorerItem(`repo-${project.name}`);
                                  }}
                                  onOpen={() => window.open(project.url, "_blank", "noopener,noreferrer")}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : activePlace === "text" ? (
                      <div
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                      >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <FileIconCard
                            itemId="mailer.exe"
                            label="mailer.exe"
                            icon="⚙️"
                            dark={isDarkTheme}
                            selected={selectedExplorerItems.includes("mailer.exe") || (selectedExplorerItems.length === 0 && selectedExplorerItem === "mailer.exe")}
                            onSelect={() => {
                              if (ignoreNextExplorerClickRef.current) {
                                return;
                              }
                              setSelectedExplorerItems(["mailer.exe"]);
                              setSelectedExplorerItem("mailer.exe");
                            }}
                            onOpen={() => {
                              setSelectedExplorerItems(["mailer.exe"]);
                              setSelectedExplorerItem("mailer.exe");
                              openWithLoading(openMailer);
                            }}
                          />
                          {textFolderFiles.map((file) => (
                            <FileIconCard
                              itemId={file.id}
                              key={file.id}
                              label={file.name}
                              icon="📄"
                              dark={isDarkTheme}
                              onSelect={() => {
                                if (ignoreNextExplorerClickRef.current) {
                                  return;
                                }
                                setSelectedExplorerItems([file.id]);
                                setSelectedExplorerItem(file.id);
                              }}
                              onOpen={() => openTextEditor(file.id)}
                              selected={selectedExplorerItems.includes(file.id) || (selectedExplorerItems.length === 0 && selectedExplorerItem === file.id)}
                            />
                          ))}
                        </div>
                        {selectedExplorerItems.length <= 1 && selectedExplorerItem && selectedExplorerItem !== "mailer.exe" ? (
                          <div className={`mt-4 rounded-lg border p-3 text-sm ${isDarkTheme ? "border-white/15 bg-black/20 text-white/85" : "border-black/10 bg-black/8 text-[#201b36]"}`}>
                            <p className={`mb-2 text-xs uppercase tracking-wide ${explorerMuted}`}>{t.preview}</p>
                            <p className="mb-1">{textFiles.find((file) => file.id === selectedExplorerItem)?.name}</p>
                            <p className={explorerMuted}>
                              {(textFiles.find((file) => file.id === selectedExplorerItem)?.content || "").slice(0, 180) || "..."}
                            </p>
                          </div>
                        ) : null}
                        {contextMenu ? (
                          <div
                            className="fixed z-40 min-w-52 rounded-md border border-white/20 bg-[#20263a] p-1 shadow-2xl"
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                createTextFile();
                                setContextMenu(null);
                              }}
                              className="block w-full cursor-pointer rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                            >
                              {t.createFileMenu}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openWithLoading(openMailer);
                                setContextMenu(null);
                              }}
                              className="block w-full cursor-pointer rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                            >
                              {t.openMailerMenu}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : activePlace === "trash" ? (
                      <div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {trashFiles.map((file) => (
                            <FileIconCard
                              itemId={file.id}
                              key={file.id}
                              label={file.name}
                              icon="📄"
                              dark={isDarkTheme}
                              onSelect={() => {
                                if (ignoreNextExplorerClickRef.current) {
                                  return;
                                }
                                setSelectedExplorerItems([file.id]);
                                setSelectedExplorerItem(file.id);
                              }}
                              onOpen={() => openTextEditor(file.id)}
                              selected={selectedExplorerItems.includes(file.id) || (selectedExplorerItems.length === 0 && selectedExplorerItem === file.id)}
                            />
                          ))}
                        </div>
                        {trashFiles.length === 0 ? (
                          <div className={`flex h-[220px] items-center justify-center text-sm md:h-[300px] ${explorerMuted}`}>
                            Trash is empty.
                          </div>
                        ) : null}
                        {selectedExplorerItems.length <= 1 && selectedExplorerItem ? (
                          <div className={`mt-4 rounded-lg border p-3 text-sm ${isDarkTheme ? "border-white/15 bg-black/20 text-white/85" : "border-black/10 bg-black/8 text-[#201b36]"}`}>
                            <p className={`mb-2 text-xs uppercase tracking-wide ${explorerMuted}`}>{t.preview}</p>
                            <p className="mb-1">{textFiles.find((file) => file.id === selectedExplorerItem)?.name}</p>
                            <p className={explorerMuted}>
                              {(textFiles.find((file) => file.id === selectedExplorerItem)?.content || "").slice(0, 180) || "..."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex h-[220px] items-center justify-center text-sm text-white/70 md:h-[300px]">
                        {t.folderEmpty}
                      </div>
                    )}
                    {explorerSelectionBox ? (
                      <div
                        className="pointer-events-none absolute rounded border border-sky-400/90 bg-sky-400/20"
                        style={{
                          left: explorerSelectionBox.left,
                          top: explorerSelectionBox.top,
                          width: explorerSelectionBox.width,
                          height: explorerSelectionBox.height,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <div className={`flex h-11 shrink-0 items-center justify-end gap-2 border-t px-4 ${explorerHeader}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const itemsToDelete = selectedExplorerItems.length > 0 ? selectedExplorerItems : selectedExplorerItem ? [selectedExplorerItem] : [];
                      if (itemsToDelete.length === 0) {
                        return;
                      }
                      deleteExplorerItems(itemsToDelete);
                      setSelectedExplorerItems([]);
                      setSelectedExplorerItem(null);
                    }}
                    disabled={selectedExplorerItems.length === 0 && !selectedExplorerItem}
                    className={`cursor-pointer rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-45 ${explorerButton}`}
                  >
                    {t.delete}
                  </button>
                  {activePlace === "trash" ? (
                    <button
                      type="button"
                      onClick={emptyTrash}
                      disabled={!canEmptyTrash}
                      className={`cursor-pointer rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-45 ${explorerButton}`}
                    >
                      {t.emptyTrash}
                    </button>
                  ) : null}
                  {canShowNewTextButton ? (
                    <button
                      type="button"
                      onClick={createTextFile}
                      className={`cursor-pointer rounded px-2 py-1 text-xs ${explorerButton}`}
                    >
                      + {t.newTextFile}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {isSettingsOpen ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
              style={{ zIndex: windowZIndices.settings }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className={`pointer-events-auto ${isSettingsClosing ? "window-close" : "window-open"} w-full max-w-md rounded-xl border border-white/20 bg-[#23273a]/95 p-5 shadow-2xl`}
                style={{ transform: `translate(${settingsOffset.x}px, ${settingsOffset.y}px)` }}
                onMouseDown={() => bringWindowToFront("settings")}
              >
                <div
                  className="mb-4 flex cursor-move items-center justify-between"
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button")) {
                      return;
                    }
                    settingsDrag.current = {
                      startX: event.clientX,
                      startY: event.clientY,
                      baseX: settingsOffset.x,
                      baseY: settingsOffset.y,
                    };
                    setIsWindowHeaderDragging(true);
                  }}
                >
                  <h3 className="text-lg font-semibold text-white">{t.settings}</h3>
                  <button type="button" onClick={closeSettings} className="cursor-pointer rounded bg-white/10 px-2 py-1 text-white hover:bg-white/20">
                    {t.close}
                  </button>
                </div>
                <div className="space-y-4 text-sm text-white">
                  <div>
                    <p className="mb-2 text-white/70">{t.theme}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`cursor-pointer rounded px-3 py-1 ${theme === "dark" ? "bg-white/25" : "bg-white/10"}`}
                      >
                        {t.dark}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`cursor-pointer rounded px-3 py-1 ${theme === "light" ? "bg-white/25" : "bg-white/10"}`}
                      >
                        {t.light}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-white/70">{t.language}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLanguage("en")}
                        className={`cursor-pointer rounded px-3 py-1 ${language === "en" ? "bg-white/25" : "bg-white/10"}`}
                      >
                        {t.english}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage("hr")}
                        className={`cursor-pointer rounded px-3 py-1 ${language === "hr" ? "bg-white/25" : "bg-white/10"}`}
                      >
                        {t.croatian}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <MailerWindow
            open={isMailerOpen}
            closing={isMailerClosing}
            title="mailer.exe"
            fullLabel={t.full}
            closeLabel={t.close}
            senderLabel={t.mailSender}
            subjectLabel={t.mailSubject}
            messageLabel={t.mailBody}
            sendLabel={t.sendMail}
            sender={mailSender}
            subject={mailSubject}
            message={mailBody}
            onChangeSender={setMailSender}
            onChangeSubject={setMailSubject}
            onChangeMessage={setMailBody}
            onSend={sendMail}
            zIndex={windowZIndices.mailer}
            onFocus={() => bringWindowToFront("mailer")}
            onClose={closeMailer}
          />

          <TextEditorWindow
            open={isTextEditorOpen}
            closing={isTextEditorClosing}
            fileName={textFiles.find((file) => file.id === editorFileId)?.name ?? "note.txt"}
            fullLabel={t.full}
            saveLabel={t.save}
            closeLabel={t.close}
            saveStatusLabel={saveStatusLabel}
            fileNameDraft={editorFileNameDraft}
            value={editorContent}
            onChangeFileNameDraft={setEditorFileNameDraft}
            onChange={setEditorContent}
            onSave={saveTextFile}
            zIndex={windowZIndices.textEditor}
            onFocus={() => bringWindowToFront("textEditor")}
            onClose={closeTextEditor}
          />

          <PdfViewerWindow
            open={isPdfOpen}
            closing={isPdfClosing}
            title="cv.pdf"
            fullLabel={t.full}
            closeLabel={t.close}
            fileUrl="/cv.pdf"
            fallbackMessage="PDF preview trenutno nije dostupan."
            openInTabLabel="Open in new tab"
            zIndex={windowZIndices.pdf}
            onFocus={() => bringWindowToFront("pdf")}
            onClose={closePdf}
          />

          <SpotifyWindow
            open={isSpotifyOpen}
            closing={isSpotifyClosing}
            title="spotify.exe"
            fullLabel={t.full}
            closeLabel={t.close}
            noSongLabel={t.spotifyNoSong}
            genericErrorLabel={t.spotifyGenericError}
            zIndex={windowZIndices.spotify}
            onFocus={() => bringWindowToFront("spotify")}
            onClose={closeSpotify}
          />

          <TerminalWindow
            open={isTerminalOpen}
            closing={isTerminalClosing}
            title="terminal"
            fullLabel={t.full}
            closeLabel={t.close}
            zIndex={windowZIndices.terminal}
            onFocus={() => bringWindowToFront("terminal")}
            onClose={closeTerminal}
          />

          <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.unsavedPrompt}</AlertDialogTitle>
                <AlertDialogDescription>{t.discardPrompt}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.close}</AlertDialogCancel>
                <AlertDialogAction onClick={discardAndCloseEditor}>{t.discard}</AlertDialogAction>
                <AlertDialogAction onClick={saveAndCloseEditor}>{t.save}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <HomeDock
          dockApps={dockApps}
          hoveredDockIndex={hoveredDockIndex}
          getDockIconScale={getDockIconScale}
          onHoverDockIndex={setHoveredDockIndex}
          onOpenWithLoading={openWithLoading}
        />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
