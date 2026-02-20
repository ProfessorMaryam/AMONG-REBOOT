// Among Us Game Server
// Run with: npm run server (or npm run dev to run both client and server)

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
// Note: handleStartVote is no longer used — server manages vote phase via startVote()

const PORT = 4000;

let gameState = freshState();
const wss = new WebSocketServer({ port: PORT });
const clients = new Set();

// Server-side phase auto-advance timer
let phaseTimer = null;

function clearPhaseTimer() {
  if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
}

/**
 * Broadcast game state to all connected clients
 */
function broadcast(state) {
  const msg = JSON.stringify({ type: "state", state });
  clients.forEach((c) => { if (c.readyState === 1) c.send(msg); });
}

/**
 * Transition to discuss phase and schedule auto-vote after 60s
 */
function startDiscuss(extraPatch = {}) {
  clearPhaseTimer();
  const now = Date.now();
  gameState = { ...gameState, ...extraPatch, phase: "discuss", phaseStartedAt: now };
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
  gameState = { ...gameState, phase: "vote", votes: {}, phaseStartedAt: Date.now() };
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
  ws.send(JSON.stringify({ type: "state", state: gameState }));
  console.log(`✅ Client connected — total: ${clients.size}`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "join":
          gameState = handleJoin(gameState, msg, ws, broadcast);
          break;

        case "leave":
          gameState = handleLeave(gameState, msg, broadcast);
          break;

        case "update":
          // Used for story→discuss and puzzle→discuss
          if (msg.patch.phase === "discuss") {
            startDiscuss(msg.patch);
          } else {
            gameState = handleUpdate(gameState, msg, broadcast);
          }
          break;

        case "startgame":
          clearPhaseTimer();
          gameState = handleStartGame(gameState, broadcast);
          break;

        case "startvote":
          // Manual admin override
          startVote();
          break;

        case "vote":
          // Only record vote if voting phase is still open
          if (gameState.phase === "vote") {
            gameState = handleVote(gameState, msg, broadcast);
          }
          break;

        case "showresult":
          clearPhaseTimer();
          gameState = handleShowResult(gameState, broadcast);
          break;

        case "kick":
          clearPhaseTimer();
          gameState = handleKick(gameState, msg, broadcast);
          // handleKick now sets phase to "puzzle" (not discuss)
          break;

        case "reset":
          clearPhaseTimer();
          gameState = handleReset(gameState, freshState, broadcast);
          break;

        // case "chat": {
        //   const chatOut = JSON.stringify({
        //     type: "chat",
        //     username: msg.username,
        //     text: msg.text,
        //     time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        //   });
        //   clients.forEach(c => { if (c.readyState === 1) c.send(chatOut); });
        //   break;
        // }

        default:
          console.warn(`Unknown message type: ${msg.type}`);
      }
    } catch (e) {
      console.error("Bad message:", e.message);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`❌ Client disconnected — total: ${clients.size}`);
  });
});

console.log(`\n🎮 Among Us Game Server → ws://localhost:${PORT}\n`);
