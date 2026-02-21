import { useState, useEffect, useRef } from "react";
import { WS_URL, DEFAULT_GAME_STATE } from "../utils/gameHelpers";

/**
 * Custom hook for WebSocket connection to game server.
 * Run the server with: node src/server.js
 * Then the frontend with: npm run dev
 *
 * @param {string} username - Current user's username (null for admin)
 * @param {boolean} isAdmin - Whether this is the admin tab
 * @returns {{gs, connected, send, chatLog}}
 */
export function useGameServer(username, isAdmin) {
  const [gs, setGs]           = useState({ ...DEFAULT_GAME_STATE });
  const [connected, setConn]  = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const wsRef   = useRef(null);
  const nameRef = useRef(username);

  useEffect(() => { nameRef.current = username; }, [username]);

  useEffect(() => {
    let reconnectTimer = null;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConn(true);
          if (!isAdmin && nameRef.current) {
            ws.send(JSON.stringify({ type: "join", username: nameRef.current }));
          } else {
            // Admin: request current state immediately on connect
            ws.send(JSON.stringify({ type: "update", patch: {} }));
          }
        };

        ws.onmessage = e => {
          const msg = JSON.parse(e.data);
          if (msg.type === "state") {
            setGs({ ...msg.state });
            if (msg.state.phase === "lobby") setChatLog([]);
          }
          if (msg.type === "chat") {
            setChatLog(prev => [...prev, msg]);
          }
        };

        ws.onclose = () => {
          setConn(false);
          wsRef.current = null;
          reconnectTimer = setTimeout(connect, 2000);
        };

        ws.onerror = () => ws.close();

      } catch (err) {
        console.error("WebSocket error:", err);
        reconnectTimer = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        if (!isAdmin && nameRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "leave", username: nameRef.current }));
        }
        wsRef.current.close();
      }
    };
  }, [isAdmin]);

  function send(msg) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  return { gs, connected, send, chatLog };
}
