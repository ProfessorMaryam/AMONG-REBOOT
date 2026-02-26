// Among Us Game Server
// Run with: node server/index.js (or npm run server)

import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { freshState } from "./gameState.js";
import {
  handleJoin,
  handleLeave,
  handleUpdate,
  handleStartGame,
  handleVote,
  handleShowResult,
  handleKick,
  handleReset,
} from "./messageHandlers.js";

// ── Load .env manually (no extra dependency needed) ───────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, "../.env");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env not found — rely on environment variables already set (fine in production)
}

const PORT           = Number(process.env.PORT) || 3001;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "haaljafen";
const REBOOT_SIGNIN  = process.env.REBOOT_SIGNIN  || "https://learn.reboot01.com/api/auth/signin";
const REBOOT_GQL     = process.env.REBOOT_GQL     || "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
// Impostor names — set via env: IMPOSTORS=Hajar,Yousif
const IMPOSTORS = (process.env.IMPOSTORS || "Hajar,Yousif")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// TLS — set both to enable HTTPS/WSS: TLS_CERT=/path/cert.pem TLS_KEY=/path/key.pem
const TLS_CERT = process.env.TLS_CERT || null;
const TLS_KEY  = process.env.TLS_KEY  || null;
const USE_TLS  = !!(TLS_CERT && TLS_KEY);
// Admin PIN — must be sent alongside Reboot01 credentials to get admin access
// Set via: ADMIN_SECRET=your-secret-pin
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// ── Test accounts (dev only) ───────────────────────────────────────────────────
// NEVER active in production — NODE_ENV=production removes them completely
const TEST_ACCOUNTS = process.env.NODE_ENV !== "production"
  ? { testuser: "test123" }
  : {};

// ── Audit logging ──────────────────────────────────────────────────────────────
function audit(action, details = {}) {
  console.log(`[AUDIT] ${new Date().toISOString()} ${action} ${JSON.stringify(details)}`);
}

// ── Origin validation (CSRF protection for HTTP + WS) ─────────────────────────
function isOriginAllowed(origin) {
  if (ALLOWED_ORIGIN === "*") return true;
  return origin === ALLOWED_ORIGIN;
}

// ── Session store ─────────────────────────────────────────────────────────────
// token → { username, jwt, isAdmin, ip, expiresAt }
const sessions    = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function makeToken() {
  return randomBytes(32).toString("hex"); // 64-char CSPRNG hex
}

function createSession(username, jwt, ip) {
  const token = makeToken();
  sessions.set(token, {
    username,
    jwt,
    isAdmin: username === ADMIN_USERNAME,
    ip:      ip || null,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSession(token, ip) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  // IP binding — reject if the request comes from a different IP than where the
  // session was created. Mitigates stolen-token attacks across machines.
  if (ip && s.ip && ip !== s.ip) {
    audit("SESSION_IP_MISMATCH", { username: s.username, sessionIp: s.ip, requestIp: ip });
    return null;
  }
  return s;
}

// Rotate: invalidate the old token and issue a fresh one with the same identity
function rotateSession(oldToken, ip) {
  const s = sessions.get(oldToken);
  if (!s) return null;
  sessions.delete(oldToken);
  return createSession(s.username, s.jwt, ip);
}

function destroySession(token) {
  sessions.delete(token);
}

// Prune expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}, 30 * 60 * 1000);

// ── HTTP login rate limiter ────────────────────────────────────────────────────
const loginAttempts = new Map();
const RATE_LIMIT     = 5;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── WebSocket per-connection rate limiter ──────────────────────────────────────
// Each connection gets its own closure: 30 messages per 10 seconds
const WS_RATE_MAX    = 30;
const WS_RATE_WINDOW = 10_000;

function makeWsLimiter() {
  let count     = 0;
  let windowEnd = Date.now() + WS_RATE_WINDOW;
  return function isLimited() {
    const now = Date.now();
    if (now > windowEnd) { count = 0; windowEnd = now + WS_RATE_WINDOW; }
    if (count >= WS_RATE_MAX) return true;
    count++;
    return false;
  };
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
      status === 401 || status === 403 ? "Invalid credentials." : `Auth error ${status}.`,
    );
    err.status = status === 401 || status === 403 ? 401 : 502;
    throw err;
  }
  return (await res.text()).replace(/^"|"$/g, "");
}

