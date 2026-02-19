import { useState, useEffect, useRef } from "react";

// ── AUTH ──────────────────────────────────────────────────────────────────────
const SIGNIN_URL     = "https://learn.reboot01.com/api/auth/signin";
const ADMIN_USERNAME = "haaljafen";
const TEST_USERS     = ["sbucheer", "mkhattar"];

function parseJWT(token) {
  try {
    const b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b));
  } catch { return null; }
}

// ── TIMER HOOK ───────────────────────────────────────────────────────────────
function useTimer(seconds, active, onDone) {
  const [t, setT] = useState(seconds);
  const ref = useRef(null);
  useEffect(() => { setT(seconds); }, [seconds, active]);
  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => {
      setT(prev => {
        if (prev <= 1) { clearInterval(ref.current); onDone && onDone(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [active]);
  return t;
}

function Timer({ seconds, label, onDone }) {
  const t = useTimer(seconds, true, onDone);
  return (
    <div className="timer-wrap">
      <div className="timer-num">{t}s</div>
      <div className="timer-bar"><div className="timer-fill" style={{width:`${(t/seconds)*100}%`}} /></div>
      <div className="timer-label">{label}</div>
    </div>
  );
}

// ── WEBSOCKET ─────────────────────────────────────────────────────────────────
const WS_URL = "ws://localhost:4000";

const DEFAULT_GS = {
  lobby: [], roster: [], impostors: [], phase: "lobby",
  round: 0, eliminated: [], votes: {}, gameOver: null,
};

const PROGRESS_KEY = "among-us:progress";

// Shape saved to localStorage and accessible by any consumer:
// { round, history: [{ round, topVoted, wasImpostor }], bothImpostorsFound }
function computeProgress(gs) {
  const history = gs.eliminated.map((name, i) => ({
    round: i + 1,
    topVoted: name,
    wasImpostor: gs.impostors.includes(name),
  }));
  return {
    round: gs.round,
    history,
    bothImpostorsFound: gs.impostors.length > 0 && gs.impostors.every(i => gs.eliminated.includes(i)),
  };
}

function useGameServer(username, isAdmin) {
  const [gs, setGs]           = useState({ ...DEFAULT_GS });
  const [connected, setConn]  = useState(false);
  const wsRef                 = useRef(null);
  const nameRef               = useRef(username);

  useEffect(() => { nameRef.current = username; }, [username]);

  // Persist progress summary to localStorage whenever game state changes
  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(computeProgress(gs)));
  }, [gs]);

  useEffect(() => {
    let timer = null;
    let closed = false;
    function connect() {
      if (closed) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConn(true);
          if (!isAdmin && nameRef.current) {
            ws.send(JSON.stringify({ type: "join", username: nameRef.current }));
          } else {
            ws.send(JSON.stringify({ type: "update", patch: {} })); // just get state
          }
        };
        ws.onmessage = e => {
          const msg = JSON.parse(e.data);
          if (msg.type === "state") setGs({ ...msg.state });
        };
        ws.onclose = () => {
          setConn(false);
          wsRef.current = null;
          if (!closed) timer = setTimeout(connect, 2000);
        };
        ws.onerror = () => ws.close();
      } catch {}
    }
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      if (wsRef.current) {
        // notify server on leave
        if (!isAdmin && nameRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "leave", username: nameRef.current }));
        }
        wsRef.current.close();
      }
    };
  }, []);

  function send(msg) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  return { gs, connected, send, gameProgress: computeProgress(gs) };
}

