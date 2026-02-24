// Among Us Game Server
// Run with: node src/server.js (or npm run server)

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";
import { freshState } from "./server/gameState.js";
import {
  handleJoin,
  handleLeave,
  handleUpdate,
  handleStartGame,
  handleVote,
  handleShowResult,
  handleKick,
  handleReset,
} from "./server/messageHandlers.js";

const PORT = 4000;
const ADMIN_USERNAME = "sbucheer";
const REBOOT_SIGNIN = "https://learn.reboot01.com/api/auth/signin";
const REBOOT_GQL = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

// ── Session store ─────────────────────────────────────────────────────────────
// token (random hex) → { username, jwt, expiresAt }
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function makeToken() {
  return randomBytes(32).toString("hex"); // cryptographically secure 64-char hex
}

function createSession(username, jwt) {
  const token = makeToken();
  sessions.set(token, {
    username,
    jwt,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function destroySession(token) {
  sessions.delete(token);
}

// Prune expired sessions every 30 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [token, s] of sessions) {
      if (now > s.expiresAt) sessions.delete(token);
    }
  },
  30 * 60 * 1000,
);

// ── Rate limiter ──────────────────────────────────────────────────────────────
// ip → { count, resetAt }
const loginAttempts = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Reboot01 helpers ──────────────────────────────────────────────────────────
async function rebootSignIn(identifier, password) {
  const res = await fetch(REBOOT_SIGNIN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${identifier}:${password}`).toString("base64")}`,
    },
  });
  if (!res.ok) {
    const status = res.status;
    const err = new Error(
      status === 401 || status === 403
        ? "Invalid credentials."
        : `Auth error ${status}.`,
    );
    err.status = status === 401 || status === 403 ? 401 : 502;
    throw err;
  }
  return (await res.text()).replace(/^"|"$/g, "");
}

async function fetchLogin(jwt) {
  const res = await fetch(REBOOT_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ query: "{ user { login } }" }),
  });
  if (!res.ok) throw new Error("Profile fetch failed.");
  const data = await res.json();
  const login = data?.data?.user?.[0]?.login ?? data?.data?.user?.login;
  if (!login) throw new Error("Could not resolve username.");
  return login;
}

// ── HTTP server (auth endpoints) ──────────────────────────────────────────────
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 4096) reject(new Error("Too large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getIp(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/login
  if (req.method === "POST" && url.pathname === "/api/login") {
    const ip = getIp(req);
    if (isRateLimited(ip)) {
      return json(res, 429, {
        error: "Too many attempts. Try again in a minute.",
      });
    }
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { error: "Invalid request." });
    }

    const identifier = String(body.identifier || "")
      .trim()
      .slice(0, 128);
    const password = String(body.password || "").slice(0, 256);
    if (!identifier || !password) {
      return json(res, 400, { error: "Username and password are required." });
    }

    try {
      const jwt = await rebootSignIn(identifier, password);
      const username = await fetchLogin(jwt);
      const token = createSession(username, jwt);
      return json(res, 200, { token, username });
    } catch (err) {
      return json(res, err.status || 502, { error: err.message });
    }
  }

  // POST /api/logout
  if (req.method === "POST" && url.pathname === "/api/logout") {
    const token = getBearerToken(req);
    if (token) destroySession(token);
    return json(res, 200, { ok: true });
  }

  // GET /api/me
  if (req.method === "GET" && url.pathname === "/api/me") {
    const token = getBearerToken(req);
    const session = getSession(token);
    if (!session) return json(res, 401, { error: "Not authenticated." });
    return json(res, 200, { username: session.username });
  }

  res.writeHead(404);
  res.end();
});

// ── WebSocket server (game) ───────────────────────────────────────────────────
let gameState = freshState();
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();
const adminSockets = new Set();
let phaseTimer = null;

function clearPhaseTimer() {
  if (phaseTimer) {
    clearTimeout(phaseTimer);
    phaseTimer = null;
  }
}

function stateForClient(state, isAdm) {
  if (isAdm) return state;
  const { impostors: _hidden, ...safe } = state;
  return { ...safe, impostors: [] };
}

function broadcast(state) {
  const adminMsg = JSON.stringify({
    type: "state",
    state: stateForClient(state, true),
  });
  const playerMsg = JSON.stringify({
    type: "state",
    state: stateForClient(state, false),
  });
  clients.forEach((c) => {
    if (c.readyState === 1) c.send(adminSockets.has(c) ? adminMsg : playerMsg);
  });
}

function startWallet(extraPatch = {}) {
  clearPhaseTimer();
  gameState = {
    ...gameState,
    ...extraPatch,
    phase: "wallet",
    phaseStartedAt: Date.now(),
  };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "wallet") startDiscuss();
  }, 80_000);
}