async function fetchLogin(jwt) {
  const res = await fetch(REBOOT_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ query: "{ user { login } }" }),
  });
  if (!res.ok) throw new Error("Profile fetch failed.");
  const data  = await res.json();
  const login = data?.data?.user?.[0]?.login ?? data?.data?.user?.login;
  if (!login) throw new Error("Could not resolve username.");
  return login;
}

// ── HTTP server (auth endpoints) ──────────────────────────────────────────────
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res, status, body) {
  setCorsHeaders(res);
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
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function getIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const ip  = getIp(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // CSRF protection: validate Origin + Content-Type on every POST
  if (req.method === "POST") {
    const origin = req.headers.origin || "";
    if (!isOriginAllowed(origin)) {
      audit("CSRF_BLOCKED", { ip, origin, path: url.pathname });
      return json(res, 403, { error: "Forbidden." });
    }
    if (!req.headers["content-type"]?.startsWith("application/json")) {
      return json(res, 400, { error: "Invalid content type." });
    }
  }

  // POST /api/login
  if (req.method === "POST" && url.pathname === "/api/login") {
    if (isRateLimited(ip)) {
      return json(res, 429, { error: "Too many attempts. Try again in a minute." });
    }
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { error: "Invalid request." });
    }

    const identifier = String(body.identifier || "").trim().slice(0, 128);
    const password   = String(body.password   || "").slice(0, 256);
    if (!identifier || !password) {
      return json(res, 400, { error: "Username and password are required." });
    }

    // Admin requires an additional secret PIN alongside their Reboot01 credentials
    if (identifier === ADMIN_USERNAME) {
      const adminPin = String(body.adminSecret || "").trim();
      if (!ADMIN_SECRET || adminPin !== ADMIN_SECRET) {
        audit("ADMIN_LOGIN_REJECTED", { identifier, ip });
        return json(res, 401, { error: "Invalid credentials." });
      }
    }

    // Test account shortcut — dev only, never hits Reboot01
    if (TEST_ACCOUNTS[identifier] !== undefined) {
      if (TEST_ACCOUNTS[identifier] !== password) {
        return json(res, 401, { error: "Invalid credentials." });
      }
      const isAdmin = identifier === ADMIN_USERNAME;
      const token = createSession(identifier, null, ip);
      audit("LOGIN_TEST", { username: identifier, ip });
      return json(res, 200, { token, username: identifier, isAdmin });
    }

    try {
      const jwt      = await rebootSignIn(identifier, password);
      const username = await fetchLogin(jwt);
      const isAdmin  = username === ADMIN_USERNAME;
      const token    = createSession(username, jwt, ip);
      audit("LOGIN", { username, ip });
      return json(res, 200, { token, username, isAdmin });
    } catch (err) {
      audit("LOGIN_FAILED", { identifier, ip, error: err.message });
      return json(res, err.status || 502, { error: err.message });
    }
  }

  // POST /api/logout
  if (req.method === "POST" && url.pathname === "/api/logout") {
    const oldToken = getBearerToken(req);
    const session  = getSession(oldToken, ip);
    if (oldToken) destroySession(oldToken);
    audit("LOGOUT", { username: session?.username, ip });
    return json(res, 200, { ok: true });
  }

  // GET /api/me — validates session and rotates token
  if (req.method === "GET" && url.pathname === "/api/me") {
    const oldToken = getBearerToken(req);
    const session  = getSession(oldToken, ip);
    if (!session) return json(res, 401, { error: "Not authenticated." });
    const newToken = rotateSession(oldToken, ip);
    return json(res, 200, {
      username: session.username,
      isAdmin:  session.isAdmin,
      token:    newToken,
    });
  }

  res.writeHead(404);
  res.end();
}

// ── HTTP/HTTPS + WebSocket server ─────────────────────────────────────────────
const tlsOptions = USE_TLS
  ? { cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) }
  : null;
const httpServer = USE_TLS
  ? createHttpsServer(tlsOptions, requestHandler)
  : createHttpServer(requestHandler);

let gameState    = freshState(IMPOSTORS);
const wss          = new WebSocketServer({ server: httpServer });
const clients      = new Set();
const adminSockets = new Set();
// username → WebSocket — for per-player private messages (e.g. vote nonces)
const playerSockets = new Map();
// username → one-time hex nonce — issued at vote start, consumed on use
const voteNonces = new Map();
let phaseTimer = null;

function clearPhaseTimer() {
  if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
}

function stateForClient(state, isAdm) {
  if (isAdm || state.phase === "gameover") return state;
  const { impostors: _hidden, ...safe } = state;
  return { ...safe, impostors: [] };
}

