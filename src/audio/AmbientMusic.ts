import { GAME_CONFIG } from '../game/config';

/**
 * AmbientMusic generates harmonizing tones that follow the player's humming pitch.
 * Uses two oscillators: a sine wave one octave below and a triangle wave a perfect fifth below.
 * When no pitch is detected, plays a gentle drone at 110 Hz.
 */
export class AmbientMusic {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillator1: OscillatorNode | null = null; // sine, octave below
  private oscillator2: OscillatorNode | null = null; // triangle, perfect fifth below
  private isMutedFlag = false;
  private isPlaying = false;

  /** Convert AMBIENT_VOLUME_DB to linear gain. */
  private get linearGain(): number {
    return Math.pow(10, GAME_CONFIG.AMBIENT_VOLUME_DB / 20);
  }

  /**
   * Store the AudioContext and create the GainNode.
   * Does not start oscillators yet.
   */
  init(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.setValueAtTime(this.linearGain, audioContext.currentTime);
  }

  /**
   * Update oscillator frequencies based on current detected pitch.
   * If currentFrequency is valid: oscillator1 = freq/2, oscillator2 = freq * 2/3.
   * If null: both oscillators set to AMBIENT_DRONE_FREQ (110 Hz).
   * Uses setTargetAtTime for smooth transitions.
   */
  update(currentFrequency: number | null): void {
    if (!this.isPlaying || this.isMutedFlag) return;
    if (!this.oscillator1 || !this.oscillator2 || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const transitionTime = GAME_CONFIG.AMBIENT_TRANSITION_TIME;

    if (currentFrequency !== null) {
      const octaveBelow = currentFrequency / 2;
      const fifthBelow = currentFrequency * 2 / 3;
      this.oscillator1.frequency.setTargetAtTime(octaveBelow, now, transitionTime);
      this.oscillator2.frequency.setTargetAtTime(fifthBelow, now, transitionTime);
    } else {
      const drone = GAME_CONFIG.AMBIENT_DRONE_FREQ;
      this.oscillator1.frequency.setTargetAtTime(drone, now, transitionTime);
      this.oscillator2.frequency.setTargetAtTime(drone, now, transitionTime);
    }
  }

  /**
   * Create oscillators, connect to gainNode → destination, and start playback.
   */
  start(): void {
    if (!this.audioContext || !this.gainNode) return;

    this.oscillator1 = this.audioContext.createOscillator();
    this.oscillator1.type = 'sine';
    this.oscillator1.frequency.setValueAtTime(
      GAME_CONFIG.AMBIENT_DRONE_FREQ,
      this.audioContext.currentTime
    );

    this.oscillator2 = this.audioContext.createOscillator();
    this.oscillator2.type = 'triangle';
    this.oscillator2.frequency.setValueAtTime(
      GAME_CONFIG.AMBIENT_DRONE_FREQ,
      this.audioContext.currentTime
    );

    this.gainNode.connect(this.audioContext.destination);
    this.oscillator1.connect(this.gainNode);
    this.oscillator2.connect(this.gainNode);

    this.oscillator1.start();
    this.oscillator2.start();

    this.isPlaying = true;
  }

  /**
   * Stop and disconnect oscillators.
   */
  stop(): void {
    if (this.oscillator1) {
      this.oscillator1.stop();
      this.oscillator1.disconnect();
      this.oscillator1 = null;
    }
    if (this.oscillator2) {
      this.oscillator2.stop();
      this.oscillator2.disconnect();
      this.oscillator2 = null;
    }

    this.isPlaying = false;
  }

  /**
   * Mute or unmute the ambient music.
   * When muted, gain is set to 0. When unmuted, gain is restored to AMBIENT_VOLUME_DB level.
   */
  setMuted(muted: boolean): void {
    this.isMutedFlag = muted;
    if (!this.gainNode || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    if (muted) {
      this.gainNode.gain.setValueAtTime(0, now);
    } else {
      this.gainNode.gain.setValueAtTime(this.linearGain, now);
    }
  }

  /**
   * Check if ambient music is currently muted.
   */
  isMuted(): boolean {
    return this.isMutedFlag;
  }

  /**
   * Stop playback if playing, disconnect all nodes, and null references.
   */
  dispose(): void {
    if (this.isPlaying) {
      this.stop();
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    this.audioContext = null;
  }
}
