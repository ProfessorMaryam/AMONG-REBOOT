import { useState, useEffect, useRef } from "react";

/**
 * Synced countdown timer hook.
 * When phaseStartedAt is provided, calculates remaining time from the server timestamp
 * so all clients stay in sync regardless of when they joined the phase.
 *
 * @param {number} seconds - Total duration of the phase in seconds
 * @param {boolean} active - Whether timer should be running
 * @param {Function} onDone - Callback when timer reaches 0
 * @param {number|null} phaseStartedAt - Server epoch ms when phase started (for sync)
 * @returns {number} Current time remaining in seconds
 */
export function useTimer(seconds, active, onDone, phaseStartedAt = null) {
  function calcRemaining() {
    if (phaseStartedAt) {
      const elapsed = Math.floor((Date.now() - phaseStartedAt) / 1000);
      return Math.max(0, seconds - elapsed);
    }
    return seconds;
  }

  const [t, setT] = useState(calcRemaining);
  const doneRef = useRef(false);
  const intervalRef = useRef(null);

  // Recalculate when phaseStartedAt or seconds changes (new phase)
  useEffect(() => {
    doneRef.current = false;
    setT(calcRemaining());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseStartedAt, seconds]);

  useEffect(() => {
    if (!active) return;

    intervalRef.current = setInterval(() => {
      setT(() => {
        const remaining = calcRemaining();
        if (remaining <= 0 && !doneRef.current) {
          doneRef.current = true;
          clearInterval(intervalRef.current);
          onDone && onDone();
          return 0;
        }
        return remaining;
      });
    }, 500); // tick every 500ms for responsiveness

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phaseStartedAt, seconds]);

  return t;
}
