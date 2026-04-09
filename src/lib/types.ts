export type DesktopApp = {
  id: "home" | "trash" | "computer";
  name: string;
  icon: string;
  x: number;
  y: number;
};

export type PlaceId = "home" | "computer" | "trash" | "text";
export type ThemeMode = "dark" | "light";
export type Language = "en" | "hr";

export type LocalTextFile = {
  id: string;
  name: string;
  content: string;
};

export type ContextMenuState = {
  x: number;
  y: number;
};