function startDiscuss(extraPatch = {}) {
  clearPhaseTimer();
  gameState = {
    ...gameState,
    ...extraPatch,
    phase: "discuss",
    phaseStartedAt: Date.now(),
  };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "discuss") startVote();
  }, 60_000);
}

function startVote() {
  clearPhaseTimer();
  gameState = {
    ...gameState,
    phase: "vote",
    votes: {},
    phaseStartedAt: Date.now(),
  };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "vote") {
      clearPhaseTimer();
      gameState = { ...gameState, phase: "result", phaseStartedAt: Date.now() };
      broadcast(gameState);
    }
  }, 30_000);
}

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.send(
    JSON.stringify({ type: "state", state: stateForClient(gameState, false) }),
  );
  console.log(`✅ Client connected — total: ${clients.size}`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const isAdminSocket = adminSockets.has(ws);

      switch (msg.type) {
        case "join": {
          // Validate session token — reject unauthenticated joins
          const token = String(msg.token || "").trim();
          const session = getSession(token);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", error: "auth" }));
            ws.close();
            return;
          }

          const username = session.username;

          if (username === ADMIN_USERNAME) adminSockets.add(ws);

          gameState = handleJoin(
            gameState,
            { ...msg, username },
            ws,
            broadcast,
          );
          ws.send(
            JSON.stringify({
              type: "state",
              state: stateForClient(gameState, adminSockets.has(ws)),
            }),
          );
          break;
        }

        case "leave": {
          const token = String(msg.token || "").trim();
          const session = getSession(token);
          if (!session) break;
          adminSockets.delete(ws);
          gameState = handleLeave(
            gameState,
            { ...msg, username: session.username },
            broadcast,
          );
          break;
        }

        case "vote": {
          if (gameState.phase !== "vote") break;
          const token = String(msg.token || "").trim();
          const session = getSession(token);
          if (!session) break;
          const voter = session.username;
          const target = String(msg.target || "")
            .trim()
            .slice(0, 64);
          const inLobby = gameState.lobby.some((p) => p.name === voter);
          const alreadyVoted = voter in gameState.votes;
          const validTarget = gameState.roster.some(
            (p) => p.name === target && !gameState.eliminated.includes(p.name),
          );
          if (!inLobby || alreadyVoted || !validTarget) break;
          gameState = handleVote(gameState, { voter, target }, broadcast);
          break;
        }

        case "update": {
          if (!isAdminSocket) break;
          const allowedPhases = [
            "discuss",
            "wallet",
            "story",
            "puzzle",
            "lab",
            "slidepuzzle",
          ];
          const targetPhase = msg.patch?.phase;
          if (targetPhase && !allowedPhases.includes(targetPhase)) break;
          if (targetPhase === "discuss") startDiscuss(msg.patch);
          else if (targetPhase === "wallet") startWallet(msg.patch);
          else gameState = handleUpdate(gameState, msg, broadcast);
          break;
        }

        case "startgame": {
          if (!isAdminSocket) break;
          clearPhaseTimer();
          gameState = handleStartGame(gameState, broadcast);
          break;
        }

        case "startvote": {
          if (!isAdminSocket) break;
          startVote();
          break;
        }

        case "showresult": {
          if (!isAdminSocket) break;
          clearPhaseTimer();
          gameState = handleShowResult(gameState, broadcast);
          break;
        }

        case "kick": {
          if (!isAdminSocket) break;
          const target = String(msg.target || "").trim();
          const validTarget = gameState.roster.some(
            (p) => p.name === target && !gameState.eliminated.includes(p.name),
          );
          if (!validTarget) break;
          clearPhaseTimer();
          gameState = handleKick(gameState, { target }, broadcast);
          if (gameState.phase === "wallet") {
            const walletStart = gameState.phaseStartedAt;
            phaseTimer = setTimeout(
              () => {
                if (gameState.phase === "wallet") startDiscuss();
              },
              80_000 - (Date.now() - walletStart),
            );
          }
          break;
        }

        case "reset": {
          if (!isAdminSocket) break;
          clearPhaseTimer();
          gameState = handleReset(gameState, freshState, broadcast);
          break;
        }

        default:
          console.warn(`Unknown message type: ${msg.type}`);
      }
    } catch (e) {
      console.error("Bad message:", e.message);
    }
  });

  ws.on("close", () => {
    adminSockets.delete(ws);
    clients.delete(ws);
    console.log(`❌ Client disconnected — total: ${clients.size}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n🎮 Among Us Game Server → http/ws://0.0.0.0:${PORT}\n`);
});
