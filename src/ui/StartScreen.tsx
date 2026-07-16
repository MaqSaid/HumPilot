import { ScoreTracker } from '../game/ScoreTracker';
import { getDailyBestScore, getDailyDate } from '../game/DailyChallenge';

interface StartScreenProps {
  onStart: () => void;
  onDailyChallenge: () => void;
  onRecalibrate: () => void;
  error: string | null;
}

const scoreTracker = new ScoreTracker();

export function StartScreen({ onStart, onDailyChallenge, onRecalibrate, error }: StartScreenProps) {
  const highScore = scoreTracker.getHighScore();
  const dailyBest = getDailyBestScore();
  const dailyDate = getDailyDate();

  return (
    <div className="start-screen">
      <h1 className="start-screen__title">HumPilot</h1>
      <p className="start-screen__instructions">
        Hum high → plane goes up.<br />
        Hum low → plane goes down.<br />
        Dodge the clouds!
      </p>

      {error && (
        <div className="start-screen__error" role="alert">
          {error}
        </div>
      )}

      {highScore > 0 && (
        <p className="start-screen__high-score">
          High Score: {highScore}
        </p>
      )}

      {dailyBest > 0 && (
        <p className="start-screen__high-score">
          Daily Best ({dailyDate}): {dailyBest}
        </p>
      )}

      <div className="start-screen__buttons">
        <button className="btn btn--primary" onClick={onStart}>
          Start Game
        </button>
        <button className="btn btn--secondary" onClick={onDailyChallenge}>
          Daily Challenge
        </button>
        <button className="btn btn--ghost" onClick={onRecalibrate}>
          Recalibrate
        </button>
      </div>
    </div>
  );
}
