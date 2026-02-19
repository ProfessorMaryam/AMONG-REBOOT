import { useState, useEffect, useRef, useCallback } from "react";

// â”€â”€ MOCK DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SIGNIN_URL = "https://learn.reboot01.com/api/auth/signin";
const ADMIN_USERNAME = "haaljafen";
const ADMIN_PASSWORD = "";

function parseJWT(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const STORY_PAGES = [
  {
    title: "ONE WEEK AGO",
    text: "A dead body was found near the quest room — a lighter left beside it, still warm. The victim had been here only hours before the discovery.",
    icon: "🕯️",
  },
  {
    title: "THE SUSPECTS",
    text: "Six people were present that night. All of them had access. All of them had motive. Now they stand among you — the suspects are your fellow players.",
    icon: "👥",
  },
  {
    title: "THE KILLER IS HERE",
    text: "At least one of them is the killer. Maybe two. They will lie. They will convince. They will point fingers at the innocent.",
    icon: "🔪",
  },
  {
    title: "YOUR MISSION",
    text: "Discuss. Debate. Vote. The most suspected player will be eliminated each round. Find the killer — before the killer fools you all.",
    icon: "🔍",
  },
];

// â”€â”€ SHARED STATE (simulating a backend with window global) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!window._gameState) {
  window._gameState = {
    players: [],
    impostors: [],
    phase: "lobby", // lobby | story | discuss | vote | result | gameover
    round: 0,
    eliminated: [],
    votes: {},
    roundResult: null,
    storyPage: 0,
    gameOver: null,
    listeners: [],
  };
}
const GS = window._gameState;

function subscribe(fn) {
  GS.listeners.push(fn);
  return () => {
    GS.listeners = GS.listeners.filter((l) => l !== fn);
  };
}
function notify() {
  GS.listeners.forEach((l) => l({ ...GS }));
}
function updateGS(patch) {
  Object.assign(GS, patch);
  notify();
}

// â”€â”€ TIMER HOOK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useTimer(initial, active, onDone) {
  const [time, setTime] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    setTime(initial);
  }, [initial, active]);
  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(ref.current);
          onDone && onDone();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [active]);
  return time;
}

// â”€â”€ GAME LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function assignImpostors(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).map((p) => p.name);
}

function tallyVotes() {
  const counts = {};
  Object.values(GS.votes).forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });
  let max = 0,
    topPlayer = null;
  Object.entries(counts).forEach(([p, c]) => {
    if (c > max) {
      max = c;
      topPlayer = p;
    }
  });
  return { counts, topPlayer, maxVotes: max };
}

