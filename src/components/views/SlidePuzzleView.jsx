import { useState, useCallback } from "react";
import { Header } from "../Header";
import puzzleImg from "../../assets/puzzel/puzzle.png";

const GRID = 3; // 3×3 grid, tile 8 is the blank
const TOTAL = GRID * GRID;

function buildSolved() {
  // [0..7, null]  — null is the blank tile
  return [...Array(TOTAL - 1).keys(), null];
}

function shuffle(tiles) {
  const arr = [...tiles];
  // Fisher-Yates, keep only solvable permutations
  let blankIdx = arr.indexOf(null);
  // Do 500 random valid moves so the result is always solvable
  const dirs = [-1, 1, -GRID, GRID];
  for (let i = 0; i < 500; i++) {
    const valid = dirs
      .map(d => blankIdx + d)
      .filter(n => {
        if (n < 0 || n >= TOTAL) return false;
        // Prevent row-wrapping for left/right moves
        if (blankIdx % GRID === 0 && n === blankIdx - 1) return false;
        if (blankIdx % GRID === GRID - 1 && n === blankIdx + 1) return false;
        return true;
      });
    const next = valid[Math.floor(Math.random() * valid.length)];
    [arr[blankIdx], arr[next]] = [arr[next], arr[blankIdx]];
    blankIdx = next;
  }
  return arr;
}

function isSolved(tiles) {
  for (let i = 0; i < TOTAL - 1; i++) {
    if (tiles[i] !== i) return false;
  }
  return tiles[TOTAL - 1] === null;
}

export function SlidePuzzleView({ gs, connected, onLogout }) {
  const [tiles, setTiles] = useState(() => shuffle(buildSolved()));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  const handleTileClick = useCallback((idx) => {
    if (solved) return;
    setTiles(prev => {
      const arr = [...prev];
      const blankIdx = arr.indexOf(null);
      const row = i => Math.floor(i / GRID);
      const col = i => i % GRID;
      const adjacent =
        (row(idx) === row(blankIdx) && Math.abs(col(idx) - col(blankIdx)) === 1) ||
        (col(idx) === col(blankIdx) && Math.abs(row(idx) - row(blankIdx)) === 1);
      if (!adjacent) return prev;
      [arr[blankIdx], arr[idx]] = [arr[idx], arr[blankIdx]];
      if (isSolved(arr)) setSolved(true);
      return arr;
    });
    setMoves(m => m + 1);
  }, [solved]);

  function reset() {
    setTiles(shuffle(buildSolved()));
    setMoves(0);
    setSolved(false);
  }

  // Each tile shows the slice of the image it corresponds to
  const tileSize = 160; // px per tile
  const boardSize = tileSize * GRID;

  return (
    <div className="screen">
      <div className="card">
        <Header
          title="Evidence Recovered"
          sub={`Round ${gs.round} · Reconstruct the scene`}
          round={gs.round}
          phase="slidepuzzle"
          connected={connected}
          onLogout={onLogout}
        />

        <div style={{
          background: "#0d0d1a",
          border: "1px solid #3a2a5a",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 20,
          color: "#d0d0f0",
          fontSize: "0.88rem",
          lineHeight: 1.6,
        }}>
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.72rem", letterSpacing: 1, marginBottom: 6 }}>
            🧩 MISSION — ROUND {gs.round}
          </div>
          A critical photo was found at the crime scene — but it's been scrambled.
          Slide the tiles into the correct order to reveal the full image.
        </div>

        {/* Board */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            position: "relative",
            width: boardSize,
            height: boardSize,
            background: "#0a0a14",
            border: solved ? "2px solid var(--safe)" : "2px solid #2a2a40",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: solved ? "0 0 24px rgba(74,222,128,0.3)" : "0 4px 24px rgba(0,0,0,0.5)",
            transition: "border-color 0.4s, box-shadow 0.4s",
          }}>
            {tiles.map((tile, idx) => {
              const row = Math.floor(idx / GRID);
              const col = idx % GRID;
              if (tile === null) {
                return (
                  <div key="blank" style={{
                    position: "absolute",
                    left: col * tileSize,
                    top: row * tileSize,
                    width: tileSize,
                    height: tileSize,
                    background: "#06060f",
                  }} />
                );
              }
              const srcRow = Math.floor(tile / GRID);
              const srcCol = tile % GRID;
              return (
                <div
                  key={tile}
                  onClick={() => handleTileClick(idx)}
                  style={{
                    position: "absolute",
                    left: col * tileSize,
                    top: row * tileSize,
                    width: tileSize,
                    height: tileSize,
                    backgroundImage: `url(${puzzleImg})`,
                    backgroundSize: `${boardSize}px ${boardSize}px`,
                    backgroundPosition: `-${srcCol * tileSize}px -${srcRow * tileSize}px`,
                    cursor: "pointer",
                    transition: "left 0.12s ease, top 0.12s ease",
                    boxSizing: "border-box",
                    border: "1px solid rgba(0,0,0,0.4)",
                  }}
                />
              );
            })}
          </div>

          {/* Moves counter */}
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.8rem",
            color: "var(--muted)",
            letterSpacing: 2,
          }}>
            MOVES: <span style={{ color: "var(--warn)" }}>{moves}</span>
          </div>

          {/* Solved banner */}
          {solved && (
            <div style={{
              width: "100%",
              background: "rgba(74,222,128,0.08)",
              border: "1px solid var(--safe)",
              borderRadius: 10,
              padding: "16px 20px",
              textAlign: "center",
              animation: "fadeUp 0.4s ease",
            }}>
              <div style={{
                fontFamily: "'Creepster', cursive",
                fontSize: "1.8rem",
                color: "var(--safe)",
                letterSpacing: 3,
                marginBottom: 6,
              }}>
                PUZZLE SOLVED
              </div>
              <div style={{ color: "#d0d0f0", fontSize: "0.88rem", lineHeight: 1.6 }}>
                The image has been reconstructed. This is the evidence.
              </div>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={reset}
            className="btn ghost"
            style={{ width: "auto", padding: "8px 24px", fontSize: "0.8rem" }}
          >
            🔀 Shuffle Again
          </button>
        </div>

        <div className="waiting-msg" style={{ marginTop: 20 }}>
          {solved
            ? "Image revealed. Waiting for admin to continue..."
            : "Slide the tiles to reconstruct the photo."}
        </div>
      </div>
    </div>
  );
}
