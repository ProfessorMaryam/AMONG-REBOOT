import { useTimer } from "../hooks/useTimer";

/**
 * Timer component with visual countdown, synced via phaseStartedAt
 * @param {number} seconds - Total seconds for countdown
 * @param {string} label - Label to display below timer
 * @param {Function} onDone - Callback when timer completes
 * @param {number|null} phaseStartedAt - Server epoch ms when phase started
 */
export function Timer({ seconds, label, onDone, phaseStartedAt }) {
  const t = useTimer(seconds, true, onDone, phaseStartedAt);

  // Debug: Log timer props on mount and when phaseStartedAt changes
  console.log("[Timer] Rendering with:", {
    seconds,
    phaseStartedAt,
    currentTime: t,
  });

  return (
    <div className="timer-wrap">
      <div className="timer-num">{t}s</div>
      <div className="timer-bar">
        <div
          className="timer-fill"
          style={{ width: `${(t / seconds) * 100}%` }}
        />
      </div>
      {label && <div className="timer-label">{label}</div>}
    </div>
  );
}
