export const GAME_CONFIG = {
  // Canvas
  CANVAS_MIN_WIDTH: 800,
  CANVAS_MIN_HEIGHT: 600,
  ASPECT_RATIO: 800 / 600, // 4:3

  // Audio
  SAMPLE_RATE: 44100,
  FFT_SIZE: 2048,
  MIN_FREQUENCY: 80,             // Hz
  MAX_FREQUENCY: 500,            // Hz
  CLARITY_THRESHOLD: 0.85,       // pitchy clarity threshold

  // Plane
  PLANE_WIDTH: 48,
  PLANE_HEIGHT: 32,
  PLANE_X_RATIO: 0.2,           // 20% from left edge

  // Physics
  SCROLL_SPEED: 200,             // pixels per second
  DESCENT_RATE: 150,             // pixels per second when no pitch
  MAX_ALTITUDE_CHANGE_RATIO: 0.1, // 10% of canvas height per frame

  // Obstacles
  INITIAL_GAP_MULTIPLIER: 4,
  MIN_GAP_MULTIPLIER: 2.5,
  INITIAL_SPAWN_INTERVAL: 4,     // seconds
  MIN_SPAWN_INTERVAL: 1,         // seconds
  MAX_SPAWN_INTERVAL: 4,         // seconds
  OBSTACLE_WIDTH: 60,

  // Scoring
  POINTS_PER_10_PIXELS: 1,
  OBSTACLE_BONUS: 10,

  // Difficulty
  DIFFICULTY_INCREASE_RATE: 0.02, // per second

  // Visual
  PLANE_TILT_MAX_DEG: 15,        // max tilt angle in degrees
  TRAIL_LENGTH: 15,              // number of trail positions to render
  SCORE_POP_INTERVAL: 50,        // points between pop animations
  SCORE_POP_DURATION: 400,       // milliseconds for pop animation
  SCREEN_SHAKE_DURATION: 300,    // milliseconds on collision
  SCREEN_SHAKE_INTENSITY: 4,     // pixels of random offset

  // Colors
  SKY_TOP_COLOR: '#87CEEB',
  SKY_BOTTOM_COLOR: '#FFDAB9',
  PLANE_COLOR: '#FFFFFF',
  PLANE_FOLD_COLOR: '#D3D3D3',
  OBSTACLE_FILL_COLOR: '#B0C4DE',
  OBSTACLE_EDGE_COLOR: '#778899',
  HILL_COLOR: '#8FBC8F',
  TREE_COLOR: '#6B8E23',
  HUD_TEXT_COLOR: '#333333',
  SCORE_POP_COLOR: '#DAA520',

  // Calibration
  CALIBRATION_DURATION: 2,           // seconds per note capture
  CALIBRATION_BUFFER_PERCENT: 0.1,   // 10% buffer on each side
  MIN_CALIBRATION_RANGE: 100,        // Hz minimum range width

  // Ambient Music
  AMBIENT_VOLUME_DB: -20,            // dB below input level
  AMBIENT_DRONE_FREQ: 110,           // Hz drone when no pitch detected
  AMBIENT_TRANSITION_TIME: 0.1,      // seconds for smooth frequency change

  // Daily Challenge
  DAILY_SCORE_KEY_PREFIX: 'dailyScore_',
} as const;
