import { GAME_CONFIG } from './config';
import { CalibrationManager } from '../audio/CalibrationManager';

export class PitchMapper {
  private calibrationManager: CalibrationManager;

  constructor(calibrationManager: CalibrationManager) {
    this.calibrationManager = calibrationManager;
  }

  private getRange(): { min: number; max: number } {
    return this.calibrationManager.getEffectiveRange();
  }

  /**
   * Map a detected frequency to a plane altitude.
   * Returns the new altitude value.
   *
   * - If frequency is null, the plane descends at DESCENT_RATE.
   * - If frequency is valid, linearly maps to canvas height with smoothing.
   */
  mapToAltitude(
    frequency: number | null,
    currentAltitude: number,
    deltaTime: number,
    canvasHeight: number
  ): number {
    // No pitch detected — descend
    if (frequency === null) {
      return Math.max(0, currentAltitude - GAME_CONFIG.DESCENT_RATE * deltaTime);
    }

    // Valid frequency — compute target altitude
    const range = this.getRange();
    const normalized = (frequency - range.min) / (range.max - range.min);
    const targetAltitude = Math.max(0, Math.min(canvasHeight, normalized * canvasHeight));

    // Apply smoothing — cap per-frame change
    const diff = targetAltitude - currentAltitude;
    const maxChange = canvasHeight * GAME_CONFIG.MAX_ALTITUDE_CHANGE_RATIO;
    const cappedDiff = Math.sign(diff) * Math.min(Math.abs(diff), maxChange);

    return currentAltitude + cappedDiff;
  }
}
