import { Header } from "../Header";
import { Timer } from "../Timer";
import { getAvatar } from "../../utils/gameHelpers";

/**
 * Discussion phase view — 60s synced timer, server auto-advances to vote
 */
export function DiscussView({ gs, activeRoster, connected, onLogout }) {
  return (
    <div className="screen">
      <div className="card">
        <Header
          title="Discussion"
          sub={`Round ${gs.round} · Talk it out!`}
          round={gs.round}
          phase="discuss"
          connected={connected}
          onLogout={onLogout}
        />
        <div style={{ padding: 20, background: "#0d0d1a", borderRadius: 8, border: "1px solid var(--border)", textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🗣️</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: 1 }}>
            Discuss with your group!
          </div>
          <div style={{ color: "var(--muted)", marginTop: 6, fontSize: "0.9rem" }}>
            Who do you think the impostor is? Share your suspicions.
          </div>
        </div>
        <div className="section-label">The Suspects</div>
        <div className="suspect-grid">
          {activeRoster.map(p => (
            <div key={p.name} className="player-chip">
              <div className="av">{getAvatar(p.name) ? <img src={getAvatar(p.name)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🧑‍💼"}</div>
              <div>{p.name}</div>
            </div>
          ))}
        </div>
        <Timer
          seconds={60}
          label="DISCUSSION TIME — VOTING OPENS AUTOMATICALLY"
          phaseStartedAt={gs.phaseStartedAt}
          onDone={() => {}}
        />
        <div className="waiting-msg">⏳ Voting opens automatically when timer ends...</div>
      </div>
    </div>
  );
}

