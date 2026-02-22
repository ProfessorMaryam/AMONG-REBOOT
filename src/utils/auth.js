// Authentication utilities
export const SIGNIN_URL = "https://learn.reboot01.com/api/auth/signin";
export const GRAPHQL_URL =
  "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
export const ADMIN_USERNAME = "haaljafen";
// TEST_USERS still authenticate via the real API — no password bypass
export const TEST_USERS = ["sbucheer", "mkhattar", "yalsari"];

/**
 * Parse JWT token and extract payload
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
 * Execute GraphQL query with JWT token
 */
export async function gql(query, variables = {}) {
  const token = sessionStorage.getItem("jwt");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const data = await res.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message || "GraphQL query error");
  }

  return data.data;
}

/**
 * Fetch user data using GraphQL
 */
export async function fetchUserData() {
  const query = `{
    user {
      auditsAssigned
      createdAt
      email
      firstName
      id
      lastName
      login
      totalUpBonus
      updatedAt
      attrs
      events {
        createdAt
        eventId
        id
        level
        userAuditRatio
        userId
        userLogin
        userName
      }
    }
  }`;

  return await gql(query);
}

/**
 * Authenticate user with Reboot01 API.
 * Everyone — including admin and test users — goes through the real API.
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
        error:
          res.status === 401 || res.status === 403
            ? "Invalid credentials."
            : `Error ${res.status}.`,
      };
    }

    let token = (await res.text()).replace(/^"|"$/g, "");
    sessionStorage.setItem("jwt", token);

    // Fetch user data via GraphQL to get the correct username
    try {
      const userData = await fetchUserData();
      const graphqlUsername = userData?.user?.login;

      if (graphqlUsername) {
        console.log("Logged in as:", graphqlUsername);
        return { success: true, username: graphqlUsername };
      }
    } catch (err) {
      console.warn("Failed to fetch user data via GraphQL:", err);
    }

    // Fallback to JWT payload if GraphQL fails
    const payload = parseJWT(token);
    const extractedUsername =
      payload?.login || payload?.name || payload?.sub || username;

    return { success: true, username: extractedUsername };
  } catch {
    return { success: false, error: "Network error — check your connection." };
  }
}

/**
 * Check if user is admin (server-side only — never trust the client)
 */
export function isAdmin(username) {
  return username === ADMIN_USERNAME;
}

/**
 * Check if user is a test user
 */
export function isTestUser(username) {
  return TEST_USERS.includes(username);
}
