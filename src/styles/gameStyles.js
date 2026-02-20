// Game CSS styles
export const gameStyles = `
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
  .suspect-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
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
  .timer-wrap{margin-bottom:16px;text-align:center}
  .timer-num{font-family:'Share Tech Mono',monospace;font-size:2.2rem;color:var(--red);text-shadow:0 0 15px var(--glow)}
  .timer-bar{background:var(--border);border-radius:999px;height:6px;overflow:hidden;margin:8px 0}
  .timer-fill{height:100%;background:var(--red);border-radius:999px;transition:width 1s linear;box-shadow:0 0 8px var(--glow)}
  .timer-label{font-size:0.75rem;letter-spacing:3px;color:var(--muted)}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  .chat-sidebar{width:280px;min-width:220px;background:#080810;border-left:1px solid var(--border);display:flex;flex-direction:column;height:100vh;position:sticky;top:0;flex-shrink:0}
  .chat-label{font-size:0.68rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;padding:8px 10px 4px;border-bottom:1px solid var(--border);font-family:'Share Tech Mono',monospace}
  .chat-messages{flex:1;overflow-y:auto;padding:10px;font-family:'Share Tech Mono',monospace;font-size:0.76rem;line-height:1.6;color:var(--text)}
  .chat-msg{margin-bottom:2px;word-break:break-word}
  .chat-time{color:var(--muted)}
  .chat-user-own{color:var(--safe)}
  .chat-user-other{color:var(--red)}
  .chat-input-row{display:flex;gap:6px;padding:8px;border-top:1px solid var(--border)}
  .chat-input-row input{flex:1;background:#0d0d1a;border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:0.78rem;outline:none}
  .chat-input-row input:focus{border-color:var(--red)}
  .chat-send-btn{padding:5px 10px;font-size:0.75rem;width:auto}
  .game-layout{display:flex;min-height:100vh;background:radial-gradient(ellipse at 20% 50%,#1a0010 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,#0a001a 0%,transparent 60%),var(--dark)}
  .game-main{flex:1;min-width:0;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:16px}
  .game-main .app{min-height:unset;background:none;width:100%;max-width:900px;display:flex;align-items:flex-start;justify-content:center;padding:0}
`;

