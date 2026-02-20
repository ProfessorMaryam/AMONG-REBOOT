import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserApp } from "./components/UserApp";
import { gameStyles } from "./styles/gameStyles";

/**
 * Root App component
 * Manages user authentication and routes to appropriate view
 */
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("among-us:user")) || null;
    } catch {
      return null;
    }
  });

  function handleLogin(username, isAdmin) {
    const u = { username, isAdmin };
    localStorage.setItem("among-us:user", JSON.stringify(u));
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
