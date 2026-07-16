/** Current state of the game. */
export interface GameState {
  status: 'start' | 'playing' | 'paused' | 'gameover';
  planeY: number;
  planeX: number;
  score: number;
  scrollOffset: number;
  obstacles: Obstacle[];
  difficulty: DifficultyConfig;
  elapsedTime: number;
}

/** A single obstacle the plane must navigate through. */
export interface Obstacle {
  x: number;
  gapY: number;       // center of the gap
  gapHeight: number;  // height of the gap opening
  width: number;
  passed: boolean;    // whether plane has passed this obstacle
}

/** Difficulty parameters that scale over time. */
export interface DifficultyConfig {
  gapMultiplier: number;   // starts at 1.5, decreases to 1.2
  spawnInterval: number;   // starts at 4s, decreases to 1s
  currentTime: number;     // time since game start for scaling
}

/** Axis-Aligned Bounding Box for collision detection. */
export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}
