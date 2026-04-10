"use client";

import { useCallback, useEffect, useState } from "react";

type UseBootSequenceResult = {
  isBooting: boolean;
  awaitingBootReveal: boolean;
  bootTextFadeOut: boolean;
  progress: number;
  completeBoot: () => void;
};

export const useBootSequence = (initialRoutePath: string | null): UseBootSequenceResult => {
  const [isBooting, setIsBooting] = useState(initialRoutePath === null);
  const [awaitingBootReveal, setAwaitingBootReveal] = useState(false);
  const [bootTextFadeOut, setBootTextFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

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

  return {
    isBooting,
    awaitingBootReveal,
    bootTextFadeOut,
    progress,
    completeBoot,
  };
};
