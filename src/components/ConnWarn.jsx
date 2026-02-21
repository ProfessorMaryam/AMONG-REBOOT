/**
 * Connection warning banner — shown when WebSocket to Node server is lost
 */
export function ConnWarn({ connected }) {
  if (connected) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 999,
      background: "rgba(230,57,70,0.95)",
      color: "#fff",
      textAlign: "center",
      padding: "10px",
      fontFamily: "'Rajdhani', sans-serif",
      fontWeight: 700,
      letterSpacing: 2,
      fontSize: "0.85rem",
    }}>
      ⚠ Reconnecting to server… make sure{" "}
      <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>
        node src/server.js
      </code>{" "}
      is running
    </div>
  );
}