// ── STORY PAGES ───────────────────────────────────────────────────────────────
const STORY_PAGES = [
  { title: "ONE WEEK AGO",       icon: "🕯️", text: "A dead body was found near the quest room — a lighter left beside it, still warm. The victim had been here only hours before the discovery." },
  { title: "THE SUSPECTS",       icon: "👥", text: "Six people were present that night. All of them had access. All of them had motive. Now they stand among you — the suspects are your fellow players." },
  { title: "THE KILLER IS HERE", icon: "🔪", text: "At least one of them is the killer. Maybe two. They will lie. They will convince. They will point fingers at the innocent." },
  { title: "YOUR MISSION",       icon: "🔍", text: "Discuss. Debate. Vote. The most suspected player will be eliminated each round. Find the killer — before the killer fools you all." },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const AVATARS = ["🧑‍🚀","👩‍🚀","🧑‍🔬","👩‍🔬","🧑‍💻","👨‍🎤","👩‍🎤","🧛","🧟","🕵️"];
function getAvatar(name) { return AVATARS[(name||"?").charCodeAt(0) % AVATARS.length]; }

function tallyVotes(votes) {
  const counts = {};
  Object.values(votes).forEach(v => { counts[v] = (counts[v]||0) + 1; });
  let max = 0, top = null;
  Object.entries(counts).forEach(([p,c]) => { if (c > max) { max = c; top = p; } });
  return { counts, top };
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--red:#e63946;--dark:#0a0a12;--panel:#12121f;--border:#2a2a40;--glow:rgba(230,57,70,0.4);--text:#d0d0e8;--muted:#6060a0;--safe:#4ade80;--warn:#fbbf24}
  body{background:var(--dark);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh}
  .app{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;
    background:radial-gradient(ellipse at 20% 50%,#1a0010 0%,transparent 60%),
               radial-gradient(ellipse at 80% 20%,#0a001a 0%,transparent 60%),var(--dark)}
  .login-box{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:48px 40px;width:360px;animation:fadeUp 0.4s ease}
  .login-logo{font-family:'Creepster',cursive;font-size:2.8rem;color:var(--red);text-align:center;letter-spacing:2px;text-shadow:0 0 20px var(--glow);margin-bottom:4px}
  .login-sub{text-align:center;color:var(--muted);font-size:0.85rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:32px}
  .field{margin-bottom:18px}
  .field label{display:block;font-size:0.78rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .field input{width:100%;background:#0d0d1a;border:1px solid var(--border);border-radius:6px;padding:10px 14px;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:0.95rem;outline:none;transition:border-color 0.2s}
  .field input:focus{border-color:var(--red);box-shadow:0 0 0 2px var(--glow)}
  .btn{width:100%;padding:12px;background:var(--red);border:none;border-radius:6px;color:#fff;font-family:'Rajdhani',sans-serif;font-size:1.05rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:opacity 0.2s,box-shadow 0.2s}
  .btn:hover{opacity:0.9;box-shadow:0 0 20px var(--glow)}
  .btn:disabled{opacity:0.4;cursor:not-allowed}
  .btn.ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
  .btn.ghost:hover{border-color:var(--red);color:var(--red);box-shadow:none}
  .btn.green{background:var(--safe);color:#000}
  .btn.yellow{background:var(--warn);color:#000}
  .error{color:var(--red);font-size:0.82rem;margin-top:10px;text-align:center}
  .screen{width:100%;max-width:900px;animation:fadeUp 0.3s ease}
  .card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:20px}
  .page-title{font-family:'Creepster',cursive;font-size:2rem;color:var(--red);letter-spacing:2px;text-shadow:0 0 15px var(--glow);margin-bottom:6px}
  .page-sub{color:var(--muted);font-size:0.82rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px}
  .divider{border:none;border-top:1px solid var(--border);margin:20px 0}
  .player-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:12px}
  .player-chip{background:#0d0d1a;border:1px solid var(--border);border-radius:8px;padding:12px 8px;text-align:center;font-size:0.85rem;font-weight:600;letter-spacing:1px}
  .player-chip .av{font-size:1.5rem;margin-bottom:4px}
  .player-chip.elim{opacity:0.3;text-decoration:line-through}
  .player-chip.impostor-chip{border-color:var(--red);color:var(--red)}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:0.7rem;letter-spacing:2px;text-transform:uppercase;font-weight:700}
  .badge.red{background:rgba(230,57,70,0.15);color:var(--red);border:1px solid var(--red)}
  .badge.green{background:rgba(74,222,128,0.15);color:var(--safe);border:1px solid var(--safe)}
  .badge.yellow{background:rgba(251,191,36,0.15);color:var(--warn);border:1px solid var(--warn)}
  .badge.muted{background:rgba(96,96,160,0.15);color:var(--muted);border:1px solid var(--muted)}
  .story-page{text-align:center;padding:40px 20px;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
  .story-icon{font-size:4rem;animation:pulse 2s infinite}
  .story-title{font-family:'Creepster',cursive;font-size:2.4rem;color:var(--red);letter-spacing:3px;text-shadow:0 0 20px var(--glow)}
  .story-text{font-size:1.1rem;color:var(--text);line-height:1.7;max-width:520px;opacity:0.9}
  .story-dots{display:flex;gap:8px}
  .story-dot{width:8px;height:8px;border-radius:50%;background:var(--border);transition:background 0.3s}
  .story-dot.active{background:var(--red);box-shadow:0 0 8px var(--glow)}
  .vote-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
  .vote-card{background:#0d0d1a;border:2px solid var(--border);border-radius:10px;padding:18px 12px;text-align:center;cursor:pointer;transition:all 0.2s}
  .vote-card:hover:not(.disabled){border-color:var(--warn);transform:translateY(-2px)}
  .vote-card.selected{border-color:var(--red);box-shadow:0 0 16px var(--glow);background:rgba(230,57,70,0.08)}
  .vote-card.disabled{opacity:0.4;cursor:not-allowed;pointer-events:none}
  .vote-card .av{font-size:2rem;margin-bottom:6px}
  .vote-card .vname{font-weight:700;font-size:0.95rem;letter-spacing:1px}
  .vote-card .velim{font-size:0.7rem;color:var(--muted);margin-top:4px;letter-spacing:1px}
  .result-box{text-align:center;padding:24px}
  .result-name{font-family:'Creepster',cursive;font-size:2.8rem;color:var(--warn);margin:10px 0}
  .result-icon{font-size:3.5rem;margin:10px 0;animation:pulse 1s infinite}
  .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .bar-name{width:100px;text-align:right;font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar-track{flex:1;background:var(--border);border-radius:999px;height:16px;overflow:hidden}
  .bar-fill{height:100%;background:var(--red);border-radius:999px;transition:width 1s ease}
  .bar-count{width:20px;font-size:0.8rem;color:var(--muted);font-family:'Share Tech Mono',monospace}
  .gameover-box{text-align:center;padding:40px}
  .gameover-title{font-family:'Creepster',cursive;font-size:3.5rem;letter-spacing:4px;margin-bottom:12px}
  .gameover-title.red{color:var(--red);text-shadow:0 0 30px var(--glow)}
  .gameover-title.green{color:var(--safe);text-shadow:0 0 30px rgba(74,222,128,0.5)}
  .round-tag{font-family:'Share Tech Mono',monospace;font-size:1rem;color:var(--warn);letter-spacing:2px}
  .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--safe);box-shadow:0 0 6px var(--safe);animation:pulse 2s infinite;margin-right:6px}
  .conn{display:inline-block;width:7px;height:7px;border-radius:50%;vertical-align:middle;margin-left:6px}
  .conn.ok{background:var(--safe);box-shadow:0 0 5px var(--safe)}
  .conn.err{background:var(--red);box-shadow:0 0 5px var(--red)}
  .admin-controls{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
  .admin-controls .btn{width:auto;padding:10px 20px;font-size:0.85rem}
  .waiting-msg{color:var(--muted);font-size:0.85rem;letter-spacing:2px;text-align:center;margin-top:16px;padding:12px;border:1px dashed var(--border);border-radius:8px}
  .section-label{font-size:0.75rem;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;font-weight:700}
  .timer-wrap{margin-bottom:20px;text-align:center;padding:16px;background:#0d0d1a;border-radius:10px;border:1px solid var(--border)}
  .timer-num{font-family:'Share Tech Mono',monospace;font-size:3rem;color:var(--red);text-shadow:0 0 20px var(--glow);line-height:1}
  .timer-bar{background:var(--border);border-radius:999px;height:8px;overflow:hidden;margin:10px 0 6px}
  .timer-fill{height:100%;background:var(--red);border-radius:999px;transition:width 1s linear;box-shadow:0 0 10px var(--glow)}
  .timer-label{font-size:0.72rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
`;

// ── CONNECTION WARNING ────────────────────────────────────────────────────────
function ConnWarn({ connected }) {
  if (connected) return null;
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:999,background:"rgba(230,57,70,0.95)",
      color:"#fff",textAlign:"center",padding:"10px",fontFamily:"'Rajdhani',sans-serif",
      fontWeight:700,letterSpacing:2,fontSize:"0.85rem"}}>
      ⚠ Reconnecting to server... make sure <code style={{background:"rgba(0,0,0,0.3)",padding:"2px 6px",borderRadius:4}}>node src/server.js</code> is running
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [id, setId]         = useState("");
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoad]  = useState(false);

  async function handleLogin() {
    const name = id.trim();
    if (!name) { setErr("Please enter your username or email."); return; }
    if (name === ADMIN_USERNAME) { onLogin(ADMIN_USERNAME, true); return; }
    if (TEST_USERS.includes(name)) { onLogin(name, false); return; }
    if (!pw) { setErr("Please enter your password."); return; }
    setLoad(true); setErr("");
    try {
      const res = await fetch(SIGNIN_URL, {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${name}:${pw}`)}` },
      });
      if (!res.ok) { setErr(res.status === 401 || res.status === 403 ? "Invalid credentials." : `Error ${res.status}.`); return; }
      let token = (await res.text()).replace(/^"|"$/g, "");
      const payload = parseJWT(token);
      const username = payload?.login || payload?.name || payload?.sub || name;
      localStorage.setItem("among-us:jwt", token);
      onLogin(username, false);
    } catch { setErr("Network error — check your connection."); }
    finally { setLoad(false); }
  }

  return (
    <div className="app"><style>{css}</style>
      <div className="login-box">
        <div className="login-logo">AMONG US</div>
        <div className="login-sub">Educational Edition</div>
        <div className="field">
          <label>Username or Email</label>
          <input value={id} onChange={e => setId(e.target.value)} placeholder="username or email" disabled={loading} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="leave blank for test users" disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {err && <div className="error">{err}</div>}
        <button className="btn" style={{marginTop:20}} onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Enter"}
        </button>
      </div>
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function Header({ title, sub, round, phase, connected, onLogout }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:20}}>
      <div>
        <div className="page-title">{title}</div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        {round > 0 && <span className="round-tag">ROUND {round}</span>}
        {phase && <span className={`badge ${phase === "lobby" ? "yellow" : phase === "gameover" ? "red" : "green"}`}>{phase.toUpperCase()}</span>}
        <span className={`conn ${connected ? "ok" : "err"}`} title={connected ? "Connected" : "Disconnected"} />
        <button className="btn ghost" style={{width:"auto",padding:"6px 16px",fontSize:"0.78rem",letterSpacing:1}} onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }) {
  const { gs, connected, send } = useGameServer(null, true);
  const { counts, top } = tallyVotes(gs.votes);
  const activeRoster = gs.roster ? gs.roster.filter(p => !gs.eliminated.includes(p.name)) : [];
  const totalVoters  = gs.lobby ? gs.lobby.length : 0;

  return (
    <div className="app"><style>{css}</style>
      <ConnWarn connected={connected} />
      <div className="screen">

        {/* Header + controls */}
        <div className="card">
          <Header title="Admin Dashboard" sub="Game Control Center"
            round={gs.round} phase={gs.phase} connected={connected} onLogout={onLogout} />

          <div className="admin-controls">
            {gs.phase === "lobby" && (
              <button className="btn green" onClick={() => send({ type:"startgame" })}>
                🚀 Start Game
              </button>
            )}
            {gs.phase === "story" && (
              <button className="btn yellow" onClick={() => send({ type:"update", patch:{ phase:"discuss" } })}>
                🗣️ Start Discussion
              </button>
            )}
            {gs.phase === "discuss" && (
              <button className="btn yellow" onClick={() => send({ type:"startvote" })}>
                🗳️ Start Voting
              </button>
            )}
            {gs.phase === "vote" && (
              <button className="btn" onClick={() => send({ type:"showresult" })}>
                📊 Show Results
              </button>
            )}
            {gs.phase === "result" && top && (
              <button className="btn" onClick={() => send({ type:"kick", target: top })}>
                🔨 Eliminate {top} ({counts[top]} votes) → Next Round
              </button>
            )}
            {gs.phase === "gameover" && (
              <button className="btn ghost" onClick={() => send({ type:"reset" })}>
                🔄 Reset Game
              </button>
            )}
            {gs.phase !== "lobby" && gs.phase !== "gameover" && (
              <button className="btn" style={{background:"#3a0a0a",border:"1px solid var(--red)",color:"var(--red)"}}
                onClick={() => { if (window.confirm("End the current game and return everyone to the lobby?")) send({ type:"reset" }); }}>
                ✖ End Game
              </button>
            )}
          </div>
        </div>

        {/* Logged-in players */}
        <div className="card">
          <div className="section-label">Players in Lobby ({totalVoters} logged in)</div>
          {totalVoters === 0
            ? <div style={{color:"var(--muted)",fontSize:"0.9rem"}}>No players connected yet...</div>
            : <div className="player-grid">
                {gs.lobby.map(p => (
                  <div key={p.name} className="player-chip">
                    <div className="av">{getAvatar(p.name)}</div>
                    <div>{p.name}</div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* RTC Roster */}
        {gs.phase !== "lobby" && (
          <div className="card">
            <div className="section-label">RTC Suspects ({activeRoster.length} remaining)</div>
            <div className="player-grid">
              {gs.roster && gs.roster.map(p => {
                const isImpostor = gs.impostors.includes(p.name);
                const isElim     = gs.eliminated.includes(p.name);
                return (
                  <div key={p.name} className={`player-chip ${isImpostor ? "impostor-chip" : ""} ${isElim ? "elim" : ""}`}>
                    <div className="av">{getAvatar(p.name)}</div>
                    <div>{p.name}</div>
                    {isImpostor && <div style={{fontSize:"0.65rem",color:"var(--red)",marginTop:2}}>IMPOSTOR</div>}
                    {isElim     && <div style={{fontSize:"0.65rem",color:"var(--muted)"}}>ELIMINATED</div>}
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
            {Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
              <div key={name} className="bar-row">
                <div className="bar-name">{getAvatar(name)} {name}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{width:`${(count / Math.max(1, totalVoters)) * 100}%`}} />
                </div>
                <div className="bar-count">{count}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── USER VIEW ─────────────────────────────────────────────────────────────────
function UserApp({ username, onLogout }) {
  const { gs, connected, send } = useGameServer(username, false);
  const [myVote, setMyVote]         = useState(null);
  const [voted, setVoted]           = useState(false);
  const [storyPage, setStoryPage]   = useState(0);
  const prevPhase = useRef(null);

  // Reset vote state when phase changes to vote
  useEffect(() => {
    if (gs.phase !== prevPhase.current) {
      if (gs.phase === "vote") { setMyVote(null); setVoted(false); }
      prevPhase.current = gs.phase;
    }
  }, [gs.phase]);

  function submitVote() {
    if (!myVote || voted) return;
    setVoted(true);
    send({ type: "vote", voter: username, target: myVote });
  }

  const activeRoster = gs.roster ? gs.roster.filter(p => !gs.eliminated.includes(p.name)) : [];
  const { counts, top } = tallyVotes(gs.votes);
  const totalVoters = gs.lobby ? gs.lobby.length : 0;

  // ── LOBBY ──
  if (gs.phase === "lobby") return (
    <div className="app"><style>{css}</style>
      <ConnWarn connected={connected} />
      <div className="screen"><div className="card">
        <Header title="Waiting Room" sub="Game hasn't started yet"
          phase="lobby" connected={connected} onLogout={onLogout} />
        <div style={{color:"var(--muted)",marginBottom:16}}>
          <span className="status-dot"/>Waiting for admin to start the game...
        </div>
        <div className="section-label">Players Ready ({gs.lobby?.length || 0})</div>
        <div className="player-grid">
          {(gs.lobby||[]).map(p => (
            <div key={p.name} className="player-chip">
              <div className="av">{getAvatar(p.name)}</div>
              <div>{p.name}</div>
              {p.name === username && <div style={{fontSize:"0.65rem",color:"var(--safe)",marginTop:2}}>YOU</div>}
            </div>
          ))}
        </div>
      </div></div>
    </div>
  );

  // ── STORY ──
  if (gs.phase === "story") {
    const page = STORY_PAGES[storyPage];
    return (
      <div className="app"><style>{css}</style>
        <ConnWarn connected={connected} />
        <div className="screen"><div className="card">
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
            <button className="btn ghost" style={{width:"auto",padding:"6px 16px",fontSize:"0.78rem",letterSpacing:1}} onClick={onLogout}>Sign Out</button>
          </div>
          <div className="story-page">
            <div className="story-icon">{page.icon}</div>
            <div className="story-title">{page.title}</div>
            <div className="story-text">{page.text}</div>
            <div className="story-dots">
              {STORY_PAGES.map((_,i) => <div key={i} className={`story-dot ${i===storyPage?"active":""}`} />)}
            </div>
            <div style={{display:"flex",gap:12,marginTop:12}}>
              {storyPage > 0 && (
                <button className="btn ghost" style={{width:"auto",padding:"8px 24px"}} onClick={() => setStoryPage(s=>s-1)}>← Back</button>
              )}
              {storyPage < STORY_PAGES.length - 1 && (
                <button className="btn" style={{width:"auto",padding:"8px 24px"}} onClick={() => setStoryPage(s=>s+1)}>Next →</button>
              )}
            </div>
            {storyPage === STORY_PAGES.length - 1 && (
              <div className="waiting-msg">⏳ Waiting for admin to begin discussion...</div>
            )}
          </div>
        </div></div>
      </div>
    );
  }

  // ── DISCUSS ──
  if (gs.phase === "discuss") return (
    <div className="app"><style>{css}</style>
      <ConnWarn connected={connected} />
      <div className="screen"><div className="card">
        <Header title="Discussion" sub={`Round ${gs.round} · Talk it out in real life`}
          round={gs.round} phase="discuss" connected={connected} onLogout={onLogout} />
        <Timer seconds={60} label="DISCUSSION TIME" onDone={() => send({ type:"startvote" })} />
        <div style={{padding:16,background:"#0d0d1a",borderRadius:8,border:"1px solid var(--border)",textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:"1.8rem",marginBottom:6}}>🗣️</div>
          <div style={{fontSize:"1rem",fontWeight:700,letterSpacing:1}}>Discuss with your group!</div>
          <div style={{color:"var(--muted)",marginTop:4,fontSize:"0.88rem"}}>Who do you think the impostor is? Share your suspicions aloud.</div>
        </div>
        <div className="section-label">The Suspects</div>
        <div className="player-grid">
          {activeRoster.map(p => (
            <div key={p.name} className="player-chip">
              <div className="av">{getAvatar(p.name)}</div>
              <div>{p.name}</div>
            </div>
          ))}
        </div>
      </div></div>
    </div>
  );

  // ── VOTE ──
  if (gs.phase === "vote") return (
    <div className="app"><style>{css}</style>
      <ConnWarn connected={connected} />
      <div className="screen"><div className="card">
        <Header title="Vote" sub="Who is the impostor?"
          round={gs.round} phase="vote" connected={connected} onLogout={onLogout} />
        <Timer seconds={60} label="VOTING TIME" onDone={() => setVoted(true)} />
        <div className="vote-grid">
          {activeRoster.map(p => (
            <div key={p.name}
              className={`vote-card ${myVote===p.name?"selected":""} ${voted?"disabled":""}`}
              onClick={() => !voted && setMyVote(p.name)}>
              <div className="av">{getAvatar(p.name)}</div>
              <div className="vname">{p.name}</div>
              {myVote === p.name && <div className="velim">SELECTED</div>}
            </div>
          ))}
        </div>
        {!voted ? (
          <button className="btn" style={{marginTop:20}} onClick={submitVote} disabled={!myVote}>
            Submit Vote
          </button>
        ) : (
          <div style={{textAlign:"center",marginTop:20,color:"var(--safe)",letterSpacing:2,fontSize:"0.9rem"}}>
            ✔ Vote submitted — waiting for admin to show results...
          </div>
        )}
        <div style={{marginTop:12,textAlign:"center",color:"var(--muted)",fontSize:"0.82rem"}}>
          {Object.keys(gs.votes).length} of {totalVoters} voted
        </div>
      </div></div>
    </div>
  );

  // ── RESULT ──
  if (gs.phase === "result") {
    const topIsImpostor = gs.impostors.includes(top);
    return (
      <div className="app"><style>{css}</style>
        <div className="screen"><div className="card">
          <Header title="Results" sub={`Round ${gs.round}`}
            round={gs.round} phase="result" connected={connected} onLogout={onLogout} />
          <div className="result-box">
            <div style={{fontSize:"0.8rem",letterSpacing:3,color:"var(--muted)"}}>MOST VOTED</div>
            <div className="result-name">{top || "No votes"}</div>
            {top && <div className="result-icon">{topIsImpostor ? "🔪" : "😇"}</div>}
            {top && (
              <span className={`badge ${topIsImpostor ? "red" : "green"}`} style={{fontSize:"0.9rem",padding:"4px 16px"}}>
                {topIsImpostor ? "IMPOSTOR" : "INNOCENT"}
              </span>
            )}
          </div>
          <div className="waiting-msg" style={{marginTop:16}}>⏳ Waiting for admin to eliminate and continue...</div>
        </div></div>
      </div>
    );
  }

  // ── GAMEOVER ──
  if (gs.phase === "gameover") {
    const impostorsWon = gs.gameOver === "impostors";
    return (
      <div className="app"><style>{css}</style>
        <div className="screen"><div className="card">
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
            <button className="btn ghost" style={{width:"auto",padding:"6px 16px",fontSize:"0.78rem",letterSpacing:1}} onClick={onLogout}>Sign Out</button>
          </div>
          <div className="gameover-box">
            <div className={`gameover-title ${impostorsWon ? "red" : "green"}`}>
              {impostorsWon ? "IMPOSTORS WIN" : "INNOCENTS WIN"}
            </div>
            <div style={{fontSize:"4rem",margin:"16px 0"}}>{impostorsWon ? "🔪" : "🎉"}</div>
            <div style={{color:"var(--muted)",marginBottom:24,fontSize:"1rem"}}>
              {impostorsWon ? "The killers were never caught..." : "Justice has been served!"}
            </div>
            <div className="section-label">The Impostors Were</div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginTop:8}}>
              {gs.impostors.map(name => (
                <div key={name} className="player-chip impostor-chip">
                  <div className="av">{getAvatar(name)}</div>
                  <div>{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div></div>
      </div>
    );
  }

  return null;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    // JWT-based persistence for real users
    const jwt = localStorage.getItem("among-us:jwt");
    if (jwt) {
      const payload = parseJWT(jwt);
      const username = payload?.login || payload?.name || payload?.sub;
      if (username) return { username, isAdmin: false };
    }
    // Fallback for admin / test users (no JWT)
    try { return JSON.parse(localStorage.getItem("among-us:user")) || null; }
    catch { return null; }
  });

  function handleLogin(username, isAdmin) {
    // Admin and test users have no JWT — persist their session separately
    if (isAdmin || TEST_USERS.includes(username)) {
      localStorage.setItem("among-us:user", JSON.stringify({ username, isAdmin }));
    }
    setUser({ username, isAdmin });
  }

  function handleLogout() {
    localStorage.removeItem("among-us:jwt");
    localStorage.removeItem("among-us:user");
    setUser(null);
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (user.isAdmin) return <AdminDashboard onLogout={handleLogout} />;
  return <UserApp username={user.username} onLogout={handleLogout} />;
}
