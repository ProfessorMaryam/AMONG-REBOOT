import { useState } from "react";
import { authenticateUser, isAdmin, isTestUser, ADMIN_USERNAME } from "../utils/auth";

/**
 * Login screen.
 * Admin and test users bypass the API for easy local testing.
 * Regular users authenticate via the real Reboot01 API.
 */
export function LoginScreen({ onLogin }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoad] = useState(false);

  async function handleLogin() {
    const name = id.trim();
    if (!name) { setErr("Please enter your username or email."); return; }

    // Admin bypass — no password needed for local testing
    if (isAdmin(name)) {
      onLogin(ADMIN_USERNAME, true);
      return;
    }

    // Test user bypass — no password needed for local testing
    if (isTestUser(name)) {
      onLogin(name, false);
      return;
    }

    // Regular users must authenticate via the real API
    if (!pw) { setErr("Please enter your password."); return; }

    setLoad(true);
    setErr("");

    const result = await authenticateUser(name, pw);

    if (result.success) {
      onLogin(result.username, isAdmin(result.username));
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
