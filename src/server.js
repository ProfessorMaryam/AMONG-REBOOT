// Among Us Game Server
// Run with: node src/server.js (or npm run server)

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
const ADMIN_USERNAME = "haaljafen";

let gameState = freshState();
const wss = new WebSocketServer({ port: PORT });
const clients = new Set();

// Track which WebSocket connections belong to the admin
const adminSockets = new Set();

// Server-side phase auto-advance timer
let phaseTimer = null;

function clearPhaseTimer() {
  if (phaseTimer) {
    clearTimeout(phaseTimer);
    phaseTimer = null;
  }
}

/**
 * Strip impostors from state before sending to non-admin clients.
 * Players must never see who the impostors are.
 */
function stateForClient(state, isAdmin) {
  if (isAdmin) return state;
  const { impostors: _hidden, ...safe } = state;
  return { ...safe, impostors: [] };
}

/**
 * Broadcast game state to all connected clients.
 * Admins get the full state; players get state with impostors hidden.
 */
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
    if (c.readyState === 1) {
      c.send(adminSockets.has(c) ? adminMsg : playerMsg);
    }
  });
}

/**
 * Transition to wallet phase (Round 3 pre-discuss mini-game).
 * 20s pick + 60s view = 80s total, then auto-start discuss.
 */
function startWallet(extraPatch = {}) {
  clearPhaseTimer();
  const now = Date.now();
  gameState = {
    ...gameState,
    ...extraPatch,
    phase: "wallet",
    phaseStartedAt: now,
  };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "wallet") startDiscuss();
  }, 80_000);
}

/**
 * Transition to discuss phase and schedule auto-vote after 60s
 */
function startDiscuss(extraPatch = {}) {
  clearPhaseTimer();
  const now = Date.now();
  gameState = {
    ...gameState,
    ...extraPatch,
    phase: "discuss",
    phaseStartedAt: now,
  };
  broadcast(gameState);
  phaseTimer = setTimeout(() => {
    if (gameState.phase === "discuss") startVote();
  }, 60_000);
}

/**
 * Transition to vote phase and schedule auto-result after 30s
 */
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
  // New connections are never admin until they authenticate via join
  ws.send(
    JSON.stringify({ type: "state", state: stateForClient(gameState, false) }),
  );
  console.log(`✅ Client connected — total: ${clients.size}`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const isAdminSocket = adminSockets.has(ws);

      switch (msg.type) {
        // ── Player messages (anyone logged in) ───────────────────────

        case "join": {
          const username = String(msg.username || "")
            .trim()
            .slice(0, 64);
          if (!username) break;

          // Track admin sessions by username — the only way to mark a socket as admin
          if (username === ADMIN_USERNAME) {
            adminSockets.add(ws);
          }
          gameState = handleJoin(
            gameState,
            { ...msg, username },
            ws,
            broadcast,
          );
          // Re-send personalised state so admin immediately gets full state
          ws.send(
            JSON.stringify({
              type: "state",
              state: stateForClient(gameState, adminSockets.has(ws)),
            }),
          );
          break;
        }

        case "leave": {
          const username = String(msg.username || "")
            .trim()
            .slice(0, 64);
          if (!username) break;
          adminSockets.delete(ws);
          gameState = handleLeave(gameState, { ...msg, username }, broadcast);
          break;
        }

        case "vote": {
          // Only accept votes during vote phase, and only one vote per player
          if (gameState.phase !== "vote") break;
          const voter = String(msg.voter || "")
            .trim()
            .slice(0, 64);
          const target = String(msg.target || "")
            .trim()
            .slice(0, 64);
          // Voter must be in the lobby and not have already voted
          const inLobby = gameState.lobby.some((p) => p.name === voter);
          const alreadyVoted = voter in gameState.votes;
          // Target must be an active (non-eliminated) roster member
          const validTarget = gameState.roster.some(
            (p) => p.name === target && !gameState.eliminated.includes(p.name),
          );
          if (!inLobby || alreadyVoted || !validTarget) break;
          gameState = handleVote(gameState, { voter, target }, broadcast);
          break;
        }

        // ── Admin-only messages ───────────────────────────────────────

        case "update": {
          if (!isAdminSocket) break;
          // Whitelist of allowed phase transitions only — no arbitrary patch
          const allowedPhases = ["discuss", "wallet", "story", "puzzle"];
          const targetPhase = msg.patch?.phase;
          if (targetPhase && !allowedPhases.includes(targetPhase)) break;
          if (targetPhase === "discuss") {
            startDiscuss(msg.patch);
          } else if (targetPhase === "wallet") {
            startWallet(msg.patch);
          } else {
            gameState = handleUpdate(gameState, msg, broadcast);
          }
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
          // Target must be an active roster member
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

console.log(`\n🎮 Among Us Game Server → ws://localhost:${PORT}\n`);
