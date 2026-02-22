import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserApp } from "./components/UserApp";
import { gameStyles } from "./styles/gameStyles";
import { isAdmin } from "./utils/auth";

/**
 * Root App component
 * Manages user authentication and routes to appropriate view.
 * isAdmin is always derived from the username — never trusted from storage.
 */
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("among-us:user"));
      if (!stored?.username) return null;
      // Re-derive isAdmin from username — ignore any stored isAdmin value
      return { username: stored.username, isAdmin: isAdmin(stored.username) };
    } catch {
      return null;
    }
  });

  function handleLogin(username, adminFlag) {
    // adminFlag comes from isAdmin(username) in LoginScreen — re-verify here too
    const u = { username, isAdmin: isAdmin(username) && adminFlag };
    localStorage.setItem("among-us:user", JSON.stringify({ username: u.username }));
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem("among-us:user");
    sessionStorage.removeItem("jwt");
    setUser(null);
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
        <AdminDashboard onLogout={handleLogout} />
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
