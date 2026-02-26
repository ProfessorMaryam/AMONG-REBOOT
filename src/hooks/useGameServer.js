import { useState, useEffect, useRef } from "react";
import { WS_URL, DEFAULT_GAME_STATE } from "../utils/gameHelpers";
import { getSessionToken } from "../utils/auth";

export function useGameServer(username, isAdmin) {
  const [gs, setGs]               = useState({ ...DEFAULT_GAME_STATE });
  const [connected, setConn]      = useState(false);
  const [chatLog, setChatLog]     = useState([]);
  const [voteNonce, setVoteNonce] = useState(null);
  const wsRef   = useRef(null);
  const nameRef = useRef(username);

  useEffect(() => { nameRef.current = username; }, [username]);

  useEffect(() => {
    let reconnectTimer = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      if (wsRef.current && wsRef.current.readyState < 2) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (destroyed) { ws.close(); return; }
          setConn(true);
          if (nameRef.current) {
            ws.send(JSON.stringify({
              type: "join",
              username: nameRef.current,
              token: getSessionToken(),
            }));
          }
        };

        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === "state") {
            setGs({ ...msg.state });
            if (msg.state.phase !== "vote") setVoteNonce(null);
            if (msg.state.phase === "lobby") setChatLog([]);
          }
          if (msg.type === "voteNonce") {
            setVoteNonce(msg.nonce);
          }
          if (msg.type === "chat") {
            setChatLog(prev => [...prev, msg]);
          }
          if (msg.type === "error" && msg.error === "auth") {
            // Server rejected the session — force logout
            ws.close();
          }
        };

        ws.onclose = () => {
          setConn(false);
          wsRef.current = null;
          if (!destroyed) reconnectTimer = setTimeout(connect, 2000);
        };

        ws.onerror = () => ws.close();
      } catch (err) {
        console.error("WebSocket error:", err);
        if (!destroyed) reconnectTimer = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      const ws = wsRef.current;
      if (ws) {
        if (!isAdmin && nameRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "leave",
            username: nameRef.current,
            token: getSessionToken(),
          }));
        }
        ws.close();
        wsRef.current = null;
      }
    };
  }, [isAdmin]);

  function send(msg) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Automatically attach session token to every outbound message
      wsRef.current.send(JSON.stringify({ ...msg, token: getSessionToken() }));
    }
  }

  return { gs, connected, send, chatLog, voteNonce };
}
