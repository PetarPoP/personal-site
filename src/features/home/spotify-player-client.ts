import { spotifyPlayerResponseSchema } from "@/features/home/spotify-player-schema";

export type SpotifyPlayerAction = "previous" | "pause" | "next";

type LoadSpotifyPlayerResult =
  | { success: true; player: ReturnType<typeof spotifyPlayerResponseSchema.parse>["player"] }
  | { success: false; error: string };

export const loadSpotifyPlayer = async (): Promise<LoadSpotifyPlayerResult> => {
  try {
    const response = await fetch("/api/spotify-player", { cache: "no-store" });
    const json = await response.json();
    const parsed = spotifyPlayerResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: "Invalid Spotify response format." };
    }
    if (!response.ok) {
      return { success: false, error: parsed.data.error ?? "Failed to load Spotify player." };
    }
    return { success: true, player: parsed.data.player };
  } catch {
    return { success: false, error: "Failed to load Spotify player." };
  }
};

export const controlSpotifyPlayer = async (action: SpotifyPlayerAction): Promise<{ success: true } | { success: false; error: string }> => {
  try {
    const response = await fetch("/api/spotify-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok) {
      return { success: true };
    }
    const json = await response.json().catch(() => ({ error: "Failed to control Spotify player." }));
    const parsed = spotifyPlayerResponseSchema.safeParse(json);
    if (parsed.success && parsed.data.error) {
      return { success: false, error: parsed.data.error };
    }
    return { success: false, error: "Failed to control Spotify player." };
  } catch {
    return { success: false, error: "Failed to control Spotify player." };
  }
};
