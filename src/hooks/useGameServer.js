import { useState, useEffect, useRef } from "react";
import { WS_URL, DEFAULT_GAME_STATE } from "../utils/gameHelpers";

export function useGameServer(username, isAdmin) {
  const [gs, setGs]           = useState({ ...DEFAULT_GAME_STATE });
  const [connected, setConn]  = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const wsRef   = useRef(null);
  const nameRef = useRef(username);

  useEffect(() => { nameRef.current = username; }, [username]);

  useEffect(() => {
    let reconnectTimer = null;
    let destroyed = false; // set to true when this effect instance is cleaned up

    function connect() {
      if (destroyed) return;

      // Don't open a second socket if one is already alive
      if (wsRef.current && wsRef.current.readyState < 2) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (destroyed) { ws.close(); return; }
          setConn(true);
          if (nameRef.current) {
            ws.send(JSON.stringify({ type: "join", username: nameRef.current }));
          }
        };

        ws.onmessage = (e) => {
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
          if (!destroyed) {
            reconnectTimer = setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => ws.close();
      } catch (err) {
        console.error("WebSocket error:", err);
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      }
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      const ws = wsRef.current;
      if (ws) {
        if (!isAdmin && nameRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "leave", username: nameRef.current }));
        }
        ws.close();
        wsRef.current = null;
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
