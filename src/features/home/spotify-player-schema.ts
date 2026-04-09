import * as z from "zod";

export const spotifyPlayerSchema = z.object({
  trackName: z.string(),
  artistName: z.string(),
  albumImageUrl: z.string().url().nullable(),
  isPlaying: z.boolean(),
  progressMs: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
});

export const spotifyPlayerResponseSchema = z.object({
  player: spotifyPlayerSchema.nullable(),
  error: z.string().optional(),
});

export type SpotifyPlayer = z.infer<typeof spotifyPlayerSchema>;
