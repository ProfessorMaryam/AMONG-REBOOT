import { useState } from "react";
import { ADMIN_USERNAME, TEST_USERS, authenticateUser, isAdmin, isTestUser } from "../utils/auth";

/**
 * Login screen component
 * @param {Function} onLogin - Callback when user successfully logs in
 */
export function LoginScreen({ onLogin }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoad] = useState(false);

  async function handleLogin() {
    const name = id.trim();
    if (!name) {
      setErr("Please enter your username or email.");
      return;
    }

    // Admin login
    if (isAdmin(name)) {
      onLogin(ADMIN_USERNAME, true);
      return;
    }

    // Test user login
    if (isTestUser(name)) {
      onLogin(name, false);
      return;
    }

    // Regular user login
    if (!pw) {
      setErr("Please enter your password.");
      return;
    }

    setLoad(true);
    setErr("");

    const result = await authenticateUser(name, pw);

    if (result.success) {
      onLogin(result.username, false);
    } else {
      setErr(result.error);
    }

    setLoad(false);
  }

  return (
    <div className="login-box">
      <div className="login-logo">AMONG US</div>
      <div className="login-sub">Educational Edition</div>
      <div className="field">
        <label>Username or Email</label>
        <input
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder="username or email"
          disabled={loading}
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="leave blank for test users"
          disabled={loading}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
      </div>
      {err && <div className="error">{err}</div>}
      <button
        className="btn"
        style={{ marginTop: 20 }}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Enter"}
      </button>
    </div>
  );
}

