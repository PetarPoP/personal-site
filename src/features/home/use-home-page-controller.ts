"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mailSchema } from "@/lib/schemas";
import { getCopy } from "@/lib/translations";
import {
  BOOT_LINES,
  EXPLORER_PATHS,
  GRID,
  HOME_DEFAULT_TEXT_CONTENT,
  INITIAL_DESKTOP_APPS,
  snapDesktopPositionToGrid,
  NEW_TEXT_BUTTON_BY_PATH,
  STORAGE_KEY,
} from "@/features/home/constants";
import { loadGithubRepos } from "@/features/home/github-repos-client";
import type {
  ContextMenuPosition,
  DesktopApp,
  ExplorerPath,
  GithubRepo,
  HomeView,
  Language,
  LocalTextFile,
  PlaceId,
  ThemeMode,
} from "@/features/home/types";

type WindowId = "explorer" | "settings" | "mailer" | "textEditor" | "pdf" | "spotify" | "terminal";
type NavigatePathOptions = {
  openInNewTab?: boolean;
};

const getInitialPlaceFromPath = (path: ExplorerPath | null): PlaceId => {
  if (!path || path === "home/projects") {
    return "home";
  }
  return path;
};

const getInitialHomeViewFromPath = (path: ExplorerPath | null): HomeView => {
  if (path === "home/projects") {
    return "projects";
  }
  return "root";
};

const getInitialLocalTextFiles = (): LocalTextFile[] => {
  const fallback: LocalTextFile[] = [
    {
      id: "home-about-me",
      name: "about-me.txt",
      content: HOME_DEFAULT_TEXT_CONTENT,
      folder: "home",
    },
  ];
  if (typeof window === "undefined") {
    return fallback;
  }
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(saved) as Array<Partial<LocalTextFile>>;
    const normalized = parsed
      .filter((file): file is Partial<LocalTextFile> & Pick<LocalTextFile, "id" | "name" | "content"> => {
        return (
          typeof file?.id === "string" &&
          typeof file?.name === "string" &&
          typeof file?.content === "string"
        );
      })
      .map((file) => ({
        id: file.id,
        name: file.name,
        content: file.content,
        folder: file.folder === "home" || file.folder === "text" || file.folder === "trash" ? file.folder : "text",
      }));

    const hasHomeAbout = normalized.some((file) => file.id === "home-about-me");
    if (hasHomeAbout) {
      return normalized;
    }
    return [...fallback, ...normalized];
  } catch {
    return fallback;
  }
};