// â”€â”€ STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --red: #e63946;
    --dark: #0a0a12;
    --panel: #12121f;
    --border: #2a2a40;
    --accent: #e63946;
    --glow: rgba(230,57,70,0.4);
    --text: #d0d0e8;
    --muted: #6060a0;
    --safe: #4ade80;
    --warn: #fbbf24;
  }

  body { background: var(--dark); color: var(--text); font-family: 'Rajdhani', sans-serif; min-height: 100vh; }

  .app { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
    background: radial-gradient(ellipse at 20% 50%, #1a0010 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, #0a001a 0%, transparent 60%), var(--dark); }

  /* LOGIN */
  .login-box { background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
    padding: 48px 40px; width: 360px; animation: fadeUp 0.4s ease; }
  .login-logo { font-family: 'Creepster', cursive; font-size: 2.8rem; color: var(--red);
    text-align: center; letter-spacing: 2px; text-shadow: 0 0 20px var(--glow); margin-bottom: 4px; }
  .login-sub { text-align: center; color: var(--muted); font-size: 0.85rem; letter-spacing: 3px;
    text-transform: uppercase; margin-bottom: 32px; }
  .field { margin-bottom: 18px; }
  .field label { display: block; font-size: 0.78rem; letter-spacing: 2px; text-transform: uppercase;
    color: var(--muted); margin-bottom: 6px; }
  .field input { width: 100%; background: #0d0d1a; border: 1px solid var(--border); border-radius: 6px;
    padding: 10px 14px; color: var(--text); font-family: 'Share Tech Mono', monospace; font-size: 0.95rem;
    outline: none; transition: border-color 0.2s; }
  .field input:focus { border-color: var(--red); box-shadow: 0 0 0 2px var(--glow); }
  .btn { width: 100%; padding: 12px; background: var(--red); border: none; border-radius: 6px;
    color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 1.05rem; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s, box-shadow 0.2s; }
  .btn:hover { opacity: 0.9; box-shadow: 0 0 20px var(--glow); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  .btn.ghost:hover { border-color: var(--red); color: var(--red); box-shadow: none; }
  .btn.safe { background: var(--safe); }
  .error { color: var(--red); font-size: 0.82rem; margin-top: 10px; text-align: center; }

  /* LAYOUT */
  .screen { width: 100%; max-width: 900px; animation: fadeUp 0.3s ease; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 28px; margin-bottom: 20px; }
  .page-title { font-family: 'Creepster', cursive; font-size: 2rem; color: var(--red);
    letter-spacing: 2px; text-shadow: 0 0 15px var(--glow); margin-bottom: 6px; }
  .page-sub { color: var(--muted); font-size: 0.82rem; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

  /* LOBBY */
  .player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-top: 16px; }
  .player-chip { background: #0d0d1a; border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 10px; text-align: center; font-size: 0.88rem; font-weight: 600; letter-spacing: 1px; }
  .player-chip .avatar { font-size: 1.6rem; margin-bottom: 4px; }
  .player-chip.impostor { border-color: var(--red); color: var(--red); }
  .player-chip.eliminated { opacity: 0.3; text-decoration: line-through; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.7rem;
    letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
  .badge.red { background: rgba(230,57,70,0.15); color: var(--red); border: 1px solid var(--red); }
  .badge.green { background: rgba(74,222,128,0.15); color: var(--safe); border: 1px solid var(--safe); }
  .badge.yellow { background: rgba(251,191,36,0.15); color: var(--warn); border: 1px solid var(--warn); }

  /* STORY */
  .story-page { text-align: center; padding: 40px 20px; min-height: 320px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
  .story-icon { font-size: 4rem; animation: pulse 2s infinite; }
  .story-title { font-family: 'Creepster', cursive; font-size: 2.4rem; color: var(--red);
    letter-spacing: 3px; text-shadow: 0 0 20px var(--glow); }
  .story-text { font-size: 1.15rem; color: var(--text); line-height: 1.7; max-width: 520px;
    font-weight: 400; opacity: 0.9; }
  .story-dots { display: flex; gap: 8px; margin-top: 10px; }
  .story-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: background 0.3s; }
  .story-dot.active { background: var(--red); box-shadow: 0 0 8px var(--glow); }
  .story-nav { display: flex; gap: 12px; margin-top: 20px; }

  /* TIMER */
  .timer-bar { background: var(--border); border-radius: 999px; height: 6px; overflow: hidden; margin: 12px 0; }
  .timer-fill { height: 100%; background: var(--red); border-radius: 999px; transition: width 1s linear;
    box-shadow: 0 0 10px var(--glow); }
  .timer-count { font-family: 'Share Tech Mono', monospace; font-size: 2rem; color: var(--red);
    text-align: center; text-shadow: 0 0 15px var(--glow); }

  /* VOTE */
  .vote-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .vote-card { background: #0d0d1a; border: 2px solid var(--border); border-radius: 10px;
    padding: 18px 12px; text-align: center; cursor: pointer; transition: all 0.2s; }
  .vote-card:hover { border-color: var(--warn); transform: translateY(-2px); }
  .vote-card.selected { border-color: var(--red); box-shadow: 0 0 16px var(--glow); background: rgba(230,57,70,0.08); }
  .vote-card.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .vote-avatar { font-size: 2.2rem; margin-bottom: 8px; }
  .vote-name { font-weight: 700; font-size: 0.95rem; letter-spacing: 1px; }

  /* RESULTS */
  .result-reveal { text-align: center; padding: 30px; }
  .result-name { font-family: 'Creepster', cursive; font-size: 2.8rem; color: var(--warn); margin: 12px 0; }
  .result-verdict { font-size: 3rem; margin: 12px 0; animation: pulse 1s infinite; }
  .result-label { font-size: 1.2rem; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
  .vote-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .vote-bar-name { width: 90px; text-align: right; font-size: 0.85rem; font-weight: 600; }
  .vote-bar-track { flex: 1; background: var(--border); border-radius: 999px; height: 18px; overflow: hidden; }
  .vote-bar-fill { height: 100%; background: var(--red); border-radius: 999px; transition: width 1s ease;
    box-shadow: 0 0 8px var(--glow); }
  .vote-bar-count { width: 24px; font-size: 0.85rem; color: var(--muted); font-family: 'Share Tech Mono', monospace; }

  /* GAMEOVER */
  .gameover { text-align: center; padding: 40px; }
  .gameover-title { font-family: 'Creepster', cursive; font-size: 3.5rem; letter-spacing: 4px;
    text-shadow: 0 0 30px var(--glow); margin-bottom: 12px; }
  .gameover-title.red { color: var(--red); }
  .gameover-title.green { color: var(--safe); text-shadow: 0 0 30px rgba(74,222,128,0.5); }

  /* ADMIN DASH */
  .round-badge { font-family: 'Share Tech Mono', monospace; font-size: 1.1rem; color: var(--warn); letter-spacing: 2px; }
  .kick-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .kick-row:last-child { border-bottom: none; }
  .kick-row .vote-count { font-family: 'Share Tech Mono', monospace; color: var(--warn); min-width: 30px; }

  /* STATUS INDICATOR */
  .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--safe);
    box-shadow: 0 0 8px var(--safe); animation: pulse 2s infinite; margin-right: 8px; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
`;

// â”€â”€ AVATARS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AVATARS = ["🧑‍🚀","👩‍🚀","🧑‍🔬","👩‍🔬","🧑‍💻","👨‍🎤","👩‍🎤","🧛","🧟","🕵️"]
function getAvatar(name) { return AVATARS[name.charCodeAt(0) % AVATARS.length]; }

// â”€â”€ COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LoginScreen({ onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier.trim()) {
      setError("Please enter your username or email.");
      return;
    }

    // Admin shortcut — bypass API entirely, no password needed
    if (identifier.trim() === ADMIN_USERNAME) {
      onLogin("haaljafen", null, null, true);
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const credentials = btoa(`${identifier}:${password}`);
      const res = await fetch(SIGNIN_URL, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Invalid credentials. Please check your username/email and password.");
        } else {
          setError(`Authentication failed (${res.status}). Please try again.`);
        }
        setLoading(false);
        return;
      }
      let token = await res.text();
      token = token.replace(/^"|"$/g, "");
      const payload = parseJWT(token);
      const username = payload?.login || payload?.name || payload?.sub || identifier;
      sessionStorage.setItem("jwt", token);
      onLogin(username, token, payload, false);
    } catch (err) {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <style>{css}</style>
      <div className="login-box">
        <div className="login-logo">AMONG US</div>
        <div className="login-sub">Educational Edition</div>
        <div className="field">
          <label>Username or Email</label>
          <input
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="username or email"
            disabled={loading}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password"
            disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" style={{marginTop: 20}} onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Enter"}
        </button>
      </div>
    </div>
  );
}

// â”€â”€ ADMIN DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminDashboard({ username, onLogout }) {
  const [gs, setGs] = useState({ ...GS });

  useEffect(() => {
    const unsub = subscribe(setGs);
    return unsub;
  }, []);

  function startGame() {
    if (gs.players.length < 2) {
      alert("Need at least 2 players to start.");
      return;
    }
    const impostors = assignImpostors(gs.players);
    updateGS({ impostors, phase: "story", storyPage: 0, round: 1, eliminated: [], votes: {}, roundResult: null });
  }

  function kickPlayer(playerName) {
    const eliminated = [...gs.eliminated, playerName];
    const remaining = gs.players.filter(p => !eliminated.includes(p.name));
    const impostorsLeft = gs.impostors.filter(i => !eliminated.includes(i));
    const innocentsLeft = remaining.filter(p => !gs.impostors.includes(p.name));

    let gameOver = null;
    if (impostorsLeft.length === 0) gameOver = "innocents";
    else if (impostorsLeft.length >= innocentsLeft.length) gameOver = "impostors";

    updateGS({
      eliminated,
      roundResult: null,
      votes: {},
      phase: gameOver ? "gameover" : "discuss",
      round: gs.round + 1,
      gameOver,
    });
  }

  const activePlayers = gs.players.filter(p => !gs.eliminated.includes(p.name));
  const { counts, topPlayer } = tallyVotes();

  return (
    <div className="app">
      <style>{css}</style>
      <div className="screen">
        <div className="card">
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
            <div>
              <div className="page-title">Admin Dashboard</div>
              <div className="page-sub">Game Control Center</div>
            </div>
            <div style={{display:"flex", gap:10, alignItems:"center"}}>
              <span className="round-badge">ROUND {gs.round}</span>
              <span className={`badge ${gs.phase === "lobby" ? "yellow" : "green"}`}>{gs.phase.toUpperCase()}</span>
              <button className="btn ghost" style={{width:"auto",padding:"6px 16px",fontSize:"0.78rem",letterSpacing:1}} onClick={onLogout}>
                Sign Out
              </button>
            </div>
          </div>

          {gs.phase === "lobby" && (
            <button className="btn safe" style={{marginTop:20}} onClick={startGame}>
              🚀 Start Game ({gs.players.length} players)
            </button>
          )}

          {gs.phase === "gameover" && (
            <button className="btn" style={{marginTop:20}} onClick={() =>
              updateGS({ phase:"lobby", players:[], impostors:[], eliminated:[], votes:{}, round:0, roundResult:null, gameOver:null })
            }>Reset Game</button>
          )}
        </div>

        {/* Players */}
        <div className="card">
          <div style={{fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:12, color:"var(--muted)"}}>
            Players ({activePlayers.length} active)
          </div>
          <div className="player-grid">
            {gs.players.map(p => {
              const isImpostor = gs.impostors.includes(p.name);
              const isElim = gs.eliminated.includes(p.name);
              return (
                <div key={p.name} className={`player-chip ${isImpostor ? "impostor" : ""} ${isElim ? "eliminated" : ""}`}>
                  <div className="avatar">{getAvatar(p.name)}</div>
                  <div>{p.name}</div>
                  {isImpostor && <div style={{fontSize:"0.68rem", color:"var(--red)", marginTop:2}}>IMPOSTOR</div>}
                  {isElim && <div style={{fontSize:"0.68rem", color:"var(--muted)"}}>ELIMINATED</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Vote results */}
        {gs.phase === "result" && Object.keys(counts).length > 0 && (
          <div className="card">
            <div style={{fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:12, color:"var(--muted)"}}>
              Round {gs.round - 1} Vote Results
            </div>
            {Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
              <div key={name} className="kick-row">
                <div style={{width:90}}>{getAvatar(name)} {name}</div>
                <div className="vote-count">{count}</div>
                <div style={{flex:1, background:"var(--border)", borderRadius:999, height:14, overflow:"hidden"}}>
                  <div style={{width:`${(count / gs.players.length) * 100}%`, height:"100%", background:"var(--red)",borderRadius:999}} />
                </div>
              </div>
            ))}
            {topPlayer && (
              <button className="btn" style={{marginTop:20}} onClick={() => kickPlayer(topPlayer)}>
                🔨 Eliminate {topPlayer} ({counts[topPlayer]} votes)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ USER SCREENS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function UserApp({ username, onLogout }) {
  const [gs, setGs] = useState({ ...GS });
  const [myVote, setMyVote] = useState(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [storyPage, setStoryPage] = useState(0);

  useEffect(() => {
    const unsub = subscribe((newGs) => {
      setGs({ ...newGs });
      if (newGs.phase === "vote" || newGs.phase === "discuss") {
        setMyVote(null);
        setVoteSubmitted(false);
      }
    });
    // Register player
    if (!GS.players.find(p => p.name === username)) {
      updateGS({ players: [...GS.players, { name: username }] });
    }
    return unsub;
  }, []);

  function submitVote() {
    if (!myVote || voteSubmitted) return;
    setVoteSubmitted(true);
    const votes = { ...GS.votes, [username]: myVote };
    updateGS({ votes });
    // Auto-advance to result when all active players voted
    const active = GS.players.filter(p => !GS.eliminated.includes(p.name));
    if (Object.keys(votes).filter(v => active.find(p => p.name === v)).length >= active.length) {
      setTimeout(() => updateGS({ phase: "result" }), 800);
    }
  }

  const activePlayers = gs.players.filter(p => !gs.eliminated.includes(p.name) && p.name !== username);
  const isEliminated = gs.eliminated.includes(username);

  // â”€â”€ LOBBY â”€â”€
  if (gs.phase === "lobby") {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="screen">
          <div className="card" style={{textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div className="page-title">Waiting Room</div>
                <div className="page-sub">Game hasn't started yet</div>
              </div>
              <button className="btn ghost" style={{width:"auto",padding:"6px 16px",fontSize:"0.8rem",letterSpacing:1}} onClick={onLogout}>
                Sign Out
              </button>
            </div>
            <div style={{fontSize:"1rem", color:"var(--muted)", marginBottom:20}}>
              <span className="status-dot" />Waiting for admin to start...
            </div>
            <div className="player-grid">
              {gs.players.map(p => (
                <div key={p.name} className="player-chip">
                  <div className="avatar">{getAvatar(p.name)}</div>
                  <div>{p.name}</div>
                  {p.name === username && <div style={{fontSize:"0.68rem", color:"var(--safe)"}}>YOU</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ STORY â”€â”€
  if (gs.phase === "story") {
    const page = STORY_PAGES[storyPage];
    return (
      <div className="app">
        <style>{css}</style>
        <div className="screen">
          <div className="card">
            <div className="story-page">
              <div className="story-icon">{page.icon}</div>
              <div className="story-title">{page.title}</div>
              <div className="story-text">{page.text}</div>
              <div className="story-dots">
                {STORY_PAGES.map((_, i) => (
                  <div key={i} className={`story-dot ${i === storyPage ? "active" : ""}`} />
                ))}
              </div>
              <div className="story-nav">
                {storyPage > 0 && (
                  <button className="btn ghost" style={{width:"auto",padding:"8px 24px"}} onClick={() => setStoryPage(storyPage - 1)}>â† Back</button>
                )}
                {storyPage < STORY_PAGES.length - 1 ? (
                  <button className="btn" style={{width:"auto",padding:"8px 24px"}} onClick={() => setStoryPage(storyPage + 1)}>Next â†’</button>
                ) : (
                  <button className="btn" style={{width:"auto",padding:"8px 32px"}} onClick={() => updateGS({ phase: "discuss" })}>
                    Begin Investigation 🔍
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ DISCUSS â”€â”€
  if (gs.phase === "discuss") {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="screen">
          <div className="card">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12}}>
              <div>
                <div className="page-title">Discussion</div>
                <div className="page-sub">Round {gs.round} · Talk it out</div>
              </div>
              <span className="badge yellow">ROUND {gs.round}</span>
            </div>
            <DiscussTimer onEnd={() => updateGS({ phase: "vote" })} />
            <div style={{marginTop:20, padding:16, background:"#0d0d1a", borderRadius:8, border:"1px solid var(--border)"}}>
              <div style={{fontSize:"0.8rem", letterSpacing:2, color:"var(--muted)", marginBottom:10}}>ACTIVE SUSPECTS</div>
              <div className="player-grid">
                {gs.players.filter(p => !gs.eliminated.includes(p.name)).map(p => (
                  <div key={p.name} className="player-chip">
                    <div className="avatar">{getAvatar(p.name)}</div>
                    <div>{p.name}</div>
                    {p.name === username && <div style={{fontSize:"0.65rem",color:"var(--safe)"}}>YOU</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ VOTE â”€â”€
  if (gs.phase === "vote") {
    if (isEliminated) return <EliminatedScreen username={username} gs={gs} />;
    return (
      <div className="app">
        <style>{css}</style>
        <div className="screen">
          <div className="card">
            <div className="page-title">Vote</div>
            <div className="page-sub">Who is the killer?</div>
            <VoteTimer onEnd={() => !voteSubmitted && updateGS({ phase: "result" })} />
            <div className="vote-grid">
              {activePlayers.map(p => (
                <div key={p.name}
                  className={`vote-card ${myVote === p.name ? "selected" : ""} ${voteSubmitted ? "disabled" : ""}`}
                  onClick={() => !voteSubmitted && setMyVote(p.name)}>
                  <div className="vote-avatar">{getAvatar(p.name)}</div>
                  <div className="vote-name">{p.name}</div>
                  {myVote === p.name && <div style={{fontSize:"0.7rem",color:"var(--red)",marginTop:4}}>SELECTED</div>}
                </div>
              ))}
            </div>
            {!voteSubmitted ? (
              <button className="btn" style={{marginTop:20}} onClick={submitVote} disabled={!myVote}>
                Submit Vote
              </button>
            ) : (
              <div style={{textAlign:"center", marginTop:20, color:"var(--safe)", letterSpacing:2}}>
                ✔ Vote submitted — waiting for others...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ RESULT â”€â”€
  if (gs.phase === "result") {
    const { counts, topPlayer, maxVotes } = tallyVotes();
    const isImpostor = gs.impostors.includes(topPlayer);
    const totalVotes = gs.players.filter(p => !gs.eliminated.includes(p.name)).length;

    return (
      <div className="app">
        <style>{css}</style>
        <div className="screen">
          <div className="card">
            <div className="result-reveal">
              <div style={{fontSize:"0.8rem", letterSpacing:3, color:"var(--muted)"}}>ELIMINATED</div>
              <div className="result-name">{topPlayer || "Nobody"}</div>
              <div className="result-verdict">{topPlayer ? (isImpostor ? "🔪" : "😇") : "🤷"}</div>
              {topPlayer && (
                <span className={`badge ${isImpostor ? "red" : "green"}`} style={{fontSize:"0.9rem", padding:"4px 16px"}}>
                  {isImpostor ? "IMPOSTOR" : "INNOCENT"}
                </span>
              )}
            </div>
            <hr className="divider" />
            <div style={{fontSize:"0.78rem", letterSpacing:2, color:"var(--muted)", marginBottom:12}}>VOTE BREAKDOWN</div>
            {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name, count]) => (
              <div key={name} className="vote-bar-row">
                <div className="vote-bar-name">{getAvatar(name)} {name}</div>
                <div className="vote-bar-track">
                  <div className="vote-bar-fill" style={{width:`${(count/totalVotes)*100}%`}} />
                </div>
                <div className="vote-bar-count">{count}</div>
              </div>
            ))}
            <div style={{marginTop:16, fontSize:"0.82rem", color:"var(--muted)", textAlign:"center"}}>
              Waiting for admin to continue...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ GAMEOVER â”€â”€
  if (gs.phase === "gameover") {
    const impostorsWon = gs.gameOver === "impostors";
    return (
      <div className="app">
        <style>{css}</style>
        <div className="screen">
          <div className="card">
            <div className="gameover">
              <div className={`gameover-title ${impostorsWon ? "red" : "green"}`}>
                {impostorsWon ? "IMPOSTORS WIN" : "INNOCENTS WIN"}
              </div>
              <div style={{fontSize:"4rem", margin:"16px 0"}}>{impostorsWon ? "🔪" : "🎉"}</div>
              <div style={{color:"var(--muted)", marginBottom:20}}>
                {impostorsWon ? "The killers were never caught..." : "Justice has been served!"}
              </div>
              <div style={{marginBottom:12, fontSize:"0.8rem", letterSpacing:2, color:"var(--muted)"}}>THE IMPOSTORS WERE</div>
              <div style={{display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap"}}>
                {gs.impostors.map(name => (
                  <div key={name} className="player-chip" style={{border:"1px solid var(--red)", color:"var(--red)"}}>
                    <div className="avatar">{getAvatar(name)}</div>
                    <div>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function DiscussTimer({ onEnd }) {
  const DURATION = 60;
  const time = useTimer(DURATION, true, onEnd);
  return (
    <div>
      <div className="timer-count">{time}s</div>
      <div className="timer-bar"><div className="timer-fill" style={{width:`${(time/DURATION)*100}%`}} /></div>
      <div style={{textAlign:"center", fontSize:"0.8rem", color:"var(--muted)", letterSpacing:2}}>DISCUSSION TIME</div>
    </div>
  );
}

function VoteTimer({ onEnd }) {
  const DURATION = 60;
  const time = useTimer(DURATION, true, onEnd);
  return (
    <div style={{marginBottom:20}}>
      <div className="timer-count">{time}s</div>
      <div className="timer-bar"><div className="timer-fill" style={{width:`${(time/DURATION)*100}%`}} /></div>
      <div style={{textAlign:"center", fontSize:"0.8rem", color:"var(--muted)", letterSpacing:2}}>VOTING TIME</div>
    </div>
  );
}

function EliminatedScreen({ username }) {
  return (
    <div className="app">
      <style>{css}</style>
      <div className="screen">
        <div className="card" style={{textAlign:"center", padding:60}}>
          <div style={{fontSize:"5rem", marginBottom:16}}>👻</div>
          <div className="page-title">You've Been Eliminated</div>
          <div style={{color:"var(--muted)", marginTop:8}}>Watch the others try to find the killer...</div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ ROOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const [user, setUser] = useState(null);

  function handleLogin(username, token, payload, isAdmin) {
    setUser({ username, token, payload, isAdmin });
  }

  function handleLogout() {
    sessionStorage.removeItem("jwt");
    setUser(null);
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (user.isAdmin) return <AdminDashboard username={user.username} onLogout={handleLogout} />;
  return <UserApp username={user.username} onLogout={handleLogout} />;
}
