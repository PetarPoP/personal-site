import type { DesktopApp, ExplorerPath, PlaceId } from "@/features/home/types";

export const BOOT_LINES = [
  "Starting popOS display manager... [ OK ]",
  "Loading GNOME shell modules... [ OK ]",
  "Checking system dependencies... [ OK ]",
  "Loading system services... [ OK ]",
  "Checking system services... [ OK ]",
  "Checking system services... [ OK ]",
  "Checking user profile: pop [ OK ]",
  "Launching desktop session... [ OK ] ",
];

export const STORAGE_KEY = "popos-local-text-files";

export const GRID = {
  startX: 20,
  startY: 20,
  colWidth: 92,
  rowHeight: 96,
  iconWidth: 80,
  iconHeight: 84,
  padding: 8,
};

/** Snaps a desktop icon position to the grid; uses width/height of the desktop area in px. */
export function snapDesktopPositionToGrid(
  x: number,
  y: number,
  areaWidth: number,
  areaHeight: number,
): { x: number; y: number } {
  const maxX = Math.max(GRID.startX, areaWidth - GRID.iconWidth - GRID.padding);
  const maxY = Math.max(GRID.startY, areaHeight - GRID.iconHeight - GRID.padding);
  const clampedX = Math.max(GRID.padding, Math.min(x, maxX));
  const clampedY = Math.max(GRID.padding, Math.min(y, maxY));
  const col = Math.max(0, Math.round((clampedX - GRID.startX) / GRID.colWidth));
  const row = Math.max(0, Math.round((clampedY - GRID.startY) / GRID.rowHeight));
  return {
    x: GRID.startX + col * GRID.colWidth,
    y: GRID.startY + row * GRID.rowHeight,
  };
}

export const INITIAL_DESKTOP_APPS: DesktopApp[] = [
  { id: "home", name: "Home", icon: "🏠", x: GRID.startX, y: GRID.startY },
  { id: "computer", name: "Computer", icon: "🖥️", x: GRID.startX, y: GRID.startY + GRID.rowHeight },
  { id: "text", name: "Text", icon: "🗂️", x: GRID.startX, y: GRID.startY + GRID.rowHeight * 2 },
  { id: "images", name: "Images", icon: "🖼️", x: GRID.startX, y: GRID.startY + GRID.rowHeight * 3 },
  { id: "spotify", name: "spotify.exe", icon: "🎵", x: GRID.startX, y: GRID.startY + GRID.rowHeight * 4 },
  { id: "mailer", name: "mailer.exe", icon: "⚙️", x: GRID.startX, y: GRID.startY + GRID.rowHeight * 5 },
  { id: "terminal", name: "terminal", icon: "🖳", x: GRID.startX, y: GRID.startY + GRID.rowHeight * 6 },
  { id: "trash", name: "Trash", icon: "🗑️", x: -1, y: -1 },
];

export const PLACE_IDS: PlaceId[] = ["home", "computer", "trash", "text", "images"];
export const EXPLORER_PATHS: ExplorerPath[] = ["home", "home/projects", "computer", "trash", "text", "images"];

export const NEW_TEXT_BUTTON_BY_PATH: Record<ExplorerPath, boolean> = {
  home: false,
  "home/projects": false,
  computer: false,
  trash: false,
  text: true,
  images: false,
};

export const HOME_DEFAULT_TEXT_CONTENT =
  "Zdravo! Ja sam pop i ovo je moj portfolio desktop.\n\nOvdje ce ici moj CV i detaljan 'o meni' sadrzaj.";
