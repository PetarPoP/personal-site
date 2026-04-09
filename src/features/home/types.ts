export type DesktopApp = {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
};

export type PlaceId = "home" | "computer" | "trash" | "text" | "images";
export type ExplorerPath = PlaceId | "home/projects";
export type ThemeMode = "dark" | "light";
export type Language = "en" | "hr";
export type HomeView = "root" | "projects";

export type LocalTextFile = {
  id: string;
  name: string;
  content: string;
  folder: "home" | "text" | "trash";
};

export type GithubRepo = {
  name: string;
  url: string;
};

export type ContextMenuPosition = {
  x: number;
  y: number;
};
