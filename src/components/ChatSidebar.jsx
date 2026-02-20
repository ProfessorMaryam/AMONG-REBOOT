import { useState, useEffect, useRef } from "react";

/**
 * Netcat-style chat sidebar for in-game communication
 */
export function ChatSidebar({ chatLog, username, send }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    send({ type: "chat", username, text });
    setInput("");
  }

  return (
    <div className="chat-sidebar">
      <div className="chat-label">// COMMS</div>
      <div className="chat-messages">
        {chatLog.length === 0 && (
          <div style={{ color: "var(--muted)", fontStyle: "italic" }}>
            no messages yet...
          </div>
        )}
        {chatLog.map((msg, i) => (
          <div key={i} className="chat-msg">
            <span className="chat-time">[{msg.time}] </span>
            <span className={msg.username === username ? "chat-user-own" : "chat-user-other"}>
              {msg.username}
            </span>
            <span style={{ color: "var(--text)" }}>: {msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="type message..."
          maxLength={200}
        />
        <button type="submit" className="btn chat-send-btn">
          &gt;
        </button>
      </form>
    </div>
  );
}
