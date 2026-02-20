// Authentication utilities
export const SIGNIN_URL = "https://learn.reboot01.com/api/auth/signin";
export const ADMIN_USERNAME = "haaljafen";
export const TEST_USERS = ["sbucheer", "mkhattar", "yalsari"];

/**
 * Parse JWT token and extract payload
 * @param {string} token - JWT token
 * @returns {object|null} Parsed payload or null if invalid
 */
export function parseJWT(token) {
  try {
    const b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b));
  } catch {
    return null;
  }
}

/**
 * Authenticate user with Reboot01 API
 * @param {string} username - Username or email
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, username?: string, error?: string}>}
 */
export async function authenticateUser(username, password) {
  try {
    const res = await fetch(SIGNIN_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` },
    });

    if (!res.ok) {
      return {
        success: false,
        error: res.status === 401 || res.status === 403 
          ? "Invalid credentials." 
          : `Error ${res.status}.`
      };
    }

    let token = (await res.text()).replace(/^"|"$/g, "");
    const payload = parseJWT(token);
    const extractedUsername = payload?.login || payload?.name || payload?.sub || username;
    
    sessionStorage.setItem("jwt", token);
    
    return {
      success: true,
      username: extractedUsername
    };
  } catch {
    return {
      success: false,
      error: "Network error — check your connection."
    };
  }
}

/**
 * Check if user is admin
 * @param {string} username - Username to check
 * @returns {boolean}
 */
export function isAdmin(username) {
  return username === ADMIN_USERNAME;
}

/**
 * Check if user is a test user
 * @param {string} username - Username to check
 * @returns {boolean}
 */
export function isTestUser(username) {
  return TEST_USERS.includes(username);
}

