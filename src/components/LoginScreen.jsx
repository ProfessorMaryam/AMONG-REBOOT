import { useState } from "react";
import { authenticateUser } from "../utils/auth";

/**
 * Login screen — authenticates via our own server, which validates against
 * the Reboot01 API. The raw JWT never touches the browser.
 */
export function LoginScreen({ onLogin }) {
  const [id,      setId]   = useState("");
  const [pw,      setPw]   = useState("");
  const [pin,     setPin]  = useState("");
  const [err,     setErr]  = useState("");
  const [loading, setLoad] = useState(false);

  async function handleLogin() {
    const identifier = id.trim();
    if (!identifier) { setErr("Please enter your username or email."); return; }
    if (!pw)         { setErr("Please enter your password."); return; }

    setLoad(true);
    setErr("");

    const result = await authenticateUser(identifier, pw, pin);

    if (result.success) {
      onLogin(result.username, result.isAdmin);
    } else {
      setErr(result.error);
    }

    setLoad(false);
  }

  return (
    <div className="login-box">
      <div className="login-logo">AMONG US</div>
      <div className="login-sub">Reboot01 — Sign in with your account</div>

      <div className="field">
        <label>Username or Email</label>
        <input
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder="your Reboot01 username"
          disabled={loading}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoComplete="username"
        />
      </div>

      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="your Reboot01 password"
          disabled={loading}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoComplete="current-password"
        />
      </div>

      <div className="field">
        <label>Admin PIN <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.8em" }}>(leave blank if not admin)</span></label>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="admin secret PIN"
          disabled={loading}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoComplete="off"
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
