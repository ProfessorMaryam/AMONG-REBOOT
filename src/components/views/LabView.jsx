import { useState, useEffect, useRef } from "react";

const ALL_SUSPECTS = [
  { name: "Hajar",    blood: "O",  killer: true,  avatar: "🧑‍🚀", active: true  },
  { name: "Sara",     blood: "O",  killer: false, avatar: "👸",   active: true  },
  { name: "Marym",    blood: "O",  killer: false, avatar: "🧙‍♀️", active: true  },
  { name: "Mohammed", blood: "AB", killer: false, avatar: "🥷",   active: true  },
  { name: "Yousif",   blood: "O",  killer: true,  avatar: "🦸",   active: true  },
  { name: "Noah",     blood: "B",  killer: false, avatar: "🧑‍💼", active: true  },
];

const PHASES = { IDLE: "idle", COUNTING: "counting", COLORED: "colored", REVEALED: "revealed" };

export default function LabView() {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [countdown, setCountdown] = useState(10);
  const [tubeColors, setTubeColors] = useState(ALL_SUSPECTS.map(() => "neutral"));
  const [flash, setFlash] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showBloodTypes, setShowBloodTypes] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== PHASES.COUNTING) return;
    if (countdown === 0) {
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
      setTimeout(() => {
        setTubeColors(ALL_SUSPECTS.map(s => !s.active ? "kicked" : s.killer ? "red" : "blue"));
        setPhase(PHASES.COLORED);
      }, 700);
      return;
    }
    timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== PHASES.COLORED) return;
    const t = setTimeout(() => {
      setPhase(PHASES.REVEALED);
      setTimeout(() => setShowResult(true), 400);
    }, 2600);
    return () => clearTimeout(t);
  }, [phase]);

  function start() {
    setPhase(PHASES.COUNTING);
    setCountdown(10);
    setTubeColors(ALL_SUSPECTS.map(() => "neutral"));
    setShowResult(false);
    setShowBloodTypes(false);
  }

  const colorShowing = phase === PHASES.COLORED || phase === PHASES.REVEALED;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #1a0a1a 0%, #0d0d14 60%, #080810 100%)",
      fontFamily: "'Courier New', Courier, monospace",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');

        @keyframes tickPop {
          0%   { transform: scale(1.8); opacity: 0.2; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes bubble {
          0%   { transform: translateY(0) scale(1);       opacity: 0.7; }
          100% { transform: translateY(-30px) scale(0.3); opacity: 0;   }
        }
        @keyframes flashPulse {
          0%, 100% { opacity: 0; }
          40%      { opacity: 1; }
        }
        @keyframes resultSlide {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .main-card {
          width: 100%;
          max-width: 580px;
          background: #13131f;
          border-radius: 20px;
          padding: 32px 28px 36px;
          box-shadow: 0 8px 60px rgba(0,0,0,0.6);
          position: relative;
          overflow: hidden;
        }
        .main-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.04);
          pointer-events: none;
        }

        .top-bar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .title-block h1 {
          font-family: 'Creepster', cursive;
          font-size: 2.2rem;
          color: #e8463a;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0 0 2px;
          line-height: 1;
          text-shadow: 2px 2px 0 #6a0a00;
        }
        .title-block .subtitle {
          font-size: 0.6rem;
          letter-spacing: 4px;
          color: #3a4a5a;
          text-transform: uppercase;
        }
        .badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge-round {
          font-size: 0.65rem;
          letter-spacing: 3px;
          color: #e8b84b;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-pill {
          background: rgba(100,220,150,0.12);
          border: 1px solid rgba(100,220,150,0.3);
          border-radius: 20px;
          padding: 3px 12px;
          font-size: 0.6rem;
          color: #60cc90;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .dot-live {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22cc66;
          box-shadow: 0 0 6px #22cc66;
        }

        .section-label {
          font-size: 0.6rem;
          letter-spacing: 4px;
          color: #4a9aaa;
          text-transform: uppercase;
          margin-bottom: 14px;
          font-weight: 700;
        }

        .tubes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .tube-cell {
          background: #0d0d18;
          border-radius: 12px;
          border: 1px solid #1e2535;
          padding: 14px 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: border-color 1s ease, box-shadow 1s ease;
          position: relative;
          overflow: hidden;
        }
        .tube-cell.red {
          border-color: rgba(192,57,43,0.6);
          box-shadow: 0 0 20px rgba(192,57,43,0.2);
        }
        .tube-cell.blue {
          border-color: rgba(41,128,185,0.5);
          box-shadow: 0 0 20px rgba(41,128,185,0.15);
        }
        .tube-cell.kicked {
          opacity: 0.3;
          filter: grayscale(1);
        }
        .cell-name {
          font-size: 0.7rem;
          letter-spacing: 1px;
          font-weight: 600;
          text-transform: uppercase;
          transition: color 0.8s ease;
        }

        .start-btn {
          width: 100%;
          background: #e8463a;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-size: 0.9rem;
          font-family: 'Creepster', cursive;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 4px 0 #8a1a10, 0 6px 24px rgba(232,70,58,0.25);
          transition: all 0.15s ease;
        }
        .start-btn:hover  { transform: translateY(-2px); box-shadow: 0 6px 0 #8a1a10, 0 8px 28px rgba(232,70,58,0.35); }
        .start-btn:active { transform: translateY(3px);  box-shadow: 0 1px 0 #8a1a10; }

        .reveal-btn {
          width: 100%;
          background: transparent;
          color: #4a9aaa;
          border: 1px solid #1e3a4a;
          border-radius: 10px;
          padding: 12px;
          font-size: 0.78rem;
          font-family: 'Courier New', monospace;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 12px;
          transition: all 0.2s ease;
        }
        .reveal-btn:hover {
          border-color: #4a9aaa;
          color: #7acada;
          background: rgba(74,154,170,0.06);
        }

        .blood-badge {
          font-size: 0.62rem;
          letter-spacing: 1px;
          font-weight: 700;
          border-radius: 20px;
          padding: 2px 9px;
          border: 1px solid transparent;
          transition: all 0.5s ease;
          opacity: 0;
          transform: translateY(4px);
        }
        .blood-badge.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .blood-badge.type-o {
          background: rgba(192,57,43,0.18);
          border-color: rgba(192,57,43,0.5);
          color: #e8463a;
        }
        .blood-badge.type-other {
          background: rgba(30,45,60,0.6);
          border-color: #1e3545;
          color: #3a6070;
        }

        .result-card {
          background: #0a0d15;
          border: 1px solid rgba(232,70,58,0.25);
          border-radius: 14px;
          padding: 22px 20px;
          text-align: center;
          animation: resultSlide 0.7s ease both;
        }
        .result-eyebrow {
          font-size: 0.58rem;
          letter-spacing: 5px;
          color: #3a2020;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .result-label {
          font-size: 0.78rem;
          color: #4a6070;
          margin-bottom: 8px;
          line-height: 1.6;
        }
        .result-type {
          font-family: 'Creepster', cursive;
          font-size: 2.4rem;
          color: #e8463a;
          text-shadow: 0 0 24px rgba(232,70,58,0.45), 3px 3px 0 #5a0800;
          letter-spacing: 6px;
          margin: 6px 0 14px;
        }
        .result-hint {
          font-size: 0.68rem;
          color: #2a4050;
          line-height: 1.9;
        }
      `}</style>

      {/* Screen flash */}
      {flash && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none",
          background: "rgba(232,70,58,0.15)",
          animation: "flashPulse 0.7s ease",
        }} />
      )}

      <div className="main-card">

        {/* Top bar */}
        <div className="top-bar">
          <div className="title-block">
            <h1>🧬 DNA Lab</h1>
            <div className="subtitle">Round 4 · Sample Analysis</div>
          </div>
          <div className="badges">
            <span className="badge-round">Round 4</span>
            <span className="badge-pill">Puzzle</span>
            <div className="dot-live" />
          </div>
        </div>

        {/* Section label */}
        <div className="section-label">
          {colorShowing ? "⚡ Phase 2 — Blood Type Analysis" : "🔬 The Samples"}
        </div>

        {/* Tubes grid */}
        <div className="tubes-grid">
          {ALL_SUSPECTS.map((s, i) => {
            const col    = tubeColors[i];
            const isRed  = col === "red";
            const isBlue = col === "blue";
            const kicked = !s.active;

            return (
              <div key={i} className={`tube-cell ${kicked ? "kicked" : isRed ? "red" : isBlue ? "blue" : ""}`}>

                {/* Kicked label */}
                {kicked && (
                  <div style={{
                    position: "absolute", top: 6, right: 6,
                    fontSize: "0.48rem", letterSpacing: "1px", color: "#3a3a4a",
                    textTransform: "uppercase", background: "#1a1a2a",
                    borderRadius: 4, padding: "1px 5px",
                  }}>Kicked</div>
                )}

                {/* Avatar */}
                <div style={{ fontSize: "1.9rem", lineHeight: 1 }}>{s.avatar}</div>

                {/* Name */}
                <div className="cell-name" style={{
                  color: kicked ? "#2a2a38" : isRed ? "#d9534f" : isBlue ? "#5b9bd5" : "#4a6070",
                }}>
                  {s.name}
                </div>

                {/* Vial */}
                {!kicked ? (
                  <div style={{ position: "relative", width: 30, height: 66 }}>
                    <div style={{
                      position: "absolute", inset: 0,
                      borderRadius: "3px 3px 14px 14px",
                      border: `2px solid ${isRed ? "#a93226" : isBlue ? "#2471a3" : "#1e2e3c"}`,
                      background: isRed
                        ? "linear-gradient(to bottom, #100204 22%, #6b1010 22%, #a93226 75%, #7a0e0e 100%)"
                        : isBlue
                        ? "linear-gradient(to bottom, #020c12 22%, #0d2d50 22%, #1f618d 75%, #154060 100%)"
                        : "linear-gradient(to bottom, #070e16 22%, #111e2a 22%, #1a2a36 100%)",
                      transition: "all 1.2s ease",
                      overflow: "hidden",
                    }}>
                      <div style={{ position: "absolute", left: 4, top: "25%", width: 3, height: "45%", background: "rgba(255,255,255,0.07)", borderRadius: 4 }} />
                      {(isRed || isBlue) && [0, 1, 2].map(b => (
                        <div key={b} style={{
                          position: "absolute",
                          left: `${14 + b * 30}%`, bottom: `${16 + b * 10}%`,
                          width: 3, height: 3, borderRadius: "50%",
                          background: isRed ? "rgba(255,140,130,0.5)" : "rgba(130,190,255,0.5)",
                          animation: `bubble ${1 + b * 0.32}s ease-in-out infinite`,
                          animationDelay: `${b * 0.2}s`,
                        }} />
                      ))}
                    </div>
                    {/* Cap */}
                    <div style={{
                      position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
                      width: 14, height: 7, borderRadius: "3px 3px 0 0",
                      background: "#0d0d18", border: "2px solid #1e2a35",
                    }} />
                  </div>
                ) : (
                  <div style={{
                    width: 30, height: 66, borderRadius: "3px 3px 14px 14px",
                    border: "2px solid #16161e", background: "#0a0a12",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#252530", fontSize: "0.9rem",
                  }}>✕</div>
                )}

                {/* Blood type badge */}
                {!kicked && (
                  <div className={`blood-badge ${showBloodTypes ? "visible" : ""} ${s.blood === "O" ? "type-o" : "type-other"}`}>
                    Type {s.blood}
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Countdown */}
        {phase === PHASES.COUNTING && (
          <div style={{
            textAlign: "center", marginBottom: 20,
            fontFamily: "'Creepster', cursive",
            fontSize: "5rem", color: "#e8b84b",
            textShadow: "0 0 30px rgba(232,184,75,0.5), 3px 3px 0 #6a5000",
            lineHeight: 1,
            animation: "tickPop 0.35s ease-out",
          }}>
            {countdown}
          </div>
        )}

        {/* Start button */}
        {phase === PHASES.IDLE && (
          <button className="start-btn" onClick={start}>
            🔬 Begin Analysis
          </button>
        )}

        {/* Lab result card */}
        {showResult && (
          <div className="result-card">
            <div className="result-eyebrow">🧪 Lab Result</div>
            <div className="result-label">DNA found at the crime scene belongs to:</div>
            <div className="result-type">Blood Type O</div>
          </div>
        )}

        {/* Reveal blood types button */}
        {showResult && !showBloodTypes && (
          <button className="reveal-btn" onClick={() => setShowBloodTypes(true)}>
            🩸 Reveal Blood Types
          </button>
        )}

        {/* Confirmed message after reveal */}
        {showBloodTypes && (
          <div style={{
            marginTop: 12, padding: "10px 16px",
            background: "rgba(74,154,170,0.06)",
            border: "1px solid #1e3a4a",
            borderRadius: 10, textAlign: "center",
            animation: "resultSlide 0.5s ease both",
          }}>
            {/* <div style={{ fontSize: "0.6rem", letterSpacing: "3px", color: "#2a5a6a", textTransform: "uppercase" }}>
              Blood types now visible on each sample above
            </div> */}
          </div>
        )}

      </div>
    </div>
  );
}
