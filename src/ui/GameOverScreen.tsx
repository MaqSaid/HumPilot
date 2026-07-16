import { getDailyBestScore, getDailyDate } from '../game/DailyChallenge';

interface GameOverScreenProps {
  score: number;
  highScore: number;
  isNewBest: boolean;
  isDailyMode: boolean;
  onRestart: () => void;
}

export function GameOverScreen({
  score,
  highScore,
  isNewBest,
  isDailyMode,
  onRestart,
}: GameOverScreenProps) {
  return (
    <div className="gameover-screen" onClick={onRestart} role="dialog" aria-label="Game Over">
      <h1 className="gameover-screen__title">Game Over</h1>
      <p className="gameover-screen__score">Score: {score}</p>
      <p className="gameover-screen__high-score">High Score: {highScore}</p>

      {isNewBest && (
        <p className="gameover-screen__new-best">🎉 New Best!</p>
      )}

      {isDailyMode && (
        <p className="gameover-screen__daily">
          Daily Best ({getDailyDate()}): {getDailyBestScore()}
        </p>
      )}

      <button className="btn btn--primary gameover-screen__restart" onClick={onRestart}>
        Tap to try again
      </button>
    </div>
  );
}
