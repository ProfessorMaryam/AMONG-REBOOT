// Game constants and helper functions

// WS connects back to the same host/port the page was served from.
// In dev, Vite proxies /ws → the backend. In production, a reverse proxy does the same.
export const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

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

export const AVATARS = {
  Hajar:    new URL("../assets/Avatars/hajarAmong.png",       import.meta.url).href,
  Sara:     new URL("../assets/Avatars/SaraAmongUs.png",      import.meta.url).href,
  Maryam:   new URL("../assets/Avatars/Maryam amongUS.png",   import.meta.url).href,
  Mohammad: new URL("../assets/Avatars/MohamedAmongus.jpeg",  import.meta.url).href,
  Yousif:   new URL("../assets/Avatars/YousifAmongus.jpeg",   import.meta.url).href,
  Nooh:     new URL("../assets/Avatars/noohAmongus.png",      import.meta.url).href,
};

/**
 * Get avatar image URL for a player based on their name
 * @param {string} name - Player name
 * @returns {string|null} Avatar image URL or null if not found
 */
export function getAvatar(name) {
  return AVATARS[name] ?? null;
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

