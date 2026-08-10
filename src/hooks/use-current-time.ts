"use client";

import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 30_000;

export function useCurrentTime(): number {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const refresh = () => setCurrentTime(Date.now());
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };
    const start = () => {
      stop();
      if (document.visibilityState !== "visible") return;
      refresh();
      intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => start();
    const handleFocus = () => refresh();

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return currentTime;
}
