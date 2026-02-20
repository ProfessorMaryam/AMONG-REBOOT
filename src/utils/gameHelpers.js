// Game constants and helper functions

export const WS_URL = "ws://localhost:4000";

export const DEFAULT_GAME_STATE = {
  lobby: [],
  roster: [],
  impostors: [],
  phase: "lobby",
  round: 0,
  eliminated: [],
  votes: {},
  gameOver: null,
};

export const AVATARS = ["🧑‍🚀", "👩‍🚀", "🧑‍🔬", "👩‍🔬", "🧑‍💻", "👨‍🎤", "👩‍🎤", "🧛", "🧟", "🕵️"];

/**
 * Get avatar emoji for a player based on their name
 * @param {string} name - Player name
 * @returns {string} Avatar emoji
 */
export function getAvatar(name) {
  return AVATARS[(name || "?").charCodeAt(0) % AVATARS.length];
}

/**
 * Tally votes and determine the top voted player
 * @param {Object} votes - Votes object {voter: target}
 * @returns {{counts: Object, top: string|null}} Vote counts and top voted player
 */
export function tallyVotes(votes) {
  const counts = {};
  Object.values(votes).forEach(v => {
    counts[v] = (counts[v] || 0) + 1;
  });
  
  let max = 0;
  let top = null;
  Object.entries(counts).forEach(([p, c]) => {
    if (c > max) {
      max = c;
      top = p;
    }
  });
  
  return { counts, top };
}

