/**
 * Daily Challenge mode logic.
 * Provides a seeded RNG for deterministic obstacle generation
 * and persists daily best scores to localStorage.
 */

import { createSeededRNG, getTodaysSeed } from './SeededRNG';
import { GAME_CONFIG } from './config';

let isDailyChallengeMode = false;

/**
 * Returns a seeded RNG function for today's date.
 * When daily challenge mode is active, ObstacleGenerator uses this
 * instead of Math.random() to produce identical layouts for all players.
 */
export function getDailyRNG(): () => number {
  return createSeededRNG(getTodaysSeed());
}

/**
 * Returns today's date as 'YYYY-MM-DD' (the daily challenge seed).
 */
export function getDailyDate(): string {
  return getTodaysSeed();
}

/**
 * Saves a daily challenge score to localStorage.
 * Only overwrites the stored value if the new score is higher.
 */
export function saveDailyScore(score: number): void {
  try {
    const key = `${GAME_CONFIG.DAILY_SCORE_KEY_PREFIX}${getDailyDate()}`;
    const current = getDailyBestScore();
    if (score > current) {
      localStorage.setItem(key, String(score));
    }
  } catch {
    // localStorage unavailable (e.g., private browsing) — silently ignore
  }
}

/**
 * Reads today's best daily challenge score from localStorage.
 * Returns 0 if no score is found or localStorage is unavailable.
 */
export function getDailyBestScore(): number {
  try {
    const key = `${GAME_CONFIG.DAILY_SCORE_KEY_PREFIX}${getDailyDate()}`;
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return 0;
    }
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Sets the daily challenge mode flag.
 */
export function setMode(daily: boolean): void {
  isDailyChallengeMode = daily;
}

/**
 * Returns whether daily challenge mode is currently active.
 */
export function getMode(): boolean {
  return isDailyChallengeMode;
}