function broadcast(state) {
  const adminMsg  = JSON.stringify({ type: "state", state: stateForClient(state, true) });
  const playerMsg = JSON.stringify({ type: "state", state: stateForClient(state, false) });
  clients.forEach((c) => {
    if (c.readyState === 1) c.send(adminSockets.has(c) ? adminMsg : playerMsg);
  });
}

function startWallet(extraPatch = {}) {
  clearPhaseTimer();
  gameState = { ...gameState, ...extraPatch, phase: "wallet", phaseStartedAt: Date.now() };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "wallet") startDiscuss();
  }, 80_000);
}

function startDiscuss(extraPatch = {}) {
  clearPhaseTimer();
  gameState = { ...gameState, ...extraPatch, phase: "discuss", phaseStartedAt: Date.now() };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "discuss") startVote();
  }, 60_000);
}

function issueVoteNonce(username) {
  const nonce = randomBytes(16).toString("hex");
  voteNonces.set(username, nonce);
  const sock = playerSockets.get(username);
  if (sock?.readyState === 1) sock.send(JSON.stringify({ type: "voteNonce", nonce }));
}

function startVote() {
  clearPhaseTimer();
  voteNonces.clear(); // invalidate any nonces from a previous round
  gameState = { ...gameState, phase: "vote", votes: {}, phaseStartedAt: Date.now() };
  broadcast(gameState);
  // Issue a one-time nonce to every player currently in the lobby
  gameState.lobby.forEach(({ name }) => issueVoteNonce(name));
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "vote") {
      clearPhaseTimer();
      gameState = { ...gameState, phase: "result", phaseStartedAt: Date.now() };
      broadcast(gameState);
    }
  }, 30_000);
}

