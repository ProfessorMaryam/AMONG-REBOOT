import { useGameServer } from "../hooks/useGameServer";
import { tallyVotes, getAvatar } from "../utils/gameHelpers";
import { ConnWarn } from "./ConnWarn";
import { Header } from "./Header";

/**
 * Admin dashboard for game control
 */
export function AdminDashboard({ onLogout }) {
  const { gs, connected, send } = useGameServer("haaljafen", true);
  const { counts, top } = tallyVotes(gs.votes);
  const activeRoster = gs.roster
    ? gs.roster.filter((p) => !gs.eliminated.includes(p.name))
    : [];
  const totalVoters = gs.lobby ? gs.lobby.length : 0;

  // Calculate game status
  const impostorsLeft = gs.impostors
    ? gs.impostors.filter((i) => !gs.eliminated.includes(i))
    : [];
  const innocentsLeft = activeRoster.filter(
    (p) => !gs.impostors.includes(p.name),
  );

  return (
    <>
      <ConnWarn connected={connected} />
      <div className="screen">
        {/* Header + controls */}
        <div className="card">
          <Header
            title="Admin Dashboard"
            sub="Game Control Center"
            round={gs.round}
            phase={gs.phase}
            connected={connected}
            onLogout={onLogout}
          />

          <div className="admin-controls">
            {gs.phase === "lobby" && (
              <button
                className="btn green"
                onClick={() => send({ type: "startgame" })}
              >
                🚀 Start Game
              </button>
            )}
            {gs.phase === "story" && (
              <button
                className="btn yellow"
                onClick={() =>
                  send({ type: "update", patch: { phase: "discuss" } })
                }
              >
                🗣️ Start Discussion
              </button>
            )}
            {gs.phase === "discuss" && (
              <button
                className="btn yellow"
                onClick={() => send({ type: "startvote" })}
              >
                🗳️ Force Start Voting (skip timer)
              </button>
            )}
            {gs.phase === "puzzle" && (
              <button
                className="btn yellow"
                onClick={() =>
                  send({ type: "update", patch: { phase: "discuss" } })
                }
              >
                🧩 Continue to Discussion
              </button>
            )}
            {gs.phase === "wallet" && (
              <button
                className="btn yellow"
                onClick={() =>
                  send({ type: "update", patch: { phase: "discuss" } })
                }
              >
                👜 Skip Wallet — Go to Discussion
              </button>
            )}
            {gs.phase === "vote" && (
              <button
                className="btn"
                onClick={() => send({ type: "showresult" })}
              >
                📊 Show Results (skip timer)
              </button>
            )}
            {gs.phase === "result" && top && (
              <button
                className="btn"
                onClick={() => send({ type: "kick", target: top })}
              >
                🔨 Eliminate {top} ({counts[top]} votes) → Next Round
              </button>
            )}
            {gs.phase === "gameover" && (
              <button
                className="btn ghost"
                onClick={() => send({ type: "reset" })}
              >
                🔄 Reset Game
              </button>
            )}
            {/* Reset always available outside lobby and gameover */}
            {gs.phase !== "lobby" && gs.phase !== "gameover" && (
              <button
                className="btn ghost"
                onClick={() => send({ type: "reset" })}
              >
                🔄 Reset Game
              </button>
            )}
          </div>
        </div>

        {/* Logged-in players */}
        <div className="card">
          <div className="section-label">
            Players in Lobby ({totalVoters} logged in)
          </div>
          {totalVoters === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              No players connected yet...
            </div>
          ) : (
            <div className="player-grid">
              {gs.lobby.map((p) => (
                <div key={p.name} className="player-chip">
                  <div className="av">{getAvatar(p.name)}</div>
                  <div>{p.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game Status */}
        {gs.phase !== "lobby" && (
          <div className="card">
            <div className="section-label">Game Status</div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <div
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#0d0d1a",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginBottom: 4,
                  }}
                >
                  IMPOSTORS LEFT
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--red)",
                  }}
                >
                  {impostorsLeft.length} / 2
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                    marginTop: 4,
                  }}
                >
                  {impostorsLeft.map((name) => name).join(", ") ||
                    "All eliminated"}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#0d0d1a",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginBottom: 4,
                  }}
                >
                  INNOCENTS LEFT
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--safe)",
                  }}
                >
                  {innocentsLeft.length}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                    marginTop: 4,
                  }}
                >
                  {innocentsLeft.map((p) => p.name).join(", ") ||
                    "All eliminated"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RTC Roster */}
        {gs.phase !== "lobby" && (
          <div className="card">
            <div className="section-label">
              RTC Suspects ({activeRoster.length} remaining)
            </div>
            <div className="player-grid">
              {gs.roster &&
                gs.roster.map((p) => {
                  const isElim = gs.eliminated.includes(p.name);
                  return (
                    <div
                      key={p.name}
                      className={`player-chip ${isElim ? "elim" : ""}`}
                    >
                      <div className="av">{getAvatar(p.name)}</div>
                      <div>{p.name}</div>
                      {isElim && (
                        <div
                          style={{ fontSize: "0.65rem", color: "var(--muted)" }}
                        >
                          ELIMINATED
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Vote tally during result phase */}
        {gs.phase === "result" && Object.keys(counts).length > 0 && (
          <div className="card">
            <div className="section-label">Vote Tally</div>
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name} className="bar-row">
                  <div className="bar-name">
                    {getAvatar(name)} {name}
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(count / Math.max(1, totalVoters)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="bar-count">{count}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
