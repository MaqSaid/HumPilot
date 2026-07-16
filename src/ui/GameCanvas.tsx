import { useEffect, useRef } from 'react';
import { AudioCapture } from '../audio/AudioCapture';
import { PitchDetection } from '../audio/PitchDetection';
import { CalibrationManager } from '../audio/CalibrationManager';
import { AmbientMusic } from '../audio/AmbientMusic';
import { GameLoop } from '../game/GameLoop';
import { PitchMapper } from '../game/PitchMapper';
import { ObstacleGenerator } from '../game/ObstacleGenerator';
import { checkObstacleCollision, checkBoundaryViolation } from '../game/CollisionDetector';
import { ScoreTracker } from '../game/ScoreTracker';
import { Renderer } from '../rendering/Renderer';
import { GAME_CONFIG } from '../game/config';
import { getDailyRNG, saveDailyScore } from '../game/DailyChallenge';
import type { GameState } from '../game/types';

interface GameCanvasProps {
  isDailyMode: boolean;
  onGameOver: (score: number, highScore: number, isNewBest: boolean) => void;
  onStreamLost: () => void;
  onScoreUpdate: ((score: number) => void) | null;
  audioCapture: AudioCapture;
}

export function GameCanvas({
  isDailyMode,
  onGameOver,
  onStreamLost,
  onScoreUpdate,
  audioCapture,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas dimensions maintaining 4:3 aspect ratio
    function resizeCanvas() {
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const aspect = GAME_CONFIG.ASPECT_RATIO;

      let width: number;
      let height: number;

      if (containerWidth / containerHeight > aspect) {
        height = containerHeight;
        width = height * aspect;
      } else {
        width = containerWidth;
        height = width / aspect;
      }

      width = Math.max(width, GAME_CONFIG.CANVAS_MIN_WIDTH);
      height = Math.max(height, GAME_CONFIG.CANVAS_MIN_HEIGHT);

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${Math.min(width, containerWidth)}px`;
      canvas.style.height = `${Math.min(height, containerHeight)}px`;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize game modules
    const pitchDetection = new PitchDetection();
    pitchDetection.init(audioCapture.getSampleRate(), GAME_CONFIG.FFT_SIZE);

    const calibrationManager = new CalibrationManager();
    const pitchMapper = new PitchMapper(calibrationManager);

    const rngFn = isDailyMode ? getDailyRNG() : undefined;
    const obstacleGenerator = new ObstacleGenerator(rngFn);

    const scoreTracker = new ScoreTracker();
    const renderer = new Renderer();
    const ambientMusic = new AmbientMusic();

    // Initialize ambient music with the AudioCapture's context
    // We access it via a workaround since AudioCapture doesn't expose AudioContext directly
    // The AmbientMusic needs an AudioContext — we'll create a separate one for it
    let musicContext: AudioContext | null = null;
    try {
      musicContext = new AudioContext();
      ambientMusic.init(musicContext);
      ambientMusic.start();
    } catch {
      // Audio context creation failed — music won't play
    }

    // Set up stream lost handler
    audioCapture.onStreamLost(() => {
      gameLoop.stop();
      onStreamLost();
    });

    // Initialize game state
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const gameState: GameState = {
      status: 'playing',
      planeY: canvasHeight / 2,
      planeX: canvasWidth * GAME_CONFIG.PLANE_X_RATIO,
      score: 0,
      scrollOffset: 0,
      obstacles: [],
      difficulty: {
        gapMultiplier: GAME_CONFIG.INITIAL_GAP_MULTIPLIER,
        spawnInterval: GAME_CONFIG.INITIAL_SPAWN_INTERVAL,
        currentTime: 0,
      },
      elapsedTime: 0,
    };

    let currentPitch: number | null = null;

    // Game loop
    const gameLoop = new GameLoop();
    gameLoopRef.current = gameLoop;

    gameLoop.onUpdate((deltaTime: number) => {
      if (gameState.status !== 'playing') return;

      const h = canvas.height;

      // 1. Detect pitch
      const analyser = audioCapture.getAnalyser();
      const pitchResult = pitchDetection.detect(analyser);
      currentPitch = pitchResult.frequency;

      // 2. Map pitch to altitude
      gameState.planeY = pitchMapper.mapToAltitude(
        currentPitch,
        gameState.planeY,
        deltaTime,
        h
      );

      // 3. Update ambient music
      ambientMusic.update(currentPitch);

      // 4. Scroll world
      const scrollDistance = GAME_CONFIG.SCROLL_SPEED * deltaTime;
      gameState.scrollOffset += scrollDistance;
      gameState.elapsedTime += deltaTime;

      // 5. Update obstacles
      gameState.obstacles = obstacleGenerator.update(
        gameState.obstacles,
        deltaTime,
        h,
        GAME_CONFIG.PLANE_HEIGHT,
        gameState.elapsedTime
      );

      // 6. Check for obstacle pass (scoring)
      for (const obstacle of gameState.obstacles) {
        if (!obstacle.passed && obstacle.x + obstacle.width < gameState.planeX) {
          obstacle.passed = true;
          scoreTracker.addObstacleBonus();
        }
      }

      // 7. Add scroll score
      scoreTracker.addScrollScore(scrollDistance);
      gameState.score = scoreTracker.getScore();

      // 8. Notify HUD of score update
      if (onScoreUpdate) {
        onScoreUpdate(gameState.score);
      }

      // 9. Collision detection
      const planeAABB = {
        x: gameState.planeX,
        y: gameState.planeY,
        width: GAME_CONFIG.PLANE_WIDTH,
        height: GAME_CONFIG.PLANE_HEIGHT,
      };

      const hitObstacle = checkObstacleCollision(planeAABB, gameState.obstacles);
      const hitBoundary = checkBoundaryViolation(planeAABB, h);

      if (hitObstacle || hitBoundary) {
        // Game over
        gameState.status = 'gameover';
        renderer.triggerScreenShake(performance.now());

        // Render one more frame with shake
        renderer.render(gameState, ctx!, currentPitch, performance.now());

        // Save scores
        const finalScore = gameState.score;
        const prevHigh = scoreTracker.getHighScore();
        const isNewBest = finalScore > prevHigh;
        scoreTracker.saveHighScore(finalScore);

        if (isDailyMode) {
          saveDailyScore(finalScore);
        }

        // Stop music
        ambientMusic.stop();

        // Notify parent after short delay for shake effect
        setTimeout(() => {
          onGameOver(finalScore, Math.max(finalScore, prevHigh), isNewBest);
        }, GAME_CONFIG.SCREEN_SHAKE_DURATION);

        return;
      }

      // 10. Update difficulty in state (for display purposes)
      gameState.difficulty.currentTime = gameState.elapsedTime;

      // 11. Render
      renderer.render(gameState, ctx!, currentPitch, performance.now());
    });

    gameLoop.start();

    return () => {
      gameLoop.stop();
      gameLoopRef.current = null;
      ambientMusic.stop();
      ambientMusic.dispose();
      if (musicContext) {
        musicContext.close().catch(() => {});
      }
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game-canvas-wrapper">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
