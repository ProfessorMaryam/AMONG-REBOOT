import { useState, useEffect, useRef } from "react";
import { Header } from "../Header";

const PICK_DURATION = 20_000; // 20s
const VIEW_DURATION = 60_000; // 60s

// WalletView is at src/components/views/WalletView.jsx
// so assets are two levels up: ../../assets/wallets/
function img(name) {
  return new URL(`../../assets/wallets/${name}`, import.meta.url).href;
}

const WALLETS = [
  { name: "Hajar",  closed: img("hajarWallet.png"),  open: img("hajar_openWallet.png")  },
  { name: "Sara",   closed: img("saraWallet.png"),   open: img("sara_openWallet.png")   },
  { name: "m7md",   closed: img("m7mdWallet.png"),   open: img("m7md_openWallet.png")   },
  { name: "Yousif", closed: img("yousifWallet.png"), open: img("yousif_openWallet.png") },
  { name: "nooh",   closed: img("noohWallet.png"),   open: img("nooh_openWallet.png")   },
  { name: "mariam", closed: img("marymWallet.png"),  open: img("marym_openWallet.png")  },
];

function useCountdown(phaseStart, durationMs) {
  const [ms, setMs] = useState(() => Math.max(0, durationMs - (Date.now() - phaseStart)));
  useEffect(() => {
    const t = setInterval(() => {
      setMs(Math.max(0, durationMs - (Date.now() - phaseStart)));
    }, 100);
    return () => clearInterval(t);
  }, [phaseStart, durationMs]);
  return ms;
}

