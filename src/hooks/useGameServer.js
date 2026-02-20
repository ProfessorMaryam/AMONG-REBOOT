import { useState, useEffect, useRef } from "react";
import { WS_URL, DEFAULT_GAME_STATE } from "../utils/gameHelpers";

/**
 * Custom hook for WebSocket connection to game server
 * @param {string} username - Current user's username
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {{gs: Object, connected: boolean, send: Function}} Game state, connection status, and send function
 */
export function useGameServer(username, isAdmin) {
  const [gs, setGs] = useState({ ...DEFAULT_GAME_STATE });
  const [connected, setConn] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const wsRef = useRef(null);
  const nameRef = useRef(username);

  useEffect(() => {
    nameRef.current = username;
  }, [username]);

  useEffect(() => {
    let timer = null;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConn(true);
          if (!isAdmin && nameRef.current) {
            ws.send(JSON.stringify({ type: "join", username: nameRef.current }));
          } else {
            ws.send(JSON.stringify({ type: "update", patch: {} })); // just get state
          }
        };

        ws.onmessage = e => {
          const msg = JSON.parse(e.data);
          if (msg.type === "state") {
            setGs({ ...msg.state });
            if (msg.state.phase === "lobby") setChatLog([]);
          }
          if (msg.type === "chat") setChatLog(prev => [...prev, msg]);
        };

        ws.onclose = () => {
          setConn(false);
          wsRef.current = null;
          timer = setTimeout(connect, 2000);
        };

        ws.onerror = () => ws.close();
      } catch (err) {
        console.error("WebSocket connection error:", err);
      }
    }

    connect();

    return () => {
      clearTimeout(timer);
      if (wsRef.current) {
        // notify server on leave
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

