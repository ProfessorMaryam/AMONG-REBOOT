import { Header } from "../Header";
import { getAvatar } from "../../utils/gameHelpers";

/**
 * Lobby waiting room view
 */
export function LobbyView({ gs, username, connected, onLogout }) {
  return (
    <div className="screen">
      <div className="card">
        <Header
          title="Waiting Room"
          sub="Game hasn't started yet"
          phase="lobby"
          connected={connected}
          onLogout={onLogout}
        />
        <div style={{ color: "var(--muted)", marginBottom: 16 }}>
          <span className="status-dot" />
          Waiting for admin to start the game...
        </div>
        <div className="section-label">Players Ready ({gs.lobby?.length || 0})</div>
        <div className="player-grid">
          {(gs.lobby || []).map(p => (
            <div key={p.name} className="player-chip">
              <div className="av">{getAvatar(p.name)}</div>
              <div>{p.name}</div>
              {p.name === username && (
                <div style={{ fontSize: "0.65rem", color: "var(--safe)", marginTop: 2 }}>
                  YOU
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

