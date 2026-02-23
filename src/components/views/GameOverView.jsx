import { getAvatar } from "../../utils/gameHelpers";

/**
 * Game over view
 */
export function GameOverView({ gs, onLogout }) {
  const impostorsWon = gs.gameOver === "impostors";

  return (
    <div className="screen">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            className="btn ghost"
            style={{ width: "auto", padding: "6px 16px", fontSize: "0.78rem", letterSpacing: 1 }}
            onClick={onLogout}
          >
            Sign Out
          </button>
        </div>
        <div className="gameover-box">
          <div className={`gameover-title ${impostorsWon ? "red" : "green"}`}>
            {impostorsWon ? "IMPOSTORS WIN" : "INNOCENTS WIN"}
          </div>
          <div style={{ fontSize: "4rem", margin: "16px 0" }}>
            {impostorsWon ? "🔪" : "🎉"}
          </div>
          <div style={{ color: "var(--muted)", marginBottom: 24, fontSize: "1rem" }}>
            {impostorsWon ? "The killers were never caught..." : "Justice has been served!"}
          </div>
          <div className="section-label">The Impostors Were</div>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 8
            }}
          >
            {gs.impostors.map(name => (
              <div key={name} className="player-chip impostor-chip">
                <div className="av">{getAvatar(name) ? <img src={getAvatar(name)} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🧑‍💼"}</div>
                <div>{name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

