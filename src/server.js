// Among Us Game Server
// Place in src/ folder and run: node src/server.js

import { WebSocketServer } from "ws";

const PORT = 4000;

const RTC_ROSTER = [
  { name: "Hajar"    },
  { name: "Sara"     },
  { name: "Mariam"   },
  { name: "Mohammad" },
  { name: "Nooh"     },
  { name: "Yousif"   },
];

function freshState() {
  return {
    // logged-in players (viewers/voters)
    lobby: [],
    // the fixed RTC roster for voting
    roster: RTC_ROSTER.map(p => ({ ...p })),
    impostors: [],
    phase: "lobby",   // lobby | discuss | vote | result | gameover
    round: 0,
    eliminated: [],
    votes: {},
    gameOver: null,   // null | "innocents" | "impostors"
  };
}

let gameState = freshState();
const wss = new WebSocketServer({ port: PORT });
const clients = new Set();

function broadcast(state) {
  const msg = JSON.stringify({ type: "state", state });
  clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

function assignImpostors() {
  const active = gameState.roster.filter(p => !gameState.eliminated.includes(p.name));
  const shuffled = [...active].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).map(p => p.name);
}

function checkGameOver() {
  const active       = gameState.roster.filter(p => !gameState.eliminated.includes(p.name));
  const impostorsLeft = gameState.impostors.filter(i => !gameState.eliminated.includes(i));
  const innocentsLeft = active.filter(p => !gameState.impostors.includes(p.name));

  if (impostorsLeft.length === 0) return "innocents";
  // Game ends if impostors >= innocents OR only 10 or fewer total remain (with at least 1 impostor)
  if (impostorsLeft.length >= innocentsLeft.length) return "impostors";
  if (active.length <= 10 && impostorsLeft.length > 0) return "impostors";
  return null;
}

wss.on("connection", ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: "state", state: gameState }));
  console.log(`✅ Client connected — total: ${clients.size}`);

  ws.on("message", raw => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "join") {
        // A viewer logs in and joins the lobby list
        const { username } = msg;
        if (!gameState.lobby.find(p => p.name === username)) {
          gameState = { ...gameState, lobby: [...gameState.lobby, { name: username }] };
          broadcast(gameState);
        } else {
          ws.send(JSON.stringify({ type: "state", state: gameState }));
        }
      }

      if (msg.type === "leave") {
        const { username } = msg;
        gameState = { ...gameState, lobby: gameState.lobby.filter(p => p.name !== username) };
        broadcast(gameState);
      }

      if (msg.type === "update") {
        gameState = { ...gameState, ...msg.patch };
        broadcast(gameState);
      }

      if (msg.type === "startgame") {
        const impostors = assignImpostors();
        gameState = { ...gameState, impostors, phase: "story", round: 1, eliminated: [], votes: {}, gameOver: null };
        broadcast(gameState);
      }

      if (msg.type === "startvote") {
        gameState = { ...gameState, phase: "vote", votes: {} };
        broadcast(gameState);
      }

      if (msg.type === "vote") {
        const { voter, target } = msg;
        gameState = { ...gameState, votes: { ...gameState.votes, [voter]: target } };
        broadcast(gameState);
      }

      if (msg.type === "showresult") {
        gameState = { ...gameState, phase: "result" };
        broadcast(gameState);
      }

      if (msg.type === "kick") {
        const { target } = msg;
        const eliminated = [...gameState.eliminated, target];
        gameState = { ...gameState, eliminated };
        const gameOver = checkGameOver();
        if (gameOver) {
          gameState = { ...gameState, phase: "gameover", gameOver };
        } else {
          gameState = { ...gameState, phase: "discuss", round: gameState.round + 1, votes: {} };
        }
        broadcast(gameState);
      }

      if (msg.type === "reset") {
        gameState = freshState();
        broadcast(gameState);
      }

    } catch (e) { console.error("Bad message:", e.message); }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`Client disconnected — total: ${clients.size}`);
  });
});

console.log(`\n🎮 Among Us Game Server → ws://localhost:${PORT}\n`);
