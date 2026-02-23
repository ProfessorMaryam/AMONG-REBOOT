// WebSocket message handlers
import { assignImpostors, checkGameOver } from "./gameState.js";

/**
 * Handle join message
 */
const ADMIN_USERNAME = "haaljafen";

export function handleJoin(gameState, msg, ws, broadcast) {
  const { username } = msg;
  console.log(`✅ ${username} attempting to join`);
  // Admin connects for control only — never appears in the player lobby
  if (username === ADMIN_USERNAME) {
    ws.send(JSON.stringify({ type: "state", state: gameState }));
    return gameState;
  }
  if (!gameState.lobby.find((p) => p.name === username)) {
    console.log(`  ➕ Adding ${username} to lobby`);
    gameState = {
      ...gameState,
      lobby: [...gameState.lobby, { name: username }],
    };
    broadcast(gameState);
  } else {
    console.log(`  ↩️  ${username} reconnecting (already in lobby)`);
    // Just send current state - don't broadcast
    ws.send(JSON.stringify({ type: "state", state: gameState }));
  }
  return gameState;
}

/**
 * Handle leave message
 */
export function handleLeave(gameState, msg, broadcast) {
  const { username } = msg;
  gameState = {
    ...gameState,
    lobby: gameState.lobby.filter((p) => p.name !== username),
  };
  broadcast(gameState);
  return gameState;
}

/**
 * Handle update message
 */
export function handleUpdate(gameState, msg, broadcast) {
  // If phase is changing, update phaseStartedAt
  const patch =
    msg.patch.phase && msg.patch.phase !== gameState.phase
      ? { ...msg.patch, phaseStartedAt: Date.now() }
      : msg.patch;

  gameState = { ...gameState, ...patch };
  broadcast(gameState);
  return gameState;
}

/**
 * Handle start game message
 */
export function handleStartGame(gameState, broadcast) {
  const impostors = assignImpostors(gameState);
  gameState = {
    ...gameState,
    impostors,
    phase: "story",
    round: 1,
    eliminated: [],
    votes: {},
    gameOver: null,
    phaseStartedAt: Date.now(),
  };
  broadcast(gameState);
  return gameState;
}

/**
 * Handle start vote message
 */
export function handleStartVote(gameState, broadcast) {
  gameState = {
    ...gameState,
    phase: "vote",
    votes: {},
    phaseStartedAt: Date.now(),
  };
  broadcast(gameState);
  return gameState;
}

/**
 * Handle vote message
 */
export function handleVote(gameState, msg, broadcast) {
  const { voter, target } = msg;
  gameState = { ...gameState, votes: { ...gameState.votes, [voter]: target } };
  broadcast(gameState);
  return gameState;
}

/**
 * Handle show result message
 */
export function handleShowResult(gameState, broadcast) {
  gameState = { ...gameState, phase: "result", phaseStartedAt: Date.now() };
  broadcast(gameState);
  return gameState;
}

/**
 * Handle kick message
 */
export function handleKick(gameState, msg, broadcast) {
  const { target } = msg;
  const eliminated = [...gameState.eliminated, target];
  gameState = { ...gameState, eliminated };

  const gameOver = checkGameOver(gameState);
  if (gameOver) {
    gameState = {
      ...gameState,
      phase: "gameover",
      gameOver,
      phaseStartedAt: Date.now(),
    };
  } else {
    const nextRound = gameState.round + 1;
    // Round mapping:
    // - Round 2 => SQL puzzle
    // - Round 3 => Wallet mini-game
    // - Round 4 => Lab analysis
    // - Other rounds default to puzzle
    const nextPhase =
      nextRound === 2 ? "puzzle" : nextRound === 3 ? "wallet" : nextRound === 4 ? "lab" : "puzzle";
    gameState = {
      ...gameState,
      phase: nextPhase,
      round: nextRound,
      votes: {},
      phaseStartedAt: Date.now(),
    };
  }

  broadcast(gameState);
  return gameState;
}

/**
 * Handle reset message
 */
export function handleReset(gameState, freshState, broadcast) {
  gameState = freshState();
  broadcast(gameState);
  return gameState;
}
