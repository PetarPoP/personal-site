import { spotifyPlayerResponseSchema } from "@/features/home/spotify-player-schema";
import { requestJson } from "@/features/home/api-client";

export type SpotifyPlayerAction = "previous" | "pause" | "next";

type LoadSpotifyPlayerResult =
  | { success: true; player: ReturnType<typeof spotifyPlayerResponseSchema.parse>["player"] }
  | { success: false; error: string };

export const loadSpotifyPlayer = async (): Promise<LoadSpotifyPlayerResult> => {
  const result = await requestJson({
    input: "/api/spotify-player",
    init: { cache: "no-store" },
    parse: (json) => {
      const parsed = spotifyPlayerResponseSchema.safeParse(json);
      if (!parsed.success) {
        return { success: false };
      }
      return { success: true, data: parsed.data };
    },
    invalidMessage: "Invalid Spotify response format.",
    fallbackError: "Failed to load Spotify player.",
  });
  if (!result.success) {
    return result;
  }
  const data = result.data;
  if (!data) {
    return { success: false, error: "Invalid Spotify response format." };
  }
  return { success: true, player: data.player };
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