wss.on("connection", (ws, req) => {
  const connIp = getIp(req);

  // Reject connections from disallowed origins (CSRF guard for WS upgrade)
  const origin = req.headers.origin || "";
  if (!isOriginAllowed(origin)) {
    audit("WS_ORIGIN_BLOCKED", { ip: connIp, origin });
    ws.close(1008, "Forbidden origin");
    return;
  }

  ws._connIp = connIp;
  const wsIsRateLimited = makeWsLimiter();

  clients.add(ws);
  ws.send(JSON.stringify({ type: "state", state: stateForClient(gameState, false) }));
  console.log(`✅ Client connected [${connIp}] — total: ${clients.size}`);

  ws.on("message", (raw) => {
    // Message size guard — closes the socket on oversized payloads
    if (raw.length > 4096) {
      ws.close(1009, "Message too large");
      return;
    }

    // Per-connection rate limit — 30 messages per 10 s
    if (wsIsRateLimited()) {
      audit("WS_RATE_LIMITED", { ip: ws._connIp, username: ws._username });
      ws.send(JSON.stringify({ type: "error", error: "rate_limited" }));
      return;
    }

    try {
      const msg           = JSON.parse(raw.toString());
      const isAdminSocket = adminSockets.has(ws);

      switch (msg.type) {
        case "join": {
          const token   = String(msg.token || "").trim();
          const session = getSession(token, ws._connIp);
          if (!session) {
            audit("WS_AUTH_FAILED", { ip: ws._connIp });
            ws.send(JSON.stringify({ type: "error", error: "auth" }));
            ws.close();
            return;
          }

          const username    = session.username;   // always from session — never trusted from client
          const isAdminUser = session.isAdmin === true;

          if (isAdminUser) adminSockets.add(ws);

          if (!isAdminUser) {
            ws._username = username;
            playerSockets.set(username, ws);
          }

          // Pass only server-validated fields to the handler
          gameState = handleJoin(gameState, { username }, ws, broadcast, isAdminUser);
          ws.send(JSON.stringify({
            type:  "state",
            state: stateForClient(gameState, adminSockets.has(ws)),
          }));

          audit("WS_JOIN", { username, isAdmin: isAdminUser, ip: ws._connIp });

          // On reconnect during vote: issue a fresh nonce if player hasn't voted yet
          if (!isAdminUser && gameState.phase === "vote") {
            if (!(username in gameState.votes)) issueVoteNonce(username);
          }
          break;
        }

        case "leave": {
          const token   = String(msg.token || "").trim();
          const session = getSession(token, ws._connIp);
          if (!session) break;
          const username = session.username;
          adminSockets.delete(ws);
          gameState = handleLeave(gameState, { username }, broadcast);
          audit("WS_LEAVE", { username, ip: ws._connIp });
          break;
        }

        case "vote": {
          if (gameState.phase !== "vote") break;
          const token   = String(msg.token || "").trim();
          const session = getSession(token, ws._connIp);
          if (!session) break;
          const voter  = session.username;
          const target = String(msg.target || "").trim().slice(0, 64);
          const nonce  = String(msg.nonce  || "").trim();

          // Validate one-time nonce — must match what the server issued this player
          const expectedNonce = voteNonces.get(voter);
          if (!nonce || !expectedNonce || nonce !== expectedNonce) {
            audit("VOTE_INVALID_NONCE", { voter, ip: ws._connIp });
            ws.send(JSON.stringify({ type: "error", error: "invalid_vote" }));
            break;
          }

          const inLobby      = gameState.lobby.some((p) => p.name === voter);
          const alreadyVoted = voter in gameState.votes;
          const validTarget  = gameState.roster.some(
            (p) => p.name === target && !gameState.eliminated.includes(p.name),
          );
          if (!inLobby || alreadyVoted || !validTarget) break;

          voteNonces.delete(voter); // consume — nonce is single-use
          gameState = handleVote(gameState, { voter, target }, broadcast);
          audit("VOTE", { voter, target, ip: ws._connIp });
          break;
        }

        case "update": {
          if (!isAdminSocket) break;
          const allowedPhases = ["discuss", "wallet", "story", "puzzle", "lab", "slidepuzzle"];
          const targetPhase   = msg.patch?.phase;
          if (targetPhase && !allowedPhases.includes(targetPhase)) break;
          if (targetPhase === "discuss")     startDiscuss(msg.patch);
          else if (targetPhase === "wallet") startWallet(msg.patch);
          else                               gameState = handleUpdate(gameState, msg, broadcast);
          audit("ADMIN_UPDATE", { phase: targetPhase, ip: ws._connIp });
          break;
        }

        case "startgame": {
          if (!isAdminSocket) break;
          clearPhaseTimer();
          gameState = handleStartGame(gameState, broadcast);
          audit("ADMIN_STARTGAME", { ip: ws._connIp });
          break;
        }

        case "startvote": {
          if (!isAdminSocket) break;
          startVote();
          audit("ADMIN_STARTVOTE", { ip: ws._connIp });
          break;
        }

        case "showresult": {
          if (!isAdminSocket) break;
          clearPhaseTimer();
          gameState = handleShowResult(gameState, broadcast);
          audit("ADMIN_SHOWRESULT", { ip: ws._connIp });
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
          audit("ADMIN_KICK", { target, ip: ws._connIp });
          if (gameState.phase === "wallet") {
            const walletStart = gameState.phaseStartedAt;
            phaseTimer = setTimeout(() => {
              if (gameState.phase === "wallet") startDiscuss();
            }, 80_000 - (Date.now() - walletStart));
          }
          break;
        }

        case "reset": {
          if (!isAdminSocket) break;
          clearPhaseTimer();
          voteNonces.clear();
          gameState = handleReset(gameState, () => freshState(IMPOSTORS), broadcast);
          audit("ADMIN_RESET", { ip: ws._connIp });
          break;
        }

        default:
          // Silently drop unknown message types (don't leak what types are valid)
          break;
      }
    } catch (e) {
      console.error("Bad WS message:", e.message);
    }
  });

  ws.on("close", () => {
    adminSockets.delete(ws);
    clients.delete(ws);
    // Only remove from playerSockets if this ws is still the current one for that user
    if (ws._username && playerSockets.get(ws._username) === ws) {
      playerSockets.delete(ws._username);
    }
    console.log(`❌ Client disconnected [${ws._connIp || "?"}] — total: ${clients.size}`);
  });
});

httpServer.listen(PORT, () => {
  const proto = USE_TLS ? "https/wss" : "http/ws";
  console.log(`\n🎮 Among Us Game Server → ${proto}://0.0.0.0:${PORT}`);
  console.log(`   Admin: ${ADMIN_USERNAME}`);
  console.log(`   TLS:   ${USE_TLS ? "enabled" : "disabled"}`);
  console.log(`   Mode:  ${process.env.NODE_ENV || "development"}`);
  if (!ADMIN_SECRET) {
    console.warn(`\n⚠️  ADMIN_SECRET not set — admin login has no PIN protection!`);
  }
  if (Object.keys(TEST_ACCOUNTS).length > 0) {
    console.warn(`⚠️  Test accounts active — do NOT run in production!\n`);
  } else {
    console.log();
  }
});