export function WalletView({ gs, connected, onLogout }) {
  const phaseStart = gs.phaseStartedAt || Date.now();
  const eliminated = gs.eliminated || [];
  const round = gs.round;

  // Filter out wallets of eliminated players
  const ROSTER_TO_WALLET = {
    "Hajar": "Hajar", "Sara": "Sara", "Mohammad": "m7md",
    "Yousif": "Yousif", "Nooh": "nooh", "Maryam": "mariam",
  };
  const eliminatedWalletNames = eliminated.map(n => ROSTER_TO_WALLET[n]).filter(Boolean);
  const availableWallets = WALLETS.filter(w => !eliminatedWalletNames.includes(w.name));

  const pickMs = useCountdown(phaseStart, PICK_DURATION);
  const totalMs = useCountdown(phaseStart, PICK_DURATION + VIEW_DURATION);

  const pickDone = pickMs === 0;
  const viewSecs = Math.ceil(Math.max(0, totalMs) / 1000);
  const pickSecs = Math.ceil(pickMs / 1000);

  // Persist chosen wallet in sessionStorage so page refresh doesn't lose it
  const SESSION_KEY = `wallet_choice_r${round}`;
  const [chosen, setChosenState] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || null; } catch { return null; }
  });
  function setChosen(val) {
    setChosenState(val);
    try {
      if (val) sessionStorage.setItem(SESSION_KEY, val);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  // Also read pick-done state from elapsed time on mount (handles refresh mid-view-phase)
  const finalChoice = pickDone ? chosen : chosen;
  const wallet = WALLETS.find(w => w.name === finalChoice);
  const missed = pickDone && !finalChoice;

  /* ─── PICK PHASE ────────────────────────────────────────────── */
  if (!pickDone) {
    return (
      <div className="screen">
        <div className="card" style={{ maxWidth: 600 }}>
          <Header
            title="Suspect Wallet"
            sub={`Round ${gs.round} · Pick a wallet to inspect`}
            round={gs.round} phase="wallet"
            connected={connected} onLogout={onLogout}
          />

          {/* Intro banner */}
          <div style={{
            background: "#0d0d1a", border: "1px solid #3a2a5a", borderRadius: 10,
            padding: "16px 18px", marginBottom: 16, textAlign: "center",
          }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 6 }}>👜</div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#d0d0f0", marginBottom: 4 }}>
              A wallet was left behind at the crime scene
            </div>
            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Pick <strong style={{ color: "#a78bfa" }}>one</strong> suspect's wallet to check for clues.
              You can change your mind before time runs out!
            </div>
          </div>

          {/* Countdown */}
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span style={{
              fontSize: "2.2rem", fontWeight: 900,
              fontFamily: "'Share Tech Mono', monospace",
              color: pickSecs <= 5 ? "#e63946" : "#fbbf24",
              transition: "color 0.3s",
            }}>
              {pickSecs}s
            </span>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem", marginLeft: 8 }}>to choose</span>
          </div>

          {/* Wallet image grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16,
          }}>
            {availableWallets.map(w => {
              const isChosen = chosen === w.name;
              return (
                <button
                  key={w.name}
                  onClick={() => setChosen(isChosen ? null : w.name)}
                  style={{
                    background: isChosen ? "#1a0a2e" : "#0d0d1a",
                    border: `2px solid ${isChosen ? "#a78bfa" : "#2a2a40"}`,
                    borderRadius: 12, padding: 0, cursor: "pointer",
                    opacity: 1,
                    transform: isChosen ? "scale(1.04)" : "scale(1)",
                    transition: "all 0.18s",
                    overflow: "hidden", position: "relative",
                    boxShadow: isChosen ? "0 0 16px rgba(167,139,250,0.4)" : "none",
                  }}
                >
                  <img
                    src={w.closed} alt={`${w.name}'s wallet`}
                    style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }}
                  />
                  <div style={{
                    padding: "7px 4px", textAlign: "center",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: "0.8rem",
                    color: isChosen ? "#a78bfa" : "#d0d0f0",
                    background: isChosen ? "#1a0a2e" : "#0d0d1a",
                    fontWeight: isChosen ? 700 : 400,
                  }}>
                    {w.name}
                  </div>
                  {isChosen && (
                    <div style={{
                      position: "absolute", top: 7, right: 7,
                      background: "#a78bfa", borderRadius: "50%",
                      width: 24, height: 24, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "0.8rem", fontWeight: 900, color: "#fff",
                      boxShadow: "0 0 8px rgba(167,139,250,0.8)",
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="waiting-msg" style={{ color: chosen ? "var(--safe)" : "var(--muted)" }}>
            {chosen
              ? `✅ You picked ${chosen}'s wallet — you can change your mind until time runs out!`
              : "👆 Tap a wallet to select it"}
          </div>
        </div>
      </div>
    );
  }

  /* ─── VIEW PHASE — MISSED ───────────────────────────────────── */
  if (missed) {
    return (
      <div className="screen">
        <div className="card" style={{ maxWidth: 520 }}>
          <Header
            title="Suspect Wallet"
            sub={`Round ${gs.round} · Too slow!`}
            round={gs.round} phase="wallet"
            connected={connected} onLogout={onLogout}
          />
          <div style={{
            background: "#1a0a0a", border: "2px solid #5a2a2a", borderRadius: 12,
            padding: 32, textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 900, fontSize: "1.3rem", color: "#e63946", marginBottom: 10 }}>
              You missed the chance!
            </div>
            <div style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.7 }}>
              You didn't pick a wallet in time.<br />
              The clue inside is hidden from you.
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 6 }}>
              Other players are reading their clues…
            </div>
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              color: "#fbbf24", fontSize: "1.6rem", fontWeight: 700,
            }}>
              {viewSecs}s
            </span>
            <span style={{ color: "var(--muted)", fontSize: "0.82rem", marginLeft: 8 }}>
              until discussion starts
            </span>
          </div>
          <div className="waiting-msg">Discussion starts automatically when the timer ends.</div>
        </div>
      </div>
    );
  }

  /* ─── VIEW PHASE — OPEN WALLET ──────────────────────────────── */
  return (
    <div className="screen">
      <div className="card" style={{ maxWidth: 560 }}>
        <Header
          title="Suspect Wallet"
          sub={`Round ${gs.round} · Clue inside — memorise it!`}
          round={gs.round} phase="wallet"
          connected={connected} onLogout={onLogout}
        />

        {/* Open wallet image — full width */}
        <div style={{
          background: "#0a0d1a", border: "2px solid #a78bfa",
          borderRadius: 14, overflow: "hidden", marginBottom: 14,
          boxShadow: "0 0 24px rgba(167,139,250,0.25)",
        }}>
          <img
            src={wallet?.open} alt={`${finalChoice}'s open wallet`}
            style={{
              width: "100%", display: "block",
              maxHeight: 380, objectFit: "contain",
              background: "#0a0d1a",
            }}
          />
          <div style={{
            padding: "12px 18px",
            borderTop: "1px solid #2a3a5a",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", letterSpacing: 1, marginBottom: 2 }}>
                WALLET OWNER
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#a78bfa" }}>{finalChoice}</div>
            </div>
            {/* Countdown ring */}
            <div style={{ textAlign: "right" }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "1.8rem", fontWeight: 900,
                color: viewSecs <= 10 ? "#e63946" : "#fbbf24",
                transition: "color 0.3s",
              }}>
                {viewSecs}s
              </span>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>until discussion</div>
            </div>
          </div>
        </div>

        <div className="waiting-msg" style={{ color: "#a78bfa" }}>
          📋 Memorise what's inside — use it in discussion!
        </div>
      </div>
    </div>
  );
}

