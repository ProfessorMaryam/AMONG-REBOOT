import { Header } from "../Header";

/**
 * Vote results view - Like Among Us, don't reveal if eliminated player was impostor
 */
export function ResultView({ gs, top, connected, onLogout }) {
  return (
    <div className="screen">
      <div className="card">
        <Header
          title="Results"
          sub={`Round ${gs.round}`}
          round={gs.round}
          phase="result"
          connected={connected}
          onLogout={onLogout}
        />
        <div className="result-box">
          <div
            style={{
              fontSize: "0.8rem",
              letterSpacing: 3,
              color: "var(--muted)",
            }}
          >
            MOST VOTED
          </div>
          <div className="result-name">{top || "No votes"}</div>
          {top && <div className="result-icon">👤</div>}
          {top && (
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--muted)",
                marginTop: 8,
              }}
            >
              {top} will be eliminated
            </div>
          )}
        </div>
        <div className="waiting-msg" style={{ marginTop: 16 }}>
          ⏳ Waiting for admin to eliminate and continue...
        </div>
      </div>
    </div>
  );
}
