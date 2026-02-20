// Game state management

export const RTC_ROSTER = [
  { name: "Hajar" },
  { name: "Sara" },
  { name: "Maryam" },
  { name: "Mohammad" },
  { name: "Nooh" },
  { name: "Yousif" },
];

/**
 * Create a fresh game state
 * @returns {Object} Initial game state
 */
export function freshState() {
  return {
    // logged-in players (viewers/voters)
    lobby: [],
    // the fixed RTC roster for voting
    roster: RTC_ROSTER.map((p) => ({ ...p })),
    impostors: ["Hajar", "Sara"],
    phase: "lobby", // lobby | story | discuss | puzzle | vote | result | gameover
    round: 0,
    eliminated: [],
    votes: {},
    gameOver: null, // null | "innocents" | "impostors"
    phaseStartedAt: Date.now(),
  };
}

/**
 * Assign random impostors from active roster
 * @param {Object} gameState - Current game state
 * @returns {Array<string>} Array of impostor names
 */
export function assignImpostors(_gameState) {
  return ["Sara", "Hajar"];
}

/**
 * Check if game is over and determine winner
 * @param {Object} gameState - Current game state
 * @returns {string|null} "innocents", "impostors", or null
 */
export function checkGameOver(gameState) {
  const active = gameState.roster.filter(
    (p) => !gameState.eliminated.includes(p.name),
  );
  const impostorsLeft = gameState.impostors.filter(
    (i) => !gameState.eliminated.includes(i),
  );
  const innocentsLeft = active.filter(
    (p) => !gameState.impostors.includes(p.name),
  );

  // Innocents win if BOTH impostors are eliminated
  if (impostorsLeft.length === 0) return "innocents";

  // Impostors win if they equal or outnumber the innocents
  if (impostorsLeft.length >= innocentsLeft.length) return "impostors";

  // Game continues if at least one impostor remains and innocents still outnumber them
  return null;
}
