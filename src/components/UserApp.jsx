import { useState, useEffect, useCallback, useRef } from "react";
import { useGameServer } from "../hooks/useGameServer";
import { tallyVotes } from "../utils/gameHelpers";
import { ConnWarn } from "./ConnWarn";
import { ChatSidebar } from "./ChatSidebar";
import { LobbyView } from "./views/LobbyView";
import { StoryView } from "./views/StoryView";
import { DiscussView } from "./views/DiscussView";
import { VoteView } from "./views/VoteView";
import { ResultView } from "./views/ResultView";
import { PuzzleView } from "./views/PuzzleView";
import { GameOverView } from "./views/GameOverView";
import { WalletView } from "./views/WalletView";

/**
 * User application - handles all player views
 */
export function UserApp({ username, onLogout }) {
  const { gs, connected, send, chatLog } = useGameServer(username, false);
  const [myVote, setMyVote] = useState(null);
  const [voted, setVoted] = useState(false);
  const [storyPage, setStoryPage] = useState(0);
  const [voteLocked, setVoteLocked] = useState(false);
  const prevPhase = useRef(null);

  // Reset state on phase transitions
  useEffect(() => {
    if (gs.phase !== prevPhase.current) {
      if (gs.phase === "vote") {
        setMyVote(null);
        setVoted(false);
        setVoteLocked(false);
      }
      prevPhase.current = gs.phase;
    }
  }, [gs.phase]);

  const handleVoteDone = useCallback(() => setVoteLocked(true), []);

  function submitVote() {
    if (!myVote || voted || voteLocked) return;
    setVoted(true);
    send({ type: "vote", voter: username, target: myVote });
  }

  const activeRoster = gs.roster ? gs.roster.filter(p => !gs.eliminated.includes(p.name)) : [];
  const { top } = tallyVotes(gs.votes);
  const totalVoters = gs.lobby ? gs.lobby.length : 0;

  // Lobby has no chat sidebar
  if (gs.phase === "lobby") {
    return (
      <div className="app">
        <ConnWarn connected={connected} />
        <LobbyView gs={gs} username={username} connected={connected} onLogout={onLogout} />
      </div>
    );
  }

  // All in-game phases: two-column layout with chat sidebar
  return (
    <div className="game-layout">
      <div className="game-main">
        <ConnWarn connected={connected} />

        {gs.phase === "story" && (
          <div className="app">
            <StoryView storyPage={storyPage} setStoryPage={setStoryPage} onLogout={onLogout} />
          </div>
        )}

        {gs.phase === "discuss" && (
          <div className="app">
            <DiscussView
              gs={gs}
              activeRoster={activeRoster}
              connected={connected}
              onLogout={onLogout}
            />
          </div>
        )}

        {gs.phase === "puzzle" && (
          <div className="app">
            <PuzzleView gs={gs} connected={connected} onLogout={onLogout} />
          </div>
        )}

        {gs.phase === "wallet" && (
          <div className="app">
            <WalletView gs={gs} connected={connected} onLogout={onLogout} />
          </div>
        )}

        {gs.phase === "vote" && (
          <div className="app">
            <VoteView
              gs={gs}
              activeRoster={activeRoster}
              myVote={myVote}
              setMyVote={setMyVote}
              voted={voted}
              voteLocked={voteLocked}
              onVoteDone={handleVoteDone}
              submitVote={submitVote}
              totalVoters={totalVoters}
              connected={connected}
              onLogout={onLogout}
            />
          </div>
        )}

        {gs.phase === "result" && (
          <div className="app">
            <ResultView gs={gs} top={top} connected={connected} onLogout={onLogout} />
          </div>
        )}

        {gs.phase === "gameover" && (
          <div className="app">
            <GameOverView gs={gs} onLogout={onLogout} />
          </div>
        )}
      </div>

      {/* <ChatSidebar chatLog={chatLog} username={username} send={send} /> */}
    </div>
  );
}
