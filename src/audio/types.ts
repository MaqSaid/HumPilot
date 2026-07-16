/** Result of a single pitch detection frame. */
export interface PitchResult {
  frequency: number | null; // Hz, or null if no valid pitch detected
  clarity: number;          // 0-1 clarity/confidence score from pitchy
}

/** Stored calibration data from the player's humming range test. */
export interface CalibrationData {
  lowFrequency: number;   // Player's lowest comfortable humming frequency in Hz
  highFrequency: number;  // Player's highest comfortable humming frequency in Hz
  timestamp: number;      // When calibration was performed (epoch ms)
}
