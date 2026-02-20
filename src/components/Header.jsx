/**
 * Page header with title, status, and logout button
 */
export function Header({ title, sub, round, phase, connected, onLogout }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20
      }}
    >
      <div>
        <div className="page-title">{title}</div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {round > 0 && <span className="round-tag">ROUND {round}</span>}
        {phase && (
          <span
            className={`badge ${
              phase === "lobby" ? "yellow" : phase === "gameover" ? "red" : "green"
            }`}
          >
            {phase.toUpperCase()}
          </span>
        )}
        <span
          className={`conn ${connected ? "ok" : "err"}`}
          title={connected ? "Connected" : "Disconnected"}
        />
        <button
          className="btn ghost"
          style={{ width: "auto", padding: "6px 16px", fontSize: "0.78rem", letterSpacing: 1 }}
          onClick={onLogout}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

