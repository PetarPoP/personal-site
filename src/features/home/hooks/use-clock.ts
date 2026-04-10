"use client";

import { useEffect, useState } from "react";

export const useClock = () => {
  const [clock, setClock] = useState("");

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
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return clock;
};
