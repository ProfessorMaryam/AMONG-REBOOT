import { STORY_PAGES } from "../../utils/storyData";

/**
 * Story narrative view
 */
export function StoryView({ storyPage, setStoryPage, onLogout }) {
  const page = STORY_PAGES[storyPage];

  return (
    <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            className="btn ghost"
            style={{ width: "auto", padding: "6px 16px", fontSize: "0.78rem", letterSpacing: 1 }}
            onClick={onLogout}
          >
            Sign Out
          </button>
        </div>
        <div className="story-page">
          <div className="story-icon">{page.icon}</div>
          <div className="story-title">{page.title}</div>
          <div className="story-text">{page.text}</div>
          <div className="story-dots">
            {STORY_PAGES.map((_, i) => (
              <div key={i} className={`story-dot ${i === storyPage ? "active" : ""}`} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "center" }}>
            {storyPage > 0 && (
              <button
                className="btn ghost"
                style={{ width: "auto", padding: "8px 24px" }}
                onClick={() => setStoryPage(s => s - 1)}
              >
                ← Back
              </button>
            )}
            {storyPage < STORY_PAGES.length - 1 && (
              <button
                className="btn"
                style={{ width: "auto", padding: "8px 24px" }}
                onClick={() => setStoryPage(s => s + 1)}
              >
                Next →
              </button>
            )}
          </div>
          {storyPage === STORY_PAGES.length - 1 && (
            <div className="waiting-msg">⏳ Waiting for admin to begin discussion...</div>
          )}
        </div>
      </div>
    </div>
  );
}
