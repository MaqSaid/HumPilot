import { GAME_CONFIG } from './config';

export class ScoreTracker {
  private score: number = 0;
  private fractionalDistance: number = 0;

  /**
   * Accumulates scroll distance and awards 1 point per 10 pixels scrolled.
   */
  addScrollScore(pixelsScrolled: number): void {
    this.fractionalDistance += pixelsScrolled;
    while (this.fractionalDistance >= 10) {
      this.fractionalDistance -= 10;
      this.score += GAME_CONFIG.POINTS_PER_10_PIXELS;
    }
  }

  /**
   * Adds the obstacle pass bonus (10 points).
   */
  addObstacleBonus(): void {
    this.score += GAME_CONFIG.OBSTACLE_BONUS;
  }

  /**
   * Returns the current score.
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Resets score and fractional distance to 0.
   */
  reset(): void {
    this.score = 0;
    this.fractionalDistance = 0;
  }

  /**
   * Saves the high score to localStorage if the given score exceeds the current high score.
   */
  saveHighScore(score: number): void {
    try {
      const current = this.getHighScore();
      if (score > current) {
        localStorage.setItem('humpilot_highscore', String(score));
      }
    } catch {
      // localStorage unavailable — graceful fallback
    }
  }

  /**
   * Reads the high score from localStorage. Returns 0 if not found or localStorage unavailable.
   */
  getHighScore(): number {
    try {
      const stored = localStorage.getItem('humpilot_highscore');
      if (stored === null) return 0;
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Saves a daily challenge score to localStorage if it exceeds the current daily score for that date.
   */
  saveDailyScore(score: number, date: string): void {
    try {
      const current = this.getDailyScore(date);
      if (score > current) {
        localStorage.setItem(`${GAME_CONFIG.DAILY_SCORE_KEY_PREFIX}${date}`, String(score));
      }
    } catch {
      // localStorage unavailable — graceful fallback
    }
  }

  /**
   * Reads the daily challenge score for a given date. Returns 0 if not found or localStorage unavailable.
   */
  getDailyScore(date: string): number {
    try {
      const stored = localStorage.getItem(`${GAME_CONFIG.DAILY_SCORE_KEY_PREFIX}${date}`);
      if (stored === null) return 0;
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }
}
