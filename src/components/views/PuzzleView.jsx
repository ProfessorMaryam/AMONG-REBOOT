import { useState } from "react";
import { Header } from "../Header";
import LabView from './LabView';

// Single puzzle — same for all rounds
const PUZZLE = {
  riddle: `The evidence table is locked. Retrieve ALL records from it to uncover what was found at the crime scene.`,
  hint: ``,
  schema: `TABLE evidence (id, suspect, item, location, timestamp)`,
  accepted: [`select * from evidence`],
  resultRows: [
    { id: 1, suspect: "Sara",    item: "ID, coal receipt",   location: "Pixel – Meeting Room exit", timestamp: "20:15" },
    { id: 2, suspect: "Maryam",  item: "ID, gum",            location: "Other side – with Melvis",  timestamp: "20:00" },
    { id: 3, suspect: "Hajar",   item: "ID, USB",            location: "Pixel – desk area",         timestamp: "19:00–21:00" },
    { id: 4, suspect: "Yousif",  item: "ID, subway receipt", location: "Gaming Tube",    timestamp: "19:35" },
    { id: 5, suspect: "Nooh",    item: "Movie ticket",       location: "Cruncher ",         timestamp: "20:30" },
    { id: 6, suspect: "Mohamed", item: "ID, Swedish candy",  location: "Upstairs",                  timestamp: "until 21:00" },
  ],
  clue: `Check the timestamps carefully — someone's alibi doesn't add up.`,
};

/**
 * Puzzle phase view — round-specific SQL riddle
 */
export function PuzzleView({ gs, connected, onLogout }) {
  const [input, setInput] = useState("");
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const puzzle = PUZZLE;

  function normalize(s) {
    return s
      .trim()
      .replace(/\s+/g, " ")        // collapse whitespace
      .replace(/\s*;\s*$/, "")     // remove trailing semicolon
      .replace(/\s*,\s*/g, ", ")   // normalize commas
      .toLowerCase();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const userNorm = normalize(input);
    const isCorrect = puzzle.accepted.some(ans => normalize(ans) === userNorm);
    if (isCorrect) {
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

        {/* Schema reference */}
        <div style={{
          background: "#0a0a1a",
          border: "1px solid #2a2a40",
          borderRadius: 6,
          padding: "10px 14px",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.78rem",
          color: "#6060c0",
          marginBottom: 12,
        }}>
          <span style={{ color: "#4a4a80" }}>-- schema: </span>
          {puzzle.schema}
        </div>

        {/* Riddle box */}
        <div style={{
          background: "#0d0d1a",
          border: "1px solid #3a2a5a",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 14,
          color: "#d0d0f0",
          fontSize: "0.92rem",
          lineHeight: 1.6,
        }}>
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.75rem", letterSpacing: 1, marginBottom: 6 }}>
            🔍 MISSION — ROUND {gs.round}
          </div>
          {puzzle.riddle}
        </div>

        {/* Hint toggle */}
        {!solved && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setShowHint(h => !h)}
              style={{
                background: "none", border: "none", color: "#6060a0",
                fontFamily: "'Share Tech Mono', monospace", fontSize: "0.78rem",
                cursor: "pointer", padding: 0, textDecoration: "underline"
              }}
            >
              {showHint ? "▲ hide hint" : "▼ show hint"}
            </button>
            {showHint && (
              <div style={{ color: "#a78bfa", fontSize: "0.8rem", marginTop: 6, fontStyle: "italic" }}>
                💡 {puzzle.hint}
              </div>
            )}
          </div>
        )}

        {/* Terminal */}
        <div style={{
          background: "#000",
          border: "1px solid #2a2a40",
          borderRadius: 8,
          padding: 20,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.9rem",
          color: "#4ade80",
          marginBottom: 20,
        }}>
          <div style={{ color: "#6060a0", marginBottom: 8 }}>-- evidence_db --</div>
          <div style={{ marginBottom: 12 }}>&gt; EVIDENCE TABLE LOCKED</div>

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
                  padding: "2px 4px",
                }}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="SELECT * FROM evidence;"
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
                &gt; QUERY OK — {puzzle.resultRows.length} row{puzzle.resultRows.length !== 1 ? "s" : ""} returned
              </div>
              {/* DB table result */}
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={{
                  width: "100%", borderCollapse: "collapse",
                  fontFamily: "'Share Tech Mono', monospace", fontSize: "0.82rem",
                }}>
                  <thead>
                    <tr>
                      {Object.keys(puzzle.resultRows[0]).map(col => (
                        <th key={col} style={{
                          padding: "4px 10px", textAlign: "left",
                          color: "#a78bfa", borderBottom: "1px solid #2a2a40",
                          letterSpacing: 1, fontSize: "0.72rem", textTransform: "uppercase",
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {puzzle.resultRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{
                            padding: "5px 10px", color: "#4ade80",
                            borderBottom: "1px solid #1a1a2a",
                          }}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{
                marginTop: 12, padding: "10px 12px",
                background: "#0a1a0a", border: "1px solid #4ade80",
                borderRadius: 6, color: "#fbbf24",
                fontWeight: 700, fontSize: "0.9rem", letterSpacing: 1,
              }}>
                {/* 🔑 CLUE: {puzzle.clue} */}
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
            ? "Clue found. Waiting for admin to continue..."
            : "Solve the SQL puzzle to reveal evidence from the crime scene."}
        </div>
      </div>
    </div>
  );
}
