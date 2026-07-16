import { useCallback, useEffect, useRef, useState } from 'react';
import { getDailyDate } from '../game/DailyChallenge';

interface HUDProps {
  isDailyMode: boolean;
  /** Called once on mount to register a score update callback with the game loop */
  onRegisterScoreUpdate: (updater: (score: number) => void) => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export function HUD({ isDailyMode, onRegisterScoreUpdate, onToggleMute, isMuted }: HUDProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const lastUpdateRef = useRef(0);

  const handleScoreUpdate = useCallback((score: number) => {
    const now = performance.now();
    // Throttle visual updates to every 500ms or on milestones (every 50 points)
    if (
      now - lastUpdateRef.current >= 500 ||
      Math.floor(score / 50) > Math.floor(displayScore / 50)
    ) {
      setDisplayScore(score);
      lastUpdateRef.current = now;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onRegisterScoreUpdate(handleScoreUpdate);
  }, [onRegisterScoreUpdate, handleScoreUpdate]);

  return (
    <div className="hud">
      <div className="hud__left">
        {isDailyMode && (
          <span className="hud__daily-date">Daily: {getDailyDate()}</span>
        )}
      </div>
      <div className="hud__right">
        <span className="hud__score">{displayScore}</span>
        <button
          className="hud__mute-btn"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute music' : 'Mute music'}
          title={isMuted ? 'Unmute music' : 'Mute music'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
}
