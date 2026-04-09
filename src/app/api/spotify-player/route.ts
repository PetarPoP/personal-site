import { NextResponse } from "next/server";
import * as z from "zod";

import { getServerEnv } from "@/lib/env";
import { spotifyPlayerSchema } from "@/features/home/spotify-player-schema";

const spotifyTokenSchema = z.object({
  access_token: z.string().min(1),
});

const spotifyPlaybackStateSchema = z.object({
  is_playing: z.boolean(),
  progress_ms: z.number().int().nonnegative().nullable(),
  item: z
    .object({
      name: z.string(),
      duration_ms: z.number().int().positive(),
      artists: z.array(z.object({ name: z.string() })).min(1),
      album: z.object({
        images: z.array(z.object({ url: z.string().url() })),
      }),
    })
    .nullable(),
});

const spotifyControlSchema = z.object({
  action: z.enum(["previous", "pause", "next"]),
});

const spotifyResponseError = (status: number, message: string) => {
  return NextResponse.json({ player: null, error: message }, { status });
};

const getAccessToken = async (): Promise<{ token: string | null; errorMessage?: string }> => {
  const env = getServerEnv();
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
    return { token: null, errorMessage: "Missing Spotify env vars." };
  }

  const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Spotify token refresh failed", {
      status: tokenResponse.status,
      body: errorText,
    });
    return {
      token: null,
      errorMessage: "Spotify auth is currently unavailable.",
    };
  }

  const tokenJson = await tokenResponse.json();
  const parsed = spotifyTokenSchema.safeParse(tokenJson);
  if (!parsed.success) {
    return { token: null, errorMessage: "Spotify token response is invalid." };
  }
  return { token: parsed.data.access_token };
};

const fetchPlaybackState = async (token: string) => {
  return fetch("https://api.spotify.com/v1/me/player", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
};

export async function GET() {
  try {
    const accessTokenResult = await getAccessToken();
    if (!accessTokenResult.token) {
      return spotifyResponseError(503, accessTokenResult.errorMessage ?? "Spotify is not configured. Add Spotify credentials to env.");
    }

    let response = await fetchPlaybackState(accessTokenResult.token);
    if (response.status === 401) {
      const firstBody = await response.text();
      console.error("Spotify playback request unauthorized (first try)", {
        status: response.status,
        body: firstBody,
      });
      const retryTokenResult = await getAccessToken();
      if (!retryTokenResult.token) {
        return spotifyResponseError(503, retryTokenResult.errorMessage ?? "Spotify is not configured. Add Spotify credentials to env.");
      }
      response = await fetchPlaybackState(retryTokenResult.token);
    }

    if (response.status === 204) {
      return NextResponse.json({ player: null });
    }

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      const knownBody = await response.text();
      console.error("Spotify playback unavailable", {
        status: response.status,
        body: knownBody,
      });
      return NextResponse.json({ player: null });
    }

    if (!response.ok) {
      const responseBody = await response.text();
      console.error("Spotify playback request failed", {
        status: response.status,
        body: responseBody,
      });
      return spotifyResponseError(response.status, "Spotify player is temporarily unavailable.");
    }

    const json = await response.json();
    const parsed = spotifyPlaybackStateSchema.safeParse(json);
    if (!parsed.success) {
      return spotifyResponseError(500, "Invalid Spotify player response.");
    }

    if (!parsed.data.item) {
      return NextResponse.json({ player: null });
    }

    const player = spotifyPlayerSchema.parse({
      trackName: parsed.data.item.name,
      artistName: parsed.data.item.artists.map((artist) => artist.name).join(", "),
      albumImageUrl: parsed.data.item.album.images[0]?.url ?? null,
      isPlaying: parsed.data.is_playing,
      progressMs: parsed.data.progress_ms ?? 0,
      durationMs: parsed.data.item.duration_ms,
    });

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Unexpected Spotify GET error", error);
    if (error instanceof z.ZodError) {
      return spotifyResponseError(500, error.issues[0]?.message ?? "Invalid Spotify response.");
    }
    return spotifyResponseError(500, "Unexpected error while loading Spotify player.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = spotifyControlSchema.safeParse(body);
    if (!parsedBody.success) {
      return spotifyResponseError(400, parsedBody.error.issues[0]?.message ?? "Invalid action.");
    }

    const accessTokenResult = await getAccessToken();
    if (!accessTokenResult.token) {
      return spotifyResponseError(503, accessTokenResult.errorMessage ?? "Spotify is not configured. Add Spotify credentials to env.");
    }

    const endpointByAction: Record<z.infer<typeof spotifyControlSchema>["action"], string> = {
      previous: "previous",
      pause: "pause",
      next: "next",
    };
    const action = parsedBody.data.action;
    const response = await fetch(`https://api.spotify.com/v1/me/player/${endpointByAction[action]}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessTokenResult.token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error("Spotify playback control failed", {
        status: response.status,
        body: responseBody,
      });
      return spotifyResponseError(response.status, "Spotify player control failed.");
    }

    return NextResponse.json({ player: null });
  } catch (error) {
    console.error("Unexpected Spotify POST error", error);
    return spotifyResponseError(500, "Unexpected error while controlling Spotify playback.");
  }
}
