// Authentication utilities
// All auth goes through our own server — the Reboot01 JWT never touches the browser.

export const ADMIN_USERNAME = "haaljafen";

const API_BASE = `http://${window.location.hostname}:4000`;

/**
 * Sign in via our server's /api/login endpoint.
 * Returns { success, username, token } or { success: false, error }.
 */
export async function authenticateUser(identifier, password) {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || `Error ${res.status}.` };
    }

    // Store session token — not the raw JWT
    sessionStorage.setItem("session-token", data.token);
    return { success: true, username: data.username, token: data.token };
  } catch {
    return { success: false, error: "Network error — check your connection." };
  }
}

/**
 * Restore session from stored token via /api/me.
 * Returns { username } or null if token is missing/expired.
 */
export async function restoreSession() {
  const token = sessionStorage.getItem("session-token");
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { sessionStorage.removeItem("session-token"); return null; }
    return await res.json(); // { username }
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

/**
 * Check if username is admin.
 */
export function isAdmin(username) {
  return username === ADMIN_USERNAME;
}
