import type { Obstacle, DifficultyConfig } from './types';
import { GAME_CONFIG } from './config';

/**
 * Procedurally generates obstacles with increasing difficulty.
 * Supports an optional seeded RNG for deterministic daily challenge layouts.
 */
export class ObstacleGenerator {
  private timeSinceLastSpawn: number = 0;
  private difficulty: DifficultyConfig;
  private rngFn: (() => number) | null;

  constructor(rngFn?: () => number) {
    this.rngFn = rngFn ?? null;
    this.difficulty = {
      gapMultiplier: GAME_CONFIG.INITIAL_GAP_MULTIPLIER,
      spawnInterval: GAME_CONFIG.INITIAL_SPAWN_INTERVAL,
      currentTime: 0,
    };
  }

  /** Returns a random number in [0, 1) using seeded RNG or Math.random(). */
  private getRandom(): number {
    return this.rngFn?.() ?? Math.random();
  }

  /**
   * Update obstacle positions, remove off-screen obstacles, and spawn new ones.
   * Returns the updated obstacle array.
   */
  public update(
    obstacles: Obstacle[],
    deltaTime: number,
    canvasHeight: number,
    planeHeight: number,
    elapsedTime: number
  ): Obstacle[] {
    // 1. Increment spawn timer
    this.timeSinceLastSpawn += deltaTime;

    // 2. Update difficulty based on elapsed time
    this.difficulty.currentTime = elapsedTime;
    this.difficulty.gapMultiplier = Math.max(
      GAME_CONFIG.MIN_GAP_MULTIPLIER,
      GAME_CONFIG.INITIAL_GAP_MULTIPLIER - GAME_CONFIG.DIFFICULTY_INCREASE_RATE * elapsedTime
    );
    this.difficulty.spawnInterval = Math.max(
      GAME_CONFIG.MIN_SPAWN_INTERVAL,
      GAME_CONFIG.INITIAL_SPAWN_INTERVAL - GAME_CONFIG.DIFFICULTY_INCREASE_RATE * elapsedTime
    );

    // 3. Scroll existing obstacles to the left
    for (const obstacle of obstacles) {
      obstacle.x -= GAME_CONFIG.SCROLL_SPEED * deltaTime;
    }

    // 4. Remove obstacles that are fully past the left edge
    obstacles = obstacles.filter(
      (obstacle) => obstacle.x + obstacle.width > 0
    );

    // 5. Spawn a new obstacle if enough time has passed
    if (this.timeSinceLastSpawn >= this.difficulty.spawnInterval) {
      const gapMultiplier = Math.max(
        this.difficulty.gapMultiplier,
        GAME_CONFIG.MIN_GAP_MULTIPLIER
      );

      // 6. Calculate gap height and position
      const gapHeight = gapMultiplier * planeHeight;

      // Gap center must be at least planeHeight from top and bottom
      const minGapY = planeHeight + gapHeight / 2;
      const maxGapY = canvasHeight - planeHeight - gapHeight / 2;

      // Ensure valid range (if canvas is too small, place gap in center)
      const gapY =
        minGapY >= maxGapY
          ? canvasHeight / 2
          : minGapY + this.getRandom() * (maxGapY - minGapY);

      // 7. Create new obstacle
      const newObstacle: Obstacle = {
        x: GAME_CONFIG.CANVAS_MIN_WIDTH,
        gapY,
        gapHeight,
        width: GAME_CONFIG.OBSTACLE_WIDTH,
        passed: false,
      };

      obstacles.push(newObstacle);

      // 9. Reset spawn timer
      this.timeSinceLastSpawn = 0;
    }

    // 10. Return updated array
    return obstacles;
  }

  /** Reset generator to initial state. */
  public reset(): void {
    this.timeSinceLastSpawn = 0;
    this.difficulty = {
      gapMultiplier: GAME_CONFIG.INITIAL_GAP_MULTIPLIER,
      spawnInterval: GAME_CONFIG.INITIAL_SPAWN_INTERVAL,
      currentTime: 0,
    };
  }

  /** Set or clear the RNG function at runtime (for switching between daily/standard mode). */
  public setRNG(rngFn: (() => number) | null): void {
    this.rngFn = rngFn;
  }
}
