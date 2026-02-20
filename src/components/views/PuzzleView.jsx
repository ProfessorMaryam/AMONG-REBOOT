import { useState } from "react";
import { Header } from "../Header";

const CORRECT_ANSWER = "SELECT *;";
const CLUE = "The imposter needed a lighter to start a fire.";

/**
 * Puzzle phase view — players solve a SQL query to unlock a clue
 */
export function PuzzleView({ gs, connected, onLogout }) {
  const [input, setInput] = useState("");
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim() === CORRECT_ANSWER) {
      setSolved(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="screen">
      <div className="card">
        <Header
          title="Evidence Terminal"
          sub={`Round ${gs.round} · Decrypt the clue`}
          round={gs.round}
          phase="puzzle"
          connected={connected}
          onLogout={onLogout}
        />

        <div style={{
          background: "#000",
          border: "1px solid #2a2a40",
          borderRadius: 8,
          padding: 20,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.9rem",
          color: "#4ade80",
          marginBottom: 20
        }}>
          <div style={{ color: "#6060a0", marginBottom: 8 }}>-- evidence_db v1.0 --</div>
          <div style={{ marginBottom: 12 }}>&gt; EVIDENCE TABLE LOCKED</div>
          <div style={{ color: "#d0d0e8", marginBottom: 16 }}>
            Enter the correct SQL query to retrieve the hidden evidence:
          </div>

          {!solved ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#6060a0", whiteSpace: "nowrap" }}>db&gt;</span>
              <input
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #2a2a40",
                  color: "#4ade80",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.9rem",
                  outline: "none",
                  padding: "2px 4px"
                }}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="type your query..."
                autoFocus
              />
              <button
                type="submit"
                className="btn"
                style={{ width: "auto", padding: "4px 16px", fontSize: "0.8rem" }}
              >
                RUN
              </button>
            </form>
          ) : (
            <div>
              <div style={{ color: "#4ade80", marginBottom: 8 }}>
                &gt; QUERY OK — 1 row returned
              </div>
              <div style={{
                background: "#0d1a0d",
                border: "1px solid #4ade80",
                borderRadius: 4,
                padding: 12,
                color: "#d0d0e8",
                marginTop: 8
              }}>
                <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 6, letterSpacing: 1, fontSize: "0.8rem" }}>
                  CLUE UNLOCKED:
                </div>
                <div style={{ fontSize: "1rem", fontStyle: "italic" }}>"{CLUE}"</div>
              </div>
            </div>
          )}

          {error && !solved && (
            <div style={{ color: "#e63946", marginTop: 8 }}>
              &gt; ERROR: syntax error or access denied. Try again.
            </div>
          )}
        </div>

        <div className="waiting-msg">
          {solved
            ? "Clue found. Waiting for admin to start next discussion..."
            : "Solve the puzzle to reveal evidence from the crime scene."}
        </div>
      </div>
    </div>
  );
}
