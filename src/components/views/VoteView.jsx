import { Header } from "../Header";
import { Timer } from "../Timer";
import { getAvatar } from "../../utils/gameHelpers";

/**
 * Voting phase view — 30s synced timer, locked after time expires
 */
export function VoteView({
  gs,
  activeRoster,
  myVote,
  setMyVote,
  voted,
  voteLocked,
  onVoteDone,
  submitVote,
  totalVoters,
  connected,
  onLogout
}) {
  const isDisabled = voted || voteLocked;

  return (
    <div className="screen">
      <div className="card">
        <Header
          title="Vote"
          sub="Who is the impostor?"
          round={gs.round}
          phase="vote"
          connected={connected}
          onLogout={onLogout}
        />
        <Timer
          seconds={30}
          label="VOTING TIME"
          phaseStartedAt={gs.phaseStartedAt}
          onDone={onVoteDone}
        />

        {voteLocked && !voted && (
          <div className="waiting-msg" style={{ color: "var(--red)", marginBottom: 12 }}>
            ⏰ Voting time is up!
          </div>
        )}

        <div className="suspect-grid">
          {activeRoster.map(p => (
            <div
              key={p.name}
              className={`vote-card ${myVote === p.name ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={() => !isDisabled && setMyVote(p.name)}
            >
              <div className="av">{getAvatar(p.name) ? <img src={getAvatar(p.name)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🧑‍💼"}</div>
              <div className="vname">{p.name}</div>
              {myVote === p.name && <div className="velim">SELECTED</div>}
            </div>
          ))}
        </div>

        {!voted && !voteLocked ? (
          <button className="btn" style={{ marginTop: 20 }} onClick={submitVote} disabled={!myVote}>
            Submit Vote
          </button>
        ) : voted ? (
          <div style={{ textAlign: "center", marginTop: 20, color: "var(--safe)", letterSpacing: 2, fontSize: "0.9rem" }}>
            ✔ Vote submitted — waiting for results...
          </div>
        ) : null}

        <div style={{ marginTop: 12, textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
          {Object.keys(gs.votes).length} of {totalVoters} voted
        </div>
      </div>
    </div>
  );
}

