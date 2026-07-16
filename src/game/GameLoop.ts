export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private updateCallback: ((deltaTime: number) => void) | null = null;
  private running: boolean = false;

  /** Register the update function called each frame with delta time in seconds. */
  onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallback = callback;
  }

  /** Start the loop. */
  start(): void {
    this.running = true;
    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.lastTimestamp = timestamp;
      this.loop(timestamp);
    });
  }

  /** Stop the loop. */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    let deltaTime = (timestamp - this.lastTimestamp) / 1000;

    // Cap deltaTime to 100ms to prevent physics tunneling
    if (deltaTime > 0.1) {
      deltaTime = 0.1;
    }

    if (deltaTime > 0 && this.updateCallback) {
      this.updateCallback(deltaTime);
    }

    this.lastTimestamp = timestamp;
    this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
  }
}
