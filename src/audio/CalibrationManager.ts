import type { CalibrationData } from './types';
import { GAME_CONFIG } from '../game/config';

const STORAGE_KEY = 'humpilot_calibration';

export class CalibrationManager {
  /** Check if calibration data exists in localStorage. */
  hasCalibration(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /** Get stored calibration data, or null if none exists. */
  getCalibration(): CalibrationData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) as CalibrationData;
    } catch {
      return null;
    }
  }

  /** Save calibration data to localStorage. */
  saveCalibration(data: CalibrationData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable — silently fail
    }
  }

  /** Clear existing calibration data. */
  clearCalibration(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — silently fail
    }
  }

  /** Get the effective pitch range (calibrated with 10% buffer, or defaults). */
  getEffectiveRange(): { min: number; max: number } {
    const calibration = this.getCalibration();

    if (calibration === null) {
      return { min: GAME_CONFIG.MIN_FREQUENCY, max: GAME_CONFIG.MAX_FREQUENCY };
    }

    const range = calibration.highFrequency - calibration.lowFrequency;

    if (range < GAME_CONFIG.MIN_CALIBRATION_RANGE) {
      return { min: GAME_CONFIG.MIN_FREQUENCY, max: GAME_CONFIG.MAX_FREQUENCY };
    }

    const buffer = range * GAME_CONFIG.CALIBRATION_BUFFER_PERCENT;
    return {
      min: calibration.lowFrequency - buffer,
      max: calibration.highFrequency + buffer,
    };
  }
}
