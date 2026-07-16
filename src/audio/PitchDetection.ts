import { PitchDetector } from 'pitchy';
import type { PitchResult } from './types';
import { GAME_CONFIG } from '../game/config';

/**
 * Wraps pitchy's PitchDetector to detect humming pitch from microphone input.
 * Filters results by clarity threshold and valid frequency range.
 */
export class PitchDetection {
  private detector!: PitchDetector<Float32Array>;
  private buffer!: Float32Array;
  private sampleRate!: number;

  /**
   * Create and configure the pitchy PitchDetector instance.
   * @param sampleRate - The audio context sample rate in Hz
   * @param bufferSize - The size of the analysis buffer (must match AnalyserNode.fftSize)
   */
  init(sampleRate: number, bufferSize: number): void {
    this.detector = PitchDetector.forFloat32Array(bufferSize);
    this.buffer = new Float32Array(bufferSize);
    this.sampleRate = sampleRate;
  }

  /**
   * Analyze current audio buffer and return detected pitch.
   * Returns null frequency if clarity is below threshold or pitch is out of range.
   */
  detect(analyser: AnalyserNode): PitchResult {
    analyser.getFloatTimeDomainData(this.buffer);

    const [pitch, clarity] = this.detector.findPitch(this.buffer, this.sampleRate);

    if (clarity < GAME_CONFIG.CLARITY_THRESHOLD) {
      return { frequency: null, clarity };
    }

    if (pitch < GAME_CONFIG.MIN_FREQUENCY || pitch > GAME_CONFIG.MAX_FREQUENCY) {
      return { frequency: null, clarity };
    }

    return { frequency: pitch, clarity };
  }
}
