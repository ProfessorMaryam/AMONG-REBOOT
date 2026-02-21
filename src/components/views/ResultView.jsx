import { Header } from "../Header";

/**
 * Vote results view - reveals if eliminated player is innocent or impostor
 */
export function ResultView({ gs, top, connected, onLogout }) {
  const isImpostor = top && gs.impostors && gs.impostors.includes(top);

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
          <div style={{ fontSize: "0.8rem", letterSpacing: 3, color: "var(--muted)" }}>
            MOST VOTED
          </div>
          <div className="result-name">{top || "No votes"}</div>

          {top && (
            <>
              {/* Impostor / Innocent reveal */}
              <div style={{
                margin: "14px auto",
                padding: "18px 28px",
                borderRadius: 12,
                background: isImpostor ? "rgba(230,57,70,0.12)" : "rgba(74,222,128,0.1)",
                border: `2px solid ${isImpostor ? "var(--red)" : "var(--safe)"}`,
                display: "inline-block",
                minWidth: 220,
              }}>
                <div style={{ fontSize: "3rem", marginBottom: 6 }}>
                  {isImpostor ? "🔪" : "😇"}
                </div>
                <div style={{
                  fontFamily: "'Creepster', cursive",
                  fontSize: "2rem",
                  letterSpacing: 3,
                  color: isImpostor ? "var(--red)" : "var(--safe)",
                  textShadow: isImpostor
                    ? "0 0 20px var(--glow)"
                    : "0 0 20px rgba(74,222,128,0.5)",
                }}>
                  {isImpostor ? "IMPOSTOR!" : "INNOCENT"}
                </div>
                <div style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  marginTop: 6,
                  letterSpacing: 1,
                }}>
                  {isImpostor
                    ? `${top} was one of the killers.`
                    : `${top} was innocent. Wrong call!`}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="waiting-msg" style={{ marginTop: 16 }}>
          ⏳ Waiting for admin to eliminate and continue...
        </div>
      </div>
    </div>
  );
}