export const useHomePageController = (initialRoutePath: ExplorerPath | null = null) => {
  const [isBooting, setIsBooting] = useState(initialRoutePath === null);
  const [awaitingBootReveal, setAwaitingBootReveal] = useState(false);
  const [bootTextFadeOut, setBootTextFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clock, setClock] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [desktopApps, setDesktopApps] = useState<DesktopApp[]>(INITIAL_DESKTOP_APPS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(Boolean(initialRoutePath));
  const [openExplorerPaths, setOpenExplorerPaths] = useState<ExplorerPath[]>(() => (initialRoutePath ? [initialRoutePath] : []));
  const [isExplorerClosing, setIsExplorerClosing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [isMailerOpen, setIsMailerOpen] = useState(false);
  const [isMailerClosing, setIsMailerClosing] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isPdfClosing, setIsPdfClosing] = useState(false);
  const [isSpotifyOpen, setIsSpotifyOpen] = useState(false);
  const [isSpotifyClosing, setIsSpotifyClosing] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalClosing, setIsTerminalClosing] = useState(false);
  const [activePlace, setActivePlace] = useState<PlaceId>(getInitialPlaceFromPath(initialRoutePath));
  const [placeHistory, setPlaceHistory] = useState<ExplorerPath[]>(() => [initialRoutePath ?? "home"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [pathInput, setPathInput] = useState<string>(initialRoutePath ?? "home");
  const [isPathFocused, setIsPathFocused] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [language, setLanguage] = useState<Language>("en");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailSender, setMailSender] = useState("");
  const [isExitingFullscreen, setIsExitingFullscreen] = useState(false);
  const [textFiles, setTextFiles] = useState<LocalTextFile[]>(() => getInitialLocalTextFiles());
  const [selectedExplorerItem, setSelectedExplorerItem] = useState<string | null>(null);
  const [homeView, setHomeView] = useState<HomeView>(getInitialHomeViewFromPath(initialRoutePath));
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [isTextEditorClosing, setIsTextEditorClosing] = useState(false);
  const [editorFileId, setEditorFileId] = useState<string | null>(null);
  const [editorFileNameDraft, setEditorFileNameDraft] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [savedEditorContent, setSavedEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [draftFileId, setDraftFileId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const desktopGroupDragRef = useRef<{ ids: string[]; origins: Record<string, { x: number; y: number }> } | null>(
    null,
  );
  const desktopAreaRef = useRef<HTMLDivElement | null>(null);
  const explorerRef = useRef<HTMLDivElement | null>(null);
  const [desktopSize, setDesktopSize] = useState({ width: 0, height: 0 });
  const [windowOrder, setWindowOrder] = useState<WindowId[]>([
    "explorer",
    "settings",
    "mailer",
    "textEditor",
    "pdf",
    "spotify",
    "terminal",
  ]);

  const bringWindowToFront = useCallback((windowId: WindowId) => {
    setWindowOrder((prev) => {
      const next = prev.filter((id) => id !== windowId);
      return [...next, windowId];
    });
  }, []);

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString("hr-HR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isBooting) {
      return;
    }
    let animationFrame = 0;
    const durationMs = 2600;
    const start = performance.now();

    const animate = (time: number) => {
      const elapsed = time - start;
      const linear = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - linear) ** 3;
      const nextProgress = eased * 100;
      setProgress(nextProgress);

      if (linear < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setProgress(100);
        setBootTextFadeOut(true);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isBooting]);

  useEffect(() => {
    if (!bootTextFadeOut || !isBooting) {
      return;
    }
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delayMs = prefersReducedMotion ? 0 : 550;
    const id = window.setTimeout(() => {
      setAwaitingBootReveal(true);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [bootTextFadeOut, isBooting]);

  const completeBoot = useCallback(() => {
    setIsBooting(false);
    setAwaitingBootReveal(false);
    setBootTextFadeOut(false);
  }, []);

  useLayoutEffect(() => {
    const el = desktopAreaRef.current;
    if (!el) {
      return;
    }

    const updateDesktopSize = () => {
      const bounds = el.getBoundingClientRect();
      if (bounds.width < 2 || bounds.height < 2) {
        return;
      }
      setDesktopSize({ width: bounds.width, height: bounds.height });
      setDesktopApps((prev) =>
        prev.map((app) => {
          if (app.id !== "trash" || app.x >= 0 || app.y >= 0) {
            return app;
          }
          const maxX = Math.max(GRID.startX, bounds.width - GRID.iconWidth - GRID.padding);
          const maxY = Math.max(GRID.startY, bounds.height - GRID.iconHeight - GRID.padding);
          const snapped = snapDesktopPositionToGrid(maxX, maxY, bounds.width, bounds.height);
          return { ...app, x: snapped.x, y: snapped.y };
        }),
      );
    };

    updateDesktopSize();
    requestAnimationFrame(() => {
      requestAnimationFrame(updateDesktopSize);
    });
    const resizeObserver = new ResizeObserver(() => {
      updateDesktopSize();
    });
    resizeObserver.observe(el);
    window.addEventListener("resize", updateDesktopSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDesktopSize);
    };
  }, []);

  useLayoutEffect(() => {
    if (isBooting) {
      return;
    }
    const el = desktopAreaRef.current;
    if (!el) {
      return;
    }
    const bounds = el.getBoundingClientRect();
    if (bounds.width < 2 || bounds.height < 2) {
      return;
    }
    const maxX = Math.max(GRID.startX, bounds.width - GRID.iconWidth - GRID.padding);
    const maxY = Math.max(GRID.startY, bounds.height - GRID.iconHeight - GRID.padding);
    setDesktopSize({ width: bounds.width, height: bounds.height });
    setDesktopApps((prev) =>
      prev.map((app) => {
        if (app.id !== "trash") {
          return app;
        }
        const sx = app.x < 0 ? maxX : app.x;
        const sy = app.y < 0 ? maxY : app.y;
        const snapped = snapDesktopPositionToGrid(sx, sy, bounds.width, bounds.height);
        if (snapped.x === app.x && snapped.y === app.y) {
          return app;
        }
        return { ...app, x: snapped.x, y: snapped.y };
      }),
    );
  }, [isBooting]);

  const getClampedPosition = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(GRID.startX, desktopSize.width - GRID.iconWidth - GRID.padding);
      const maxY = Math.max(GRID.startY, desktopSize.height - GRID.iconHeight - GRID.padding);

      return {
        x: Math.max(GRID.padding, Math.min(x, maxX)),
        y: Math.max(GRID.padding, Math.min(y, maxY)),
      };
    },
    [desktopSize.height, desktopSize.width],
  );

  const getSnappedPosition = useCallback(
    (x: number, y: number) => {
      return snapDesktopPositionToGrid(x, y, desktopSize.width, desktopSize.height);
    },
    [desktopSize.height, desktopSize.width],
  );

  const beginDesktopDrag = useCallback(
    (primaryId: string, selectedIds: string[], origins: Record<string, { x: number; y: number }>) => {
      const group =
        selectedIds.length > 1 && selectedIds.includes(primaryId) ? selectedIds : [primaryId];
      if (group.length > 1) {
        desktopGroupDragRef.current = {
          ids: group,
          origins: Object.fromEntries(group.map((id) => [id, origins[id] ?? { x: 0, y: 0 }])),
        };
      } else {
        desktopGroupDragRef.current = null;
      }
      setDraggingId(primaryId);
    },
    [],
  );

  useEffect(() => {
    if (!draggingId) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const desktopBounds = desktopAreaRef.current?.getBoundingClientRect();
      if (!desktopBounds) {
        return;
      }

      const nextX = event.clientX - desktopBounds.left - dragOffset.current.x;
      const nextY = event.clientY - desktopBounds.top - dragOffset.current.y;
      const clamped = getClampedPosition(nextX, nextY);

      const group = desktopGroupDragRef.current;
      if (group && group.ids.length > 1 && draggingId) {
        const originPrimary = group.origins[draggingId];
        if (!originPrimary) {
          return;
        }
        const dx = clamped.x - originPrimary.x;
        const dy = clamped.y - originPrimary.y;
        setDesktopApps((prev) =>
          prev.map((app) => {
            if (!group.ids.includes(app.id)) {
              return app;
            }
            const o = group.origins[app.id];
            if (!o) {
              return app;
            }
            const moved = getClampedPosition(o.x + dx, o.y + dy);
            return { ...app, x: moved.x, y: moved.y };
          }),
        );
        return;
      }

      setDesktopApps((prev) =>
        prev.map((app) =>
          app.id === draggingId
            ? {
                ...app,
                x: clamped.x,
                y: clamped.y,
              }
            : app,
        ),
      );
    };

    const handlePointerUp = () => {
      const group = desktopGroupDragRef.current;
      setDesktopApps((prev) =>
        prev.map((app) => {
          const shouldSnap = group ? group.ids.includes(app.id) : app.id === draggingId;
          if (!shouldSnap) {
            return app;
          }
          const snapped = getSnappedPosition(app.x, app.y);
          return { ...app, x: snapped.x, y: snapped.y };
        }),
      );
      desktopGroupDragRef.current = null;
      setDraggingId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingId, getClampedPosition, getSnappedPosition]);


  const resolvePathToState = (path: ExplorerPath): { place: PlaceId; view: HomeView } => {
    if (path === "home/projects") {
      return { place: "home", view: "projects" };
    }
    return {
      place: path,
      view: path === "home" ? "root" : "root",
    };
  };

  const applyPath = (path: ExplorerPath) => {
    const next = resolvePathToState(path);
    setActivePlace(next.place);
    setHomeView(next.view);
    setPathInput(path);
    setSelectedExplorerItem(null);
  };

  const getCurrentExplorerPath = (): ExplorerPath => {
    if (activePlace === "home" && homeView === "projects") {
      return "home/projects";
    }
    return activePlace;
  };

  const navigateToPath = (path: ExplorerPath, options?: NavigatePathOptions) => {
    const shouldOpenInNewTab = options?.openInNewTab ?? true;
    applyPath(path);
    if (path === "home/projects") {
      void ensureGithubReposLoaded();
    }
    setIsExplorerClosing(false);
    setIsExplorerOpen(true);
    bringWindowToFront("explorer");
    setOpenExplorerPaths((prev) => {
      if (prev.includes(path)) {
        return prev;
      }
      if (shouldOpenInNewTab) {
        return [...prev, path];
      }
      if (prev.length === 0) {
        return [path];
      }
      const currentPath = getCurrentExplorerPath();
      const currentIndex = prev.indexOf(currentPath);
      const next = [...prev];
      if (currentIndex >= 0) {
        next[currentIndex] = path;
        return next;
      }
      next[next.length - 1] = path;
      return next;
    });

    if (!isExplorerOpen) {
      setPlaceHistory([path]);
      setHistoryIndex(0);
      return;
    }

    setPlaceHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      if (trimmed[trimmed.length - 1] === path) {
        return trimmed;
      }
      return [...trimmed, path];
    });
    setHistoryIndex((prev) => {
      if (placeHistory[prev] === path) {
        return prev;
      }
      return prev + 1;
    });
  };

  const openPlace = (place: PlaceId) => {
    navigateToPath(place);
  };

  const openNestedPath = (path: ExplorerPath) => {
    navigateToPath(path);
  };

  const openPlaceInCurrentExplorer = (place: PlaceId) => {
    navigateToPath(place, { openInNewTab: false });
  };

  const openNestedPathInCurrentExplorer = (path: ExplorerPath) => {
    navigateToPath(path, { openInNewTab: false });
  };

  const goBack = () => {
    if (historyIndex <= 0) {
      return;
    }
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    const nextPath = placeHistory[nextIndex];
    applyPath(nextPath);
  };

  const goForward = () => {
    if (historyIndex >= placeHistory.length - 1) {
      return;
    }
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    const nextPath = placeHistory[nextIndex];
    applyPath(nextPath);
  };

  const handleExplorerBack = () => {
    goBack();
  };

  const closeExplorer = () => {
    setIsExplorerClosing(true);
    window.setTimeout(() => {
      setIsExplorerOpen(false);
      setIsExplorerClosing(false);
      setOpenExplorerPaths([]);
    }, 180);
  };

  const closeExplorerTab = (path: ExplorerPath) => {
    setOpenExplorerPaths((prev) => {
      const remaining = prev.filter((item) => item !== path);
      if (remaining.length === 0) {
        setIsExplorerClosing(true);
        window.setTimeout(() => {
          setIsExplorerOpen(false);
          setIsExplorerClosing(false);
        }, 180);
        return [];
      }
      const currentPath = getCurrentExplorerPath();
      if (currentPath === path) {
        const nextPath = remaining[remaining.length - 1];
        applyPath(nextPath);
      }
      return remaining;
    });
  };

  const closeSettings = () => {
    setIsSettingsClosing(true);
    window.setTimeout(() => {
      setIsSettingsOpen(false);
      setIsSettingsClosing(false);
    }, 180);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    setIsSettingsClosing(false);
    bringWindowToFront("settings");
  };

  const toggleFullscreen = async () => {
    if (!explorerRef.current) {
      return;
    }
    if (!document.fullscreenElement) {
      await explorerRef.current.requestFullscreen();
      return;
    }
    setIsExitingFullscreen(true);
    window.setTimeout(async () => {
      await document.exitFullscreen();
      setIsExitingFullscreen(false);
    }, 160);
  };

  const closeMailer = () => {
    setIsMailerClosing(true);
    window.setTimeout(() => {
      setIsMailerOpen(false);
      setIsMailerClosing(false);
    }, 180);
  };

  const openMailer = () => {
    setIsMailerOpen(true);
    setIsMailerClosing(false);
    bringWindowToFront("mailer");
  };

  const closeSpotify = () => {
    setIsSpotifyClosing(true);
    window.setTimeout(() => {
      setIsSpotifyOpen(false);
      setIsSpotifyClosing(false);
    }, 180);
  };

  const openSpotify = () => {
    setIsSpotifyOpen(true);
    setIsSpotifyClosing(false);
    bringWindowToFront("spotify");
  };

  const closePdf = () => {
    setIsPdfClosing(true);
    window.setTimeout(() => {
      setIsPdfOpen(false);
      setIsPdfClosing(false);
    }, 180);
  };

  const openTerminal = () => {
    setIsTerminalOpen(true);
    setIsTerminalClosing(false);
    bringWindowToFront("terminal");
  };

  const closeTerminal = () => {
    setIsTerminalClosing(true);
    window.setTimeout(() => {
      setIsTerminalOpen(false);
      setIsTerminalClosing(false);
    }, 180);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(textFiles));
  }, [textFiles]);

  const ensureGithubReposLoaded = useCallback(async () => {
    if (githubRepos.length > 0 || githubLoading) {
      return;
    }
    setGithubLoading(true);
    setGithubError(null);
    const result = await loadGithubRepos();
    if (!result.success) {
      setGithubError(result.error);
      setGithubLoading(false);
      return;
    }
    setGithubRepos(result.repos);
    setGithubLoading(false);
  }, [githubLoading, githubRepos.length]);

  const typedBootLines = useMemo(() => {
    const totalChars = BOOT_LINES.reduce((sum, line) => sum + line.length, 0);
    const visibleCharCount = Math.floor((progress / 100) * totalChars);

    const result = BOOT_LINES.reduce(
      (acc, line) => {
        const visiblePart = line.slice(0, Math.max(0, Math.min(acc.remaining, line.length)));
        return {
          remaining: acc.remaining - line.length,
          lines: visiblePart.length > 0 ? [...acc.lines, visiblePart] : acc.lines,
        };
      },
      { remaining: visibleCharCount, lines: [] as string[] },
    );

    return result.lines;
  }, [progress]);

  const pathSuggestions = useMemo(() => {
    const query = pathInput.trim().toLowerCase();
    if (!query) {
      return EXPLORER_PATHS;
    }
    return EXPLORER_PATHS.filter((path) => path.startsWith(query));
  }, [pathInput]);

  const openPathFromInput = () => {
    const normalized = pathInput.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    const matched = EXPLORER_PATHS.find((path) => path === normalized);
    if (!matched) {
      return;
    }
    navigateToPath(matched, { openInNewTab: false });
  };

  const t = useMemo(() => getCopy(language), [language]);

  const showBlockedDeleteAlert = useCallback(() => {
    toast.warning(t.blockedDeleteBody);
  }, [t.blockedDeleteBody]);

  const createTextFile = () => {
    const id = crypto.randomUUID();
    const nextIndex = textFiles.length + 1;
    const nextFile: LocalTextFile = {
      id,
      name: `note-${nextIndex}.txt`,
      content: "",
      folder: "text",
    };
    setTextFiles((prev) => [nextFile, ...prev]);
    setEditorFileId(id);
    setEditorContent("");
    setEditorFileNameDraft(nextFile.name);
    setSavedEditorContent("");
    setDraftFileId(id);
    setIsTextEditorOpen(true);
    bringWindowToFront("textEditor");
  };

  const moveFileToTrash = useCallback(
    (fileId: string) => {
      setTextFiles((prev) =>
        prev.map((file) => {
          if (file.id !== fileId) {
            return file;
          }
          return { ...file, folder: "trash" };
        }),
      );
      if (editorFileId === fileId) {
        setIsTextEditorOpen(false);
        setIsTextEditorClosing(false);
        setEditorFileId(null);
        setEditorFileNameDraft("");
        setEditorContent("");
        setSavedEditorContent("");
      }
    },
    [editorFileId],
  );

  const deleteExplorerItems = useCallback(
    (itemIds: string[]) => {
      const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
      if (uniqueIds.length === 0) {
        return;
      }
      const selectedFiles = textFiles.filter((file) => uniqueIds.includes(file.id));
      if (selectedFiles.length === 0) {
        showBlockedDeleteAlert();
        return;
      }

      if (activePlace === "trash") {
        const trashFileIds = selectedFiles.filter((file) => file.folder === "trash").map((file) => file.id);
        if (trashFileIds.length === 0) {
          showBlockedDeleteAlert();
          return;
        }
        setTextFiles((prev) => prev.filter((file) => !trashFileIds.includes(file.id)));
        if (editorFileId && trashFileIds.includes(editorFileId)) {
          setIsTextEditorOpen(false);
          setIsTextEditorClosing(false);
          setEditorFileId(null);
          setEditorFileNameDraft("");
          setEditorContent("");
          setSavedEditorContent("");
        }
        return;
      }

      const movableIds = selectedFiles.filter((file) => file.folder !== "trash").map((file) => file.id);
      if (movableIds.length === 0) {
        showBlockedDeleteAlert();
        return;
      }
      movableIds.forEach((fileId) => moveFileToTrash(fileId));
    },
    [activePlace, editorFileId, moveFileToTrash, showBlockedDeleteAlert, textFiles],
  );

  const deleteSelectedItem = useCallback(() => {
    if (!selectedExplorerItem) {
      return;
    }
    const selectedFile = textFiles.find((file) => file.id === selectedExplorerItem);
    if (!selectedFile) {
      showBlockedDeleteAlert();
      return;
    }
    deleteExplorerItems([selectedFile.id]);
    setSelectedExplorerItem(null);
  }, [deleteExplorerItems, selectedExplorerItem, showBlockedDeleteAlert, textFiles]);

  const emptyTrash = useCallback(() => {
    setTextFiles((prev) => prev.filter((file) => file.folder !== "trash"));
    if (selectedExplorerItem) {
      const selectedFile = textFiles.find((file) => file.id === selectedExplorerItem);
      if (selectedFile?.folder === "trash") {
        setSelectedExplorerItem(null);
      }
    }
  }, [selectedExplorerItem, textFiles]);

  const openTextEditor = (fileId: string) => {
    const file = textFiles.find((item) => item.id === fileId);
    if (!file) {
      return;
    }
    setEditorFileId(fileId);
    setEditorFileNameDraft(file.name);
    setEditorContent(file.content);
    setSavedEditorContent(file.content);
    setIsTextEditorOpen(true);
    bringWindowToFront("textEditor");
  };

  const saveTextFile = useCallback(() => {
    if (!editorFileId) {
      return;
    }
    setIsSaving(true);
    setTextFiles((prev) =>
      prev.map((file) => {
        if (file.id !== editorFileId) {
          return file;
        }
        const trimmedName = editorFileNameDraft.trim();
        const nextName = trimmedName.length > 0 ? trimmedName : file.name;
        return { ...file, name: nextName, content: editorContent };
      }),
    );
    setSavedEditorContent(editorContent);
    setIsSaving(false);
    if (draftFileId === editorFileId) {
      setDraftFileId(null);
    }
  }, [draftFileId, editorContent, editorFileId, editorFileNameDraft]);

  const closeTextEditor = () => {
    const currentEditorFile = textFiles.find((file) => file.id === editorFileId);
    const hasUnsavedName =
      Boolean(currentEditorFile) &&
      editorFileNameDraft.trim().length > 0 &&
      editorFileNameDraft.trim() !== (currentEditorFile?.name ?? "");
    const hasUnsaved = editorContent !== savedEditorContent || hasUnsavedName;
    if (hasUnsaved) {
      setShowUnsavedDialog(true);
      return;
    }
    setIsTextEditorClosing(true);
    window.setTimeout(() => {
      setIsTextEditorOpen(false);
      setIsTextEditorClosing(false);
      setEditorFileId(null);
      setEditorContent("");
      setEditorFileNameDraft("");
      setSavedEditorContent("");
    }, 180);
  };

  const discardAndCloseEditor = () => {
    if (editorFileId && draftFileId === editorFileId) {
      setTextFiles((prev) => prev.filter((file) => file.id !== editorFileId));
      setDraftFileId(null);
    }
    setShowUnsavedDialog(false);
    setIsTextEditorClosing(true);
    window.setTimeout(() => {
      setIsTextEditorOpen(false);
      setIsTextEditorClosing(false);
      setEditorFileId(null);
      setEditorContent("");
      setEditorFileNameDraft("");
      setSavedEditorContent("");
    }, 180);
  };

  const saveAndCloseEditor = () => {
    saveTextFile();
    setShowUnsavedDialog(false);
    setIsTextEditorClosing(true);
    window.setTimeout(() => {
      setIsTextEditorOpen(false);
      setIsTextEditorClosing(false);
      setEditorFileId(null);
      setEditorContent("");
      setEditorFileNameDraft("");
      setSavedEditorContent("");
    }, 180);
  };

  useEffect(() => {
    if (!isTextEditorOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveTextFile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTextEditorOpen, saveTextFile]);

  useEffect(() => {
    if (!isTextEditorOpen || !editorFileId || editorContent === savedEditorContent) {
      return;
    }
    const timer = window.setTimeout(() => {
      saveTextFile();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [editorContent, editorFileId, isTextEditorOpen, saveTextFile, savedEditorContent]);

  const sendMail = () => {
    const parsed = mailSchema.safeParse({
      sender: mailSender.trim(),
      subject: mailSubject.trim(),
      message: mailBody.trim(),
    });
    if (!parsed.success) {
      window.alert(parsed.error.issues[0]?.message ?? "All fields are required.");
      return;
    }
    const subject = encodeURIComponent(parsed.data.subject);
    const body = encodeURIComponent(`From: ${parsed.data.sender}\n\n${parsed.data.message}`);
    window.location.href = `mailto:petar@example.com?subject=${subject}&body=${body}`;
  };

  const openPdf = () => {
    setIsPdfOpen(true);
    setIsPdfClosing(false);
    bringWindowToFront("pdf");
  };

  const dockApps = [
    { id: "home", icon: "🏠", onClick: () => openPlace("home") },
    { id: "music", icon: "🎵", onClick: openSpotify },
    { id: "text", icon: "🗂️", onClick: () => openPlace("text") },
    { id: "settings", icon: "⚙️", onClick: openSettings },
  ];

  const isDarkTheme = theme === "dark";
  const currentPath: ExplorerPath = activePlace === "home" && homeView === "projects" ? "home/projects" : activePlace;
  const canShowNewTextButton = NEW_TEXT_BUTTON_BY_PATH[currentPath];
  const homeTextFiles = textFiles.filter((file) => file.folder === "home");
  const textFolderFiles = textFiles.filter((file) => file.folder === "text");
  const trashFiles = textFiles.filter((file) => file.folder === "trash");
  const canDeleteSelectedItem = Boolean(selectedExplorerItem);
  const canEmptyTrash = trashFiles.length > 0;
  const currentEditorFile = textFiles.find((file) => file.id === editorFileId);
  const hasUnsavedName =
    Boolean(currentEditorFile) &&
    editorFileNameDraft.trim().length > 0 &&
    editorFileNameDraft.trim() !== (currentEditorFile?.name ?? "");
  const saveStatusLabel = isSaving ? "Saving..." : editorContent === savedEditorContent && !hasUnsavedName ? "Saved" : "Unsaved";
  const windowZIndices = {
    explorer: 40 + windowOrder.indexOf("explorer"),
    settings: 40 + windowOrder.indexOf("settings"),
    mailer: 40 + windowOrder.indexOf("mailer"),
    textEditor: 40 + windowOrder.indexOf("textEditor"),
    pdf: 40 + windowOrder.indexOf("pdf"),
    spotify: 40 + windowOrder.indexOf("spotify"),
    terminal: 40 + windowOrder.indexOf("terminal"),
  };
  const explorerFrame = isDarkTheme ? "bg-[#1e2234]/95 border-white/20 text-white" : "bg-[#f4efff]/95 border-black/15 text-[#1b1832]";
  const explorerHeader = isDarkTheme ? "bg-[#222634] border-white/15" : "bg-[#dde2f6] border-black/10";
  const explorerSidebar = isDarkTheme ? "bg-[#262943] border-white/15" : "bg-[#e9e5f8] border-black/10";
  const explorerContent = isDarkTheme ? "bg-[#1f2238]" : "bg-[#f5f2ff]";
  const explorerText = isDarkTheme ? "text-white/90" : "text-[#1d1830]";
  const explorerMuted = isDarkTheme ? "text-white/65" : "text-[#4f4768]";
  const explorerButton = isDarkTheme ? "bg-white/10 hover:bg-white/20" : "bg-black/10 hover:bg-black/15";
  const explorerItemActive = isDarkTheme ? "bg-white/15" : "bg-black/10";
  const explorerItemHover = isDarkTheme ? "hover:bg-white/10" : "hover:bg-black/10";

  return {
    state: {
      activePlace,
      clock,
      contextMenu,
      desktopApps,
      draggingId,
      draftFileId,
      editorContent,
      editorFileId,
      editorFileNameDraft,
      githubError,
      githubLoading,
      githubRepos,
      historyIndex,
      homeView,
      isBooting,
      awaitingBootReveal,
      bootTextFadeOut,
      isDarkTheme,
      isExitingFullscreen,
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
      isSaving,
      isSettingsClosing,
      isSettingsOpen,
      isTextEditorClosing,
      isTextEditorOpen,
      language,
      mailBody,
      mailSender,
      mailSubject,
      pathInput,
      placeHistory,
      openExplorerPaths,
      progress,
      currentPath,
      canShowNewTextButton,
      homeTextFiles,
      textFolderFiles,
      trashFiles,
      savedEditorContent,
      saveStatusLabel,
      canDeleteSelectedItem,
      canEmptyTrash,
      selectedAppId,
      selectedExplorerItem,
      showUnsavedDialog,
      t,
      textFiles,
      theme,
      typedBootLines,
      pathSuggestions,
      explorerFrame,
      explorerHeader,
      explorerSidebar,
      explorerContent,
      explorerText,
      explorerMuted,
      explorerButton,
      explorerItemActive,
      explorerItemHover,
      windowZIndices,
    },
    refs: {
      desktopAreaRef,
      explorerRef,
      dragOffset,
    },
    actions: {
      closeExplorer,
      closeExplorerTab,
      closeMailer,
      closePdf,
      closeSpotify,
      closeSettings,
      closeTextEditor,
      closeTerminal,
      createTextFile,
      discardAndCloseEditor,
      deleteSelectedItem,
      deleteExplorerItems,
      emptyTrash,
      goForward,
      handleExplorerBack,
      openPlace,
      openPdf,
      openNestedPath,
      openNestedPathInCurrentExplorer,
      openMailer,
      openPathFromInput,
      openSettings,
      openSpotify,
      openPlaceInCurrentExplorer,
      openTextEditor,
      openTerminal,
      ensureGithubReposLoaded,
      saveAndCloseEditor,
      saveTextFile,
      sendMail,
      setActivePlace,
      setContextMenu,
      setDraggingId,
      beginDesktopDrag,
      setEditorContent,
      setEditorFileNameDraft,
      setHomeView,
      setIsMailerOpen,
      setIsSpotifyOpen,
      setIsPathFocused,
      setIsSettingsOpen,
      setLanguage,
      setMailBody,
      setMailSender,
      setMailSubject,
      setPathInput,
      setOpenExplorerPaths,
      setSelectedAppId,
      setSelectedExplorerItem,
      setShowUnsavedDialog,
      setTheme,
      setIsTerminalOpen,
      setDesktopApps,
      toggleFullscreen,
      bringWindowToFront,
      completeBoot,
    },
    helpers: {
      getClampedPosition,
      dockApps,
    },
  };
};

export type HomePageController = ReturnType<typeof useHomePageController>;
