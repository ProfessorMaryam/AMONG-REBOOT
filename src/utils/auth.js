// Authentication utilities
// All auth goes through our own server — the Reboot01 JWT never touches the browser.
// The server is always the source of truth for admin status.

// In dev, Vite proxies /api → http://localhost:3001.
// In production, a reverse proxy forwards /api to the backend.
const API_BASE = "";

/**
 * Sign in via our server's /api/login endpoint.
 * Returns { success, username, isAdmin, token } or { success: false, error }.
 */
export async function authenticateUser(identifier, password, adminSecret = "") {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, adminSecret }),
    });
  } catch {
    return { success: false, error: "Cannot reach server — check your connection." };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { success: false, error: `Server error ${res.status}.` };
  }

  if (!res.ok) {
    return { success: false, error: data.error || `Error ${res.status}.` };
  }

  // Store session token — not the raw JWT
  sessionStorage.setItem("session-token", data.token);
  return { success: true, username: data.username, isAdmin: data.isAdmin, token: data.token };
}

/**
 * Restore session from stored token via /api/me.
 * Returns { username, isAdmin } or null if token is missing/expired.
 */
export async function restoreSession() {
  const token = sessionStorage.getItem("session-token");
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { sessionStorage.removeItem("session-token"); return null; }
    const data = await res.json(); // { username, isAdmin, token }
    // Server rotates the token on every /api/me call — store the new one
    if (data.token) sessionStorage.setItem("session-token", data.token);
    return data;
  } catch {
    return null;
  }
}

/**
 * Sign out — invalidate session on the server and clear local storage.
 */
export async function signOut() {
  const token = sessionStorage.getItem("session-token");
  sessionStorage.removeItem("session-token");
  localStorage.removeItem("among-us:user");
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* best-effort */ }
}

/**
 * Get the stored session token.
 */
export function getSessionToken() {
  return sessionStorage.getItem("session-token") || null;
}
