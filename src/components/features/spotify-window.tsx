"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppWindowShell } from "@/components/features/app-window-shell";
import { loadSpotifyPlayer } from "@/features/home/spotify-player-client";
import type { SpotifyPlayer } from "@/features/home/spotify-player-schema";

type SpotifyWindowProps = {
  open: boolean;
  closing: boolean;
  title: string;
  closeLabel: string;
  fullLabel: string;
  noSongLabel: string;
  genericErrorLabel: string;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
};

export function SpotifyWindow({
  open,
  closing,
  title,
  closeLabel,
  fullLabel,
  noSongLabel,
  genericErrorLabel,
  zIndex,
  onFocus,
  onClose,
}: SpotifyWindowProps) {
  const FAST_POLL_MS = 20000;
  const SLOW_POLL_MS = 45000;
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uiProgressMs, setUiProgressMs] = useState(0);

  const refreshPlayer = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading ?? true) {
      setLoading(true);
    }
    const result = await loadSpotifyPlayer();
    if (!result.success) {
      console.error("Spotify player request failed:", result.error);
      setError(result.error);
      setPlayer(null);
      setLoading(false);
      return false;
    }
    setError(null);
    setPlayer(result.player);
    setUiProgressMs(result.player?.progressMs ?? 0);
    setLoading(false);
    return true;
  }, []);

  useEffect(() => {
    if (!open || !player?.isPlaying) {
      return;
    }
    const tick = window.setInterval(() => {
      setUiProgressMs((prev) => {
        const next = prev + 1000;
        if (!player.durationMs) {
          return next;
        }
        return Math.min(next, player.durationMs);
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [open, player?.durationMs, player?.isPlaying]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let disposed = false;
    let retryCount = 0;
    let nextTimer: number | null = null;
    const schedulePoll = async () => {
      const success = await refreshPlayer({ showLoading: retryCount === 0 });
      if (disposed) {
        return;
      }
      retryCount = success ? 0 : retryCount + 1;
      const delay = retryCount === 0 ? FAST_POLL_MS : SLOW_POLL_MS;
      nextTimer = window.setTimeout(() => {
        void schedulePoll();
      }, delay);
    };
    nextTimer = window.setTimeout(() => {
      void schedulePoll();
    }, 0);
    return () => {
      disposed = true;
      if (nextTimer !== null) {
        window.clearTimeout(nextTimer);
      }
    };
  }, [open, refreshPlayer]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/70">Loading Spotify...</p>
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-red-200">{genericErrorLabel}</p>;
    }
    if (!player) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="h-44 w-44 animate-pulse rounded-xl border border-white/20 bg-white/10" />
            <div className="w-full max-w-xs space-y-2">
              <div className="mx-auto h-7 w-40 animate-pulse rounded bg-white/15" />
              <div className="mx-auto h-5 w-28 animate-pulse rounded bg-white/10" />
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
              {noSongLabel}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-0 rounded-full bg-[#1db954]" />
            </div>
            <div className="flex items-center justify-between text-xs text-white/65">
              <span>0:00</span>
              <span>0:00</span>
            </div>
          </div>
        </div>
      );
    }

    const durationMs = Math.max(player.durationMs, 1);
    const clampedProgress = Math.max(0, Math.min(uiProgressMs, durationMs));
    const progressPercent = (clampedProgress / durationMs) * 100;
    const formatMs = (valueMs: number) => {
      const totalSeconds = Math.floor(valueMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {player.albumImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.albumImageUrl}
              alt={`${player.trackName} cover`}
              className="h-44 w-44 rounded-xl border border-white/20 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-4xl">
              🎵
            </div>
          )}
          <div className="space-y-1">
            <p className="text-2xl font-semibold leading-tight text-white">{player.trackName}</p>
            <p className="text-base text-white/75">{player.artistName}</p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
            {player.isPlaying ? "Now playing" : "Paused"}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#44d463] to-[#1db954] transition-[width] duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-white/65">
            <span>{formatMs(clampedProgress)}</span>
            <span>{formatMs(durationMs)}</span>
          </div>
        </div>
      </div>
    );
  }, [error, genericErrorLabel, loading, noSongLabel, player, uiProgressMs]);

  return (
    <AppWindowShell
      open={open}
      closing={closing}
      title={title}
      fullLabel={fullLabel}
      closeLabel={closeLabel}
      className="h-[66vh] w-full max-w-2xl rounded-xl border border-white/20 bg-[#1c1f2f]/95 shadow-2xl"
      zIndex={zIndex}
      onFocus={onFocus}
      onClose={onClose}
    >
      <div className="flex-1 min-h-0 p-3">
        <div className="flex h-full min-h-0 flex-col rounded-lg border border-white/15 bg-black/20 p-5">
          {content}
        </div>
      </div>
    </AppWindowShell>
  );
}
