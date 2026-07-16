import { GAME_CONFIG } from '../game/config';

/**
 * Manages microphone capture via the Web Audio API.
 * Handles AudioContext lifecycle, AnalyserNode creation, stream health monitoring,
 * and recovery from browser autoplay policy suspension.
 */
export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private streamLostCallbacks: Array<() => void> = [];
  private trackEndedHandler: (() => void) | null = null;

  /**
   * Request microphone access and set up the audio processing graph.
   * Creates AudioContext → MediaStreamSource → AnalyserNode.
   * Throws if getUserMedia is not supported by the browser.
   */
  async init(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Your browser does not support microphone access (getUserMedia). ' +
          'Please use a modern browser such as Chrome, Firefox, Safari, or Edge.',
      );
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.audioContext = new AudioContext();
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = GAME_CONFIG.FFT_SIZE;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.analyserNode);

    // Monitor the first audio track for unexpected ending
    const track = this.mediaStream.getAudioTracks()[0];
    if (track) {
      this.trackEndedHandler = () => {
        for (const cb of this.streamLostCallbacks) {
          cb();
        }
      };
      track.addEventListener('ended', this.trackEndedHandler);
    }
  }

  /**
   * Returns the AnalyserNode for frequency data extraction.
   * Must call init() first.
   */
  getAnalyser(): AnalyserNode {
    if (!this.analyserNode) {
      throw new Error('AudioCapture not initialized. Call init() first.');
    }
    return this.analyserNode;
  }

  /**
   * Returns the AudioContext sample rate.
   * Must call init() first.
   */
  getSampleRate(): number {
    if (!this.audioContext) {
      throw new Error('AudioCapture not initialized. Call init() first.');
    }
    return this.audioContext.sampleRate;
  }

  /**
   * Returns whether the microphone stream is currently active.
   */
  isActive(): boolean {
    if (!this.mediaStream) return false;
    const tracks = this.mediaStream.getAudioTracks();
    const firstTrack = tracks[0];
    return tracks.length > 0 && firstTrack !== undefined && firstTrack.readyState === 'live';
  }

  /**
   * Registers a callback that fires when the MediaStreamTrack ends
   * (e.g., user revokes mic permission, device disconnected).
   */
  onStreamLost(callback: () => void): void {
    this.streamLostCallbacks.push(callback);
  }

  /**
   * Resumes the AudioContext if suspended (browser autoplay policy).
   * Re-requests the microphone if the stream has ended.
   */
  async resume(): Promise<void> {
    // Re-request mic if stream is no longer active
    if (!this.isActive()) {
      // Clean up old source
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (this.audioContext && this.analyserNode) {
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.sourceNode.connect(this.analyserNode);
      }

      // Re-attach track ended listener
      const track = this.mediaStream.getAudioTracks()[0];
      if (track) {
        this.trackEndedHandler = () => {
          for (const cb of this.streamLostCallbacks) {
            cb();
          }
        };
        track.addEventListener('ended', this.trackEndedHandler);
      }
    }

    // Resume AudioContext if it's in suspended state
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Stops all media tracks and closes the AudioContext.
   * Releases all microphone resources.
   */
  dispose(): void {
    // Remove track listener
    if (this.mediaStream && this.trackEndedHandler) {
      const track = this.mediaStream.getAudioTracks()[0];
      if (track) {
        track.removeEventListener('ended', this.trackEndedHandler);
      }
    }
    this.trackEndedHandler = null;

    // Stop all tracks
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    // Disconnect source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.analyserNode = null;
    this.streamLostCallbacks = [];
  }
}
