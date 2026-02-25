import { useState, useEffect } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserApp } from "./components/UserApp";
import { gameStyles } from "./styles/gameStyles";
import { restoreSession, signOut } from "./utils/auth";

/**
 * Root App component.
 * On mount, tries to restore an existing session via /api/me.
 * isAdmin is always derived server-side from the username — never from storage.
 */
export default function App() {
  const [user, setUser]       = useState(null);
  const [checking, setCheck]  = useState(true); // true while restoring session

  // On mount: try to restore session from stored token
  useEffect(() => {
    restoreSession().then(data => {
      if (data?.username) {
        setUser({ username: data.username, isAdmin: data.isAdmin === true });
      }
      setCheck(false);
    });
  }, []);

  function handleLogin(username, isAdminUser) {
    setUser({ username, isAdmin: isAdminUser === true });
  }

  async function handleLogout() {
    await signOut();
    setUser(null);
  }

  // Show nothing while the session check is in flight (avoids login flash)
  if (checking) {
    return (
      <div className="app">
        <style>{gameStyles}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <style>{gameStyles}</style>
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  if (user.isAdmin) {
    return (
      <div className="app">
        <style>{gameStyles}</style>
        <AdminDashboard username={user.username} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="app">
      <style>{gameStyles}</style>
      <UserApp username={user.username} onLogout={handleLogout} />
    </div>
  );
}
