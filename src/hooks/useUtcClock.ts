import { useEffect, useState } from 'react';

/** Wall clock updated once per second, formatted as UTC `HH:MM:SS`. */
export function useUtcClock(intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
